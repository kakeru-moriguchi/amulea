/**
 * ログイン状態の確保（LIFF）
 * ==================================================================
 * この部品で包んだ画面は、必ず「ログイン済み」の状態で表示されます。
 *
 * 【なぜ LIFF なのか】
 *   お客様は公式LINEのリッチメニューから、LINE アプリ内のブラウザで
 *   この予約サイトを開きます。LIFF を使うと、その状態で
 *   「今 LINE を使っているのが誰か」を安全に取得できます。
 *   お客様は ID もパスワードも入力する必要がありません。
 *
 * 【安全のための流れ】
 *   1. まずサーバーに「もうログイン済みですか？」と尋ねる
 *   2. 未ログインなら LIFF を初期化し、IDトークンを受け取る
 *   3. IDトークンだけをサーバーへ送る
 *   4. サーバーが LINE へ問い合わせて本人確認し、Cookie を発行する
 *
 *   ★ userId をブラウザからサーバーへ送ることは一切ありません。
 *     （送っても、サーバー側で完全に無視されます）
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { Content, Screen, Brand } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";

/** LIFF SDK の、この画面で使う部分だけを型として書いています */
type Liff = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  login: (config?: { redirectUri?: string }) => void;
  getIDToken: () => string | null;
};

declare global {
  interface Window {
    liff?: Liff;
  }
}

const LIFF_SDK_URL = "https://static.line-scdn.net/liff/edge/2/sdk.js";

/** LIFF SDK を一度だけ読み込みます */
function loadLiffSdk(): Promise<Liff> {
  return new Promise((resolve, reject) => {
    if (window.liff) {
      resolve(window.liff);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LIFF_SDK_URL}"]`,
    );
    const onLoad = () => {
      if (window.liff) resolve(window.liff);
      else reject(new Error("LIFF SDK を読み込めませんでした。"));
    };

    if (existing) {
      existing.addEventListener("load", onLoad, { once: true });
      existing.addEventListener("error", () => reject(new Error("LIFF SDK")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = LIFF_SDK_URL;
    script.async = true;
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", () => reject(new Error("LIFF SDK")), { once: true });
    document.head.appendChild(script);
  });
}

type Me = {
  loggedIn: boolean;
  name: string;
  lineLoginEnabled: boolean;
  liffId: string;
  mockMode: boolean;
};

export type Session = { name: string; mockMode: boolean };

type Phase = "checking" | "ready" | "error";

/**
 * LINEの認証から戻ってきたあとの行き先を、一時的に預けるための印。
 * ------------------------------------------------------------------
 * LINEは認証が終わると、LIFFに登録された「エンドポイントURL」
 * （＝このサイトのトップページ）へ戻します。
 * そのため、行き先はトップページのアドレスに ?next= として持たせます。
 */
const NEXT_PARAM = "next";

/** 往復を繰り返さないための印（同じ画面の中だけで有効） */
const LOGIN_TRIED_KEY = "amulea.liff.loginTried";

function loginTried(): boolean {
  try {
    return sessionStorage.getItem(LOGIN_TRIED_KEY) === "1";
  } catch {
    return false;
  }
}

function setLoginTried(value: boolean): void {
  try {
    if (value) sessionStorage.setItem(LOGIN_TRIED_KEY, "1");
    else sessionStorage.removeItem(LOGIN_TRIED_KEY);
  } catch {
    /* 使えない環境でも動作を止めません */
  }
}

/**
 * ?next= の値を、安全な「このサイト内のページ」だけに限定します。
 * ★ 外部サイトのアドレスを入れられると、
 *   LINEから戻ったお客様を偽サイトへ飛ばせてしまいます（フィッシング）。
 *   そのため、先頭が「/」で、かつ「//」で始まらないものだけを許可します。
 */
function safeNextPath(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  return raw;
}

export default function SessionGate({
  children,
}: {
  children: (session: Session) => React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");

  /**
   * ログインが成立したときの共通処理。
   * もともと開こうとしていた画面（?next=）があれば、そちらへ送ります。
   * 戻り値が true なら「移動したので、ここでは何も描かない」という意味です。
   */
  const finish = useCallback((name: string, mockMode: boolean): void => {
    const next = safeNextPath(
      new URLSearchParams(window.location.search).get(NEXT_PARAM),
    );
    if (next && next !== window.location.pathname + window.location.search) {
      window.location.replace(next);
      return;
    }
    setSession({ name, mockMode });
    setPhase("ready");
  }, []);

  const start = useCallback(async () => {
    setPhase("checking");
    setMessage("");

    const me = await apiGet<Me>("/api/auth/me");
    if (!me.ok) {
      setMessage(me.error.message);
      setPhase("error");
      return;
    }

    /* すでにログイン済み（Cookie が有効） */
    if (me.data.loggedIn) {
      finish(me.data.name, me.data.mockMode);
      return;
    }

    /* ---- 開発中（モックモード）は仮ログインで進めます ---- */
    if (!me.data.lineLoginEnabled) {
      const dev = await apiPost<{ name: string }>("/api/auth/dev", { seat: "1" });
      if (!dev.ok) {
        setMessage(dev.error.message);
        setPhase("error");
        return;
      }
      finish(dev.data.name, true);
      return;
    }

    /* ---- LINE ログイン ---- */
    try {
      const liff = await loadLiffSdk();
      await liff.init({ liffId: me.data.liffId });

      if (!liff.isLoggedIn()) {
        /*
          ★ ここが「ホームに戻される」不具合の要点です。

          LINEは認証が終わると、LIFFに登録された
          「エンドポイントURL」＝トップページへ戻します。
          つまり /booking から認証へ送っても、戻り先はトップページです。
          トップページが何もしなければ、お客様はそこで取り残されます。

          そこで、認証の往復は必ずトップページで行い、
          もともと開こうとしていた画面は ?next= で持ち回ります。
        */
        const here = window.location.pathname + window.location.search;
        if (window.location.pathname !== "/") {
          window.location.replace(`/?${NEXT_PARAM}=${encodeURIComponent(here)}`);
          return;
        }

        /* 認証へ送ったのに戻ってこられない場合、往復を繰り返させません */
        if (loginTried()) {
          setLoginTried(false);
          setMessage(
            "LINEのログインを完了できませんでした。\n公式LINEのメニューから開き直してください。",
          );
          setPhase("error");
          return;
        }

        setLoginTried(true);
        liff.login({ redirectUri: window.location.href });
        return;
      }

      setLoginTried(false);

      const idToken = liff.getIDToken();
      if (!idToken) {
        setMessage(
          "LINEの情報を取得できませんでした。\n公式LINEのメニューから開き直してください。",
        );
        setPhase("error");
        return;
      }

      /* ★ サーバーへ送るのは IDトークンだけです */
      const login = await apiPost<{ name: string }>("/api/auth/line", { idToken });
      if (!login.ok) {
        setMessage(login.error.message);
        setPhase("error");
        return;
      }

      /* ログインできたので、もともと開こうとしていた画面へ送ります */
      finish(login.data.name, false);
    } catch {
      setMessage(
        "LINEとの連携に失敗しました。\n通信環境をご確認のうえ、公式LINEのメニューから開き直してください。",
      );
      setPhase("error");
    }
  }, [finish]);

  useEffect(() => {
    void start();
  }, [start]);

  if (phase === "ready" && session) return <>{children(session)}</>;

  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col justify-center">
        {phase === "checking" ? (
          <Loading label="準備しています" />
        ) : (
          <div className="flex flex-col gap-5">
            <Notice tone="error">{message}</Notice>
            <Button onClick={() => void start()} block>
              もう一度試す
            </Button>
          </div>
        )}
      </Content>
    </Screen>
  );
}
