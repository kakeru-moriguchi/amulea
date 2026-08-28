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

export default function SessionGate({
  children,
}: {
  children: (session: Session) => React.ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState("");

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
      setSession({ name: me.data.name, mockMode: me.data.mockMode });
      setPhase("ready");
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
      setSession({ name: dev.data.name, mockMode: true });
      setPhase("ready");
      return;
    }

    /* ---- LINE ログイン ---- */
    try {
      const liff = await loadLiffSdk();
      await liff.init({ liffId: me.data.liffId });

      if (!liff.isLoggedIn()) {
        /* LINE のログイン画面へ移動します（戻ってくるとログイン済みになります） */
        liff.login({ redirectUri: window.location.href });
        return;
      }

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

      setSession({ name: login.data.name, mockMode: false });
      setPhase("ready");
    } catch {
      setMessage(
        "LINEとの連携に失敗しました。\n通信環境をご確認のうえ、公式LINEのメニューから開き直してください。",
      );
      setPhase("error");
    }
  }, []);

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
