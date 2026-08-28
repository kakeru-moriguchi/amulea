/**
 * /check  接続診断ページ（お客様側）
 * ==================================================================
 * 「予約ページが開かない」「ホームに戻される」といったときに、
 * LINEアプリの中で実際に何が起きているのかを、順番に画面へ出します。
 *
 * ★ この画面の約束ごと
 *   ・途中で自動的に別の画面へ移動しません（原因を読めるようにするため）
 *   ・LINEのログイン画面へも送りません（観察するだけ）
 *   ・秘密の値は表示しません
 *       IDトークン    … 中身は出さず「取得できたか」と文字数だけ
 *       電話番号・氏名 … 一切表示しません
 *   ・LIFF ID はブラウザに元から渡っている公開情報のため表示します
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Brand, Content, Screen } from "@/components/ui/Layout";

type Row = {
  name: string;
  state: "ok" | "ng" | "info";
  detail: string;
};

type Liff = {
  init: (config: { liffId: string }) => Promise<void>;
  isLoggedIn: () => boolean;
  getIDToken: () => string | null;
  isInClient?: () => boolean;
  getOS?: () => string;
};

/*
  window.liff の型は SessionGate.tsx で既に宣言済みです。
  この画面では追加の関数（isInClient など）も使うため、
  重複宣言を避けて、この場で読み替えます。
*/
function liffOnWindow(): Liff | undefined {
  return (window as unknown as { liff?: Liff }).liff;
}

const SDK = "https://static.line-scdn.net/liff/edge/2/sdk.js";

function loadSdk(): Promise<Liff> {
  return new Promise((resolve, reject) => {
    const existing = liffOnWindow();
    if (existing) return resolve(existing);
    const el = document.createElement("script");
    el.src = SDK;
    el.async = true;
    el.onload = () => {
      const loaded = liffOnWindow();
      if (loaded) resolve(loaded);
      else reject(new Error("SDKを読み込めません"));
    };
    el.onerror = () => reject(new Error("SDKの読み込みに失敗しました"));
    document.head.appendChild(el);
  });
}

/** エラーを、秘密を含まない短い文字にします */
function reason(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e).slice(0, 200);
  } catch {
    return String(e);
  }
}

export default function CheckPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    const out: Row[] = [];
    const push = (name: string, state: Row["state"], detail: string) => {
      out.push({ name, state, detail });
      setRows([...out]);
    };

    /* ---- 1. いまどこを開いているか ---- */
    push("いま開いているURL", "info", window.location.href);

    /* ---- 2. サーバーの状態 ---- */
    let liffId = "";
    let lineEnabled = false;
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json()) as {
        ok?: boolean;
        data?: {
          loggedIn?: boolean;
          lineLoginEnabled?: boolean;
          liffId?: string;
          mockMode?: boolean;
        };
      };
      const d = json.data ?? {};
      liffId = d.liffId ?? "";
      lineEnabled = Boolean(d.lineLoginEnabled);

      push("サーバーとの通信", res.ok ? "ok" : "ng", `HTTP ${res.status}`);
      push(
        "ログイン状態（Cookie）",
        d.loggedIn ? "ok" : "info",
        d.loggedIn ? "ログイン済み" : "未ログイン",
      );
      push(
        "LINEログインの設定",
        lineEnabled ? "ok" : "info",
        lineEnabled
          ? "有効（LIFF ID・チャネルIDが登録されています）"
          : "無効。Vercel に NEXT_PUBLIC_LIFF_ID と LINE_LOGIN_CHANNEL_ID を登録し、Redeploy してください",
      );
      push("LIFF ID", liffId ? "ok" : "ng", liffId || "未設定");
      if (d.mockMode) push("MOCK_MODE", "ng", "有効になっています（連携が止まります）");
    } catch (e) {
      push("サーバーとの通信", "ng", reason(e));
    }

    /* ---- 3. Cookie を保存できるか ---- */
    /*
      LINEアプリ内のブラウザでCookieが保存されないと、
      画面を移動するたびにログインが外れ、
      「押しても元の画面に戻される」ように見えます。
    */
    try {
      document.cookie = "amulea_check=1; path=/; SameSite=Lax";
      const saved = document.cookie.includes("amulea_check=1");
      push(
        "Cookieの保存",
        saved ? "ok" : "ng",
        saved
          ? "保存できました"
          : "保存できません。この場合、画面を移動するたびログインが外れます",
      );
      document.cookie = "amulea_check=; path=/; Max-Age=0";
    } catch (e) {
      push("Cookieの保存", "ng", reason(e));
    }

    if (!lineEnabled) {
      push("ここまでの判定", "info", "LINEログインが無効なので、これ以降は確認しません");
      setRunning(false);
      return;
    }

    /* ---- 4. LIFF ---- */
    let liff: Liff;
    try {
      liff = await loadSdk();
      push("LIFF SDKの読み込み", "ok", "成功");
    } catch (e) {
      push("LIFF SDKの読み込み", "ng", reason(e));
      setRunning(false);
      return;
    }

    try {
      await liff.init({ liffId });
      push("LIFFの初期化", "ok", "成功");
    } catch (e) {
      push("LIFFの初期化", "ng", `${reason(e)}／LIFF IDが正しいか確認してください`);
      setRunning(false);
      return;
    }

    try {
      push(
        "LINEアプリの中で開いているか",
        liff.isInClient?.() ? "ok" : "info",
        liff.isInClient?.()
          ? "はい（LINEアプリ内）"
          : "いいえ（通常のブラウザ）。公式LINEのメニューから開いてください",
      );
    } catch {
      /* 古いSDKでは使えないことがあります */
    }

    const loggedIn = liff.isLoggedIn();
    push(
      "LINEへのログイン状態",
      loggedIn ? "ok" : "ng",
      loggedIn ? "ログイン済み" : "未ログイン。ここが原因で往復が起きます",
    );

    if (!loggedIn) {
      setRunning(false);
      return;
    }

    const idToken = liff.getIDToken();
    push(
      "IDトークンの取得",
      idToken ? "ok" : "ng",
      idToken
        ? `取得できました（${idToken.length}文字）`
        : "取得できません。LIFFの Scope に openid が入っているか確認してください",
    );

    if (!idToken) {
      setRunning(false);
      return;
    }

    /* ---- 5. 本人確認まで通るか ---- */
    try {
      const res = await fetch("/api/auth/line", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: { message?: string } };
      push(
        "サーバーでの本人確認",
        res.ok ? "ok" : "ng",
        res.ok
          ? "成功しました"
          : `HTTP ${res.status}／${json.error?.message ?? ""}／LINE_LOGIN_CHANNEL_ID が LIFF と同じチャネルか確認してください`,
      );
    } catch (e) {
      push("サーバーでの本人確認", "ng", reason(e));
    }

    /* ---- 6. ログインが保持されているか ---- */
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const json = (await res.json()) as { data?: { loggedIn?: boolean } };
      const kept = Boolean(json.data?.loggedIn);
      push(
        "ログインの保持",
        kept ? "ok" : "ng",
        kept
          ? "保持できています。予約画面はそのまま開けるはずです"
          : "保持できていません。これが『ホームに戻される』直接の原因です",
      );
    } catch (e) {
      push("ログインの保持", "ng", reason(e));
    }

    setRunning(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col gap-5">
        <div>
          <p className="text-[0.78rem] tracking-[0.2em] text-champagne-700">CHECK</p>
          <h1 className="mt-2 text-[1.1rem] tracking-[0.1em] text-umber-800">接続の確認</h1>
          <p className="mt-2 text-[0.82rem] leading-relaxed text-umber-500">
            この画面は自動的に移動しません。
            <br />
            上から順に見て、最初に ✕ が付いた項目が原因です。
          </p>
        </div>

        <ul className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <li
              key={i}
              className="rounded-xl border border-champagne-500/25 bg-white/70 p-3.5"
            >
              <p className="flex items-start gap-2 text-[0.86rem] text-umber-800">
                <span aria-hidden="true">
                  {r.state === "ok" ? "✅" : r.state === "ng" ? "✕" : "・"}
                </span>
                <span>{r.name}</span>
              </p>
              <p className="mt-1.5 pl-6 text-[0.78rem] leading-relaxed break-all text-umber-500">
                {r.detail}
              </p>
            </li>
          ))}
        </ul>

        {running && <p className="text-[0.82rem] text-umber-400">確認しています…</p>}

        <Button variant="outline" block onClick={() => void run()} disabled={running}>
          もう一度確認する
        </Button>
      </Content>
    </Screen>
  );
}
