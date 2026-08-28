/**
 * ログ出力
 * ==================================================================
 * ★ 重要: 電話番号・自由記載・LINE userId の全文・アクセストークンは
 *   絶対にログへ出力しません。
 *   障害調査に必要な最低限の情報だけを出します。
 */

/** LINE userId を "U1234…abcd" の形に短縮します（ログ用） */
export function maskUserId(userId: string): string {
  if (!userId) return "(none)";
  if (userId.length <= 10) return "***";
  return `${userId.slice(0, 5)}…${userId.slice(-4)}`;
}

/** 電話番号は下4桁のみ */
export function maskPhone(phone: string): string {
  if (!phone) return "(none)";
  return `***${phone.slice(-4)}`;
}

/** 予約 ID は先頭8文字のみ */
export function maskId(id: string): string {
  return id ? id.slice(0, 8) : "(none)";
}

type Fields = Record<string, string | number | boolean | null | undefined>;

function line(level: string, message: string, fields?: Fields): string {
  const parts = [`[${level}]`, message];
  if (fields) {
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue;
      parts.push(`${k}=${String(v)}`);
    }
  }
  return parts.join(" ");
}

export const log = {
  info(message: string, fields?: Fields) {
    console.log(line("info", message, fields));
  },
  warn(message: string, fields?: Fields) {
    console.warn(line("warn", message, fields));
  },
  /**
   * エラーログ。
   * 例外オブジェクトの message だけを出し、
   * スタックトレースは開発時のみ出力します（秘密情報の流出防止）。
   */
  error(message: string, error?: unknown, fields?: Fields) {
    const detail =
      error instanceof Error ? error.message : error ? String(error) : "";
    console.error(line("error", message, { ...fields, detail: detail || undefined }));
    if (error instanceof Error && process.env.NODE_ENV !== "production") {
      console.error(error.stack);
    }
  },
};
