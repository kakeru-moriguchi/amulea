/**
 * CSRF（クロスサイトリクエストフォージェリ）対策
 * ==================================================================
 * 「別のサイトに置かれた罠のボタンを踏まされ、
 *   ログイン済みの状態で勝手に予約・キャンセルさせられる」
 * という攻撃を防ぎます。
 *
 * 三重に防いでいます。
 *
 *   1. Cookie の SameSite=Lax
 *      → 他サイトからの POST では Cookie が送られません。
 *   2. Origin / Referer ヘッダの確認（このファイル）
 *      → 自分のサイト以外からのリクエストを弾きます。
 *   3. Content-Type: application/json の必須化
 *      → HTML のフォームからは送れない形式のため、
 *        単純なフォーム型 CSRF が成立しません。
 */

import { env } from "../config/env";

/** 書き込み系（POST / PATCH / DELETE）のリクエストか */
function isMutation(method: string): boolean {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

/** 許可するホスト名を集めます */
function allowedHosts(request: Request): Set<string> {
  const hosts = new Set<string>();

  /* 自分自身のホスト（Vercel のプレビュー URL でも自動的に一致します） */
  const host = request.headers.get("host");
  if (host) hosts.add(host.toLowerCase());

  /* 明示的に設定された公開 URL */
  if (env.appUrl) {
    try {
      hosts.add(new URL(env.appUrl).host.toLowerCase());
    } catch {
      /* URL が不正でも起動は止めません */
    }
  }

  return hosts;
}

/**
 * リクエストが安全かどうかを判定します。
 * 問題があればエラーメッセージを返します（null なら OK）。
 */
export function checkCsrf(request: Request): string | null {
  if (!isMutation(request.method)) return null;

  const hosts = allowedHosts(request);

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (!hosts.has(new URL(origin).host.toLowerCase())) {
        return "不正なリクエストです。";
      }
      return null;
    } catch {
      return "不正なリクエストです。";
    }
  }

  /* Origin が無い場合は Referer で確認します */
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (!hosts.has(new URL(referer).host.toLowerCase())) {
        return "不正なリクエストです。";
      }
      return null;
    } catch {
      return "不正なリクエストです。";
    }
  }

  /*
    Origin も Referer も無い場合。
    通常のブラウザからの fetch では必ず Origin が付くため、
    ここに来るのは想定外のリクエストです。
  */
  return "不正なリクエストです。";
}

/**
 * JSON 以外の Content-Type を弾きます（フォーム型 CSRF の防止）。
 *
 * DELETE は HTML のフォームからは送信できないため、この確認を省きます
 * （ボディを持たないリクエストに Content-Type を強制しないため）。
 */
export function checkJsonContentType(request: Request): string | null {
  if (!isMutation(request.method)) return null;
  if (request.method.toUpperCase() === "DELETE") return null;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return "不正なリクエストです。";
  }
  return null;
}
