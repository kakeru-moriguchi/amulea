/**
 * セッション管理
 * ==================================================================
 * ログイン状態は「サーバーで署名した Cookie」で保持します。
 *
 * ★ 安全のための設計
 *   httpOnly … JavaScript から読めない（XSS で盗まれない）
 *   secure   … HTTPS でのみ送信される（本番）
 *   sameSite … 他サイトからのリクエストでは送られない（CSRF 対策の一段目）
 *   署名     … 中身を書き換えると検証に失敗する
 *              （userId を他人のものに書き換えることはできません）
 *
 * ★ Cookie に入れるのは「LINE userId」と「表示名」だけです。
 *   電話番号などの個人情報は入れません。
 */

import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { env } from "../config/env";
import { log } from "../security/logger";

const CUSTOMER_COOKIE = "amulea_session";
const ADMIN_COOKIE = "amulea_admin";

/** お客様セッションの有効期間（30日） */
const CUSTOMER_MAX_AGE_SEC = 60 * 60 * 24 * 30;
/** 管理者セッションの有効期間（12時間） */
const ADMIN_MAX_AGE_SEC = 60 * 60 * 12;

export type SessionKind = "customer" | "admin";

export type SessionData = {
  kind: SessionKind;
  /** お客様なら LINE userId、管理者なら管理者 ID */
  sub: string;
  /** 表示名（入力欄の初期値に使うだけ） */
  name: string;
  /** 有効期限（UNIX 秒） */
  exp: number;
};

/**
 * 署名鍵。
 * 本番で未設定の場合は、起動時に気づけるようログを出しつつ、
 * ランダムな鍵を使います（＝再起動でログアウトしますが、
 * 「誰でも偽造できる固定値」にはしません）。
 */
let fallbackSecret: string | null = null;

function secret(): string {
  if (env.sessionSecret.length >= 32) return env.sessionSecret;
  if (!fallbackSecret) {
    fallbackSecret = randomBytes(32).toString("hex");
    if (env.isProduction) {
      log.warn(
        "SESSION_SECRET が未設定です。一時的な鍵で動作しています（再起動でログアウトします）",
      );
    }
  }
  return fallbackSecret;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

/** 署名付きトークンを作ります */
function encode(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** 署名を検証してから中身を取り出します */
function decode(token: string | undefined): SessionData | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(payload);
  // 文字列比較のタイミングから鍵を推測されないようにします
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
    if (!data || typeof data.sub !== "string") return null;
    if (typeof data.exp !== "number" || data.exp * 1000 < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function cookieOptions(maxAgeSec: number) {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSec,
  };
}

/* ------------------------------------------------------------------
   お客様セッション
   ------------------------------------------------------------------ */

/**
 * ログイン状態を作ります。
 * ★ userId は必ず「LINE の検証を通ったもの」を渡してください。
 *   クライアントから送られてきた値をそのまま渡してはいけません。
 */
export async function createCustomerSession(
  lineUserId: string,
  displayName: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(
    CUSTOMER_COOKIE,
    encode({
      kind: "customer",
      sub: lineUserId,
      name: displayName.slice(0, 40),
      exp: Math.floor(Date.now() / 1000) + CUSTOMER_MAX_AGE_SEC,
    }),
    cookieOptions(CUSTOMER_MAX_AGE_SEC),
  );
}

/** 現在ログインしているお客様（未ログインなら null） */
export async function getCustomerSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const data = decode(jar.get(CUSTOMER_COOKIE)?.value);
  return data && data.kind === "customer" ? data : null;
}

export async function clearCustomerSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(CUSTOMER_COOKIE);
}

/* ------------------------------------------------------------------
   管理者セッション
   ------------------------------------------------------------------ */

export async function createAdminSession(adminId: string): Promise<void> {
  const jar = await cookies();
  jar.set(
    ADMIN_COOKIE,
    encode({
      kind: "admin",
      sub: adminId,
      name: "管理者",
      exp: Math.floor(Date.now() / 1000) + ADMIN_MAX_AGE_SEC,
    }),
    cookieOptions(ADMIN_MAX_AGE_SEC),
  );
}

export async function getAdminSession(): Promise<SessionData | null> {
  const jar = await cookies();
  const data = decode(jar.get(ADMIN_COOKIE)?.value);
  return data && data.kind === "admin" ? data : null;
}

export async function clearAdminSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
}

export { CUSTOMER_COOKIE, ADMIN_COOKIE };
