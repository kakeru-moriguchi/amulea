/**
 * LINE ログイン（LIFF）の本人確認
 * ==================================================================
 * ★ ここが「なりすまし防止」の要です。
 *
 * ブラウザから送られてくる LINE userId を、そのまま信じては絶対にいけません。
 * （誰でも「他人の userId」を書いて送信できてしまうため）
 *
 * そこでフロントからは、LIFF が発行した「IDトークン」だけを受け取り、
 * それを LINE のサーバーへ送って検証してもらいます。
 * 検証に成功したときに返ってくる sub（= userId）だけを、
 * 本物の userId として扱います。
 *
 *   ブラウザ  --- IDトークン --->  当アプリのサーバー
 *   当アプリ  --- IDトークン --->  LINE のサーバー（検証）
 *   LINE     --- userId  --->  当アプリ（★これだけを信用する）
 *
 * 検証で確認されること
 *   ・トークンが LINE によって署名されている（改ざんされていない）
 *   ・自分のチャネル（client_id）向けに発行されている
 *   ・有効期限が切れていない
 */

import { env } from "../config/env";

const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify";

export type LineProfile = {
  /** LINE userId（U から始まる 33 文字） */
  userId: string;
  /** 表示名（入力欄の初期値としてのみ使用します） */
  displayName: string;
};

/**
 * IDトークンを検証し、LINE userId を取り出します。
 * 検証に失敗した場合は null を返します（理由は外部に出しません）。
 */
export async function verifyIdToken(idToken: unknown): Promise<LineProfile | null> {
  if (typeof idToken !== "string" || idToken.length === 0 || idToken.length > 4096) {
    return null;
  }
  if (!env.line.loginChannelId) return null;

  let response: Response;
  try {
    response = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        id_token: idToken,
        client_id: env.line.loginChannelId,
      }),
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  const data = (await response.json()) as {
    sub?: string;
    name?: string;
    aud?: string;
    exp?: number;
  };

  /* LINE 側で検証済みですが、念のためこちらでも確認します */
  if (!data.sub || typeof data.sub !== "string") return null;
  if (data.aud !== env.line.loginChannelId) return null;
  if (typeof data.exp === "number" && data.exp * 1000 < Date.now()) return null;

  return {
    userId: data.sub,
    displayName: typeof data.name === "string" ? data.name.slice(0, 40) : "",
  };
}
