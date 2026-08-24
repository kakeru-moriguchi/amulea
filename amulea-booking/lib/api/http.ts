/**
 * API の共通処理
 * ==================================================================
 * すべての API ルートは、ここにある関数を通してリクエストを検証し、
 * レスポンスを返します。チェック漏れを防ぐためです。
 *
 * ★ エラーメッセージには秘密情報を含めません。
 *   お客様に見せてよい日本語だけを返します。
 */

import { env } from "../config/env";
import { checkCsrf, checkJsonContentType } from "../auth/csrf";
import { getAdminSession, getCustomerSession } from "../auth/session";
import { clientKey, rateLimit } from "../security/rate-limit";
import { log } from "../security/logger";
import type { BookingError } from "../domain/booking";

/** 成功レスポンス */
export function ok<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ ok: true, data }, { status: 200, ...init });
}

/** 失敗レスポンス */
export function error(status: number, message: string, code = "error"): Response {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

/** BookingError を HTTP ステータスへ変換します */
export function fromBookingError(e: BookingError): Response {
  const status =
    e.code === "not_found"
      ? 404
      : e.code === "forbidden"
        ? 403
        : e.code === "conflict"
          ? 409
          : e.code === "invalid"
            ? 400
            : e.code === "deadline" || e.code === "suspended"
              ? 422
              : 400;
  return error(status, e.message, e.code);
}

/**
 * 書き込み系リクエストの共通チェック（CSRF・Content-Type・レート制限）。
 * 問題があれば Response を返します。null なら続行して構いません。
 */
export function guardMutation(request: Request, bucket: string): Response | null {
  const csrf = checkCsrf(request);
  if (csrf) return error(403, csrf, "csrf");

  const contentType = checkJsonContentType(request);
  if (contentType) return error(415, contentType, "content_type");

  const limit = rateLimit(
    `${bucket}:${clientKey(request)}`,
    env.rateLimit.max,
    env.rateLimit.windowSec,
  );
  if (!limit.allowed) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "アクセスが集中しています。少し時間をおいてお試しください。",
        },
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }

  return null;
}

/** 読み取り系のレート制限（書き込みより緩め） */
export function guardRead(request: Request, bucket: string): Response | null {
  const limit = rateLimit(
    `${bucket}:${clientKey(request)}`,
    env.rateLimit.max * 6,
    env.rateLimit.windowSec,
  );
  if (!limit.allowed) {
    return Response.json(
      {
        ok: false,
        error: {
          code: "rate_limited",
          message: "アクセスが集中しています。少し時間をおいてお試しください。",
        },
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSec) } },
    );
  }
  return null;
}

/**
 * ログイン中のお客様の LINE userId を返します。
 * ★ クライアントから送られてきた userId は一切使いません。
 */
export async function requireCustomer(): Promise<
  { ok: true; lineUserId: string; name: string } | { ok: false; response: Response }
> {
  const session = await getCustomerSession();
  if (!session) {
    return {
      ok: false,
      response: error(401, "ログインが必要です。公式LINEから開き直してください。", "unauthorized"),
    };
  }
  return { ok: true, lineUserId: session.sub, name: session.name };
}

/** 管理者としてログインしているか確認します */
export async function requireAdmin(): Promise<
  { ok: true; adminId: string } | { ok: false; response: Response }
> {
  const session = await getAdminSession();
  if (!session) {
    return {
      ok: false,
      response: error(401, "管理者としてログインしてください。", "unauthorized"),
    };
  }
  return { ok: true, adminId: session.sub };
}

/**
 * 想定外の例外をまとめて処理します。
 * ★ 例外の中身をそのままクライアントへ返しません（情報漏えいの防止）。
 */
export async function handle(
  label: string,
  task: () => Promise<Response>,
): Promise<Response> {
  try {
    return await task();
  } catch (e) {
    log.error(`API エラー: ${label}`, e);
    return error(500, "処理中に問題が発生しました。時間をおいてお試しください。", "internal");
  }
}
