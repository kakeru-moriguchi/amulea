/**
 * Google API の認証（サービスアカウント）
 * ==================================================================
 * Google カレンダー / スプレッドシートへアクセスするための
 * アクセストークンを取得します。
 *
 * 【なぜサービスアカウントか】
 *   お客様に Google ログインをさせる必要がなく、
 *   サロン側のカレンダーへサーバーが直接読み書きできるためです。
 *   「誰かがログインし直さないと動かない」状態になりません。
 *
 * 【秘密鍵の扱い】
 *   秘密鍵は環境変数（GOOGLE_PRIVATE_KEY）からのみ読み込みます。
 *   このファイルはサーバー側でしか動かないため、
 *   ブラウザへ送信されることはありません。
 *
 * 外部ライブラリ（googleapis）は使わず、Node 標準の crypto と
 * fetch だけで実装しています。依存を増やさず、
 * 何が起きているかを追いやすくするためです。
 */

import { createSign } from "node:crypto";
import { env } from "../config/env";

/** 必要な権限（スコープ） */
const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/spreadsheets",
].join(" ");

const TOKEN_URL = "https://oauth2.googleapis.com/token";

type CachedToken = { token: string; expiresAt: number };
let cache: CachedToken | null = null;

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** サービスアカウントの秘密鍵で署名した JWT を作ります */
function createAssertion(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: env.google.clientEmail,
      scope: SCOPES,
      aud: TOKEN_URL,
      iat: now,
      // Google の上限は 1 時間です
      exp: now + 3600,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(env.google.privateKey).toString("base64url");

  return `${signingInput}.${signature}`;
}

/**
 * アクセストークンを取得します。
 * 有効期限の 60 秒前までは使い回します（毎回取り直さないため）。
 */
export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cache && cache.expiresAt > now + 60_000) return cache.token;

  if (!env.google.clientEmail || !env.google.privateKey) {
    throw new Error("Google のサービスアカウント設定がありません。");
  }

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: createAssertion(),
    }),
  });

  if (!response.ok) {
    // ★ レスポンス本文には秘密情報が含まれ得るため、本文は出しません
    throw new Error(`Google 認証に失敗しました（HTTP ${response.status}）`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return cache.token;
}

/** テスト・設定変更時にトークンのキャッシュを捨てます */
export function clearTokenCache(): void {
  cache = null;
}

/**
 * Google API を呼び出す共通処理。
 * 失敗時は「どの API が」「HTTP 何番で」失敗したかだけを含む
 * エラーを投げます（応答本文はログにも残しません）。
 */
export async function googleFetch(
  url: string,
  init: RequestInit & { label: string },
): Promise<unknown> {
  const token = await getAccessToken();
  const { label, ...rest } = init;

  const response = await fetch(url, {
    ...rest,
    headers: {
      ...(rest.headers ?? {}),
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    // Google の応答は常に最新を取得します
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Google API エラー（${label} / HTTP ${response.status}）`);
  }

  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
