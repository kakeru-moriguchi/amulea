/**
 * 入力値の検証
 * ==================================================================
 * ★ 方針
 *   クライアントから届く値は「すべて信用しない」前提で扱います。
 *   フロントの入力チェックは体験を良くするためのもので、
 *   本当の検証はここ（サーバー側）で必ず行います。
 *
 * ★ XSS 対策
 *   React は文字列を自動的にエスケープして描画するため、
 *   `dangerouslySetInnerHTML` を使わない限り XSS は発生しません。
 *   このアプリでは同 API を一切使用していません。
 *   加えて、保存前に制御文字を取り除いています。
 *
 * ★ インジェクション対策
 *   データの保存先は Google スプレッドシート（API 経由）で、
 *   SQL 文の組み立ては行いません。
 *   スプレッドシート特有のリスクである「数式インジェクション」
 *   （= や + で始まる文字列が数式として評価される問題）は
 *   sanitizeForSheet() で無害化しています。
 */

import { isRealDate, isTimeString, timeToMinutes } from "../util/datetime";

/** 検証結果 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: string[] };

/**
 * 制御文字（タブ・改行を除く）と DEL を取り除き、前後の空白を落とします。
 * 文字コードで判定しているため、ソースコード上に制御文字が入りません。
 */
function stripControlChars(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    const isTabOrNewline = code === 0x09 || code === 0x0a || code === 0x0d;
    const isControl = (code < 0x20 && !isTabOrNewline) || code === 0x7f;
    if (!isControl) out += ch;
  }
  return out;
}

export function cleanText(input: unknown, maxLength: number): string {
  if (typeof input !== "string") return "";
  return stripControlChars(input).trim().slice(0, maxLength);
}

/** 改行も許さない1行テキスト */
export function cleanLine(input: unknown, maxLength: number): string {
  return cleanText(input, maxLength).replace(/[\r\n]+/g, " ");
}

/**
 * スプレッドシートの数式インジェクション対策。
 * = + - @ で始まる文字列はセルで数式として解釈される可能性があるため、
 * 先頭にアポストロフィを付けて「文字列」であることを明示します。
 */
export function sanitizeForSheet(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`;
  return value;
}

/** 電話番号（日本国内） */
export function validatePhone(input: unknown): ValidationResult<string> {
  const raw = cleanLine(input, 20);
  // 全角数字を半角へ、ハイフン類・空白・括弧を除去
  const normalized = raw
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[-‐－ー\s()（）]/g, "");

  if (!normalized) return { ok: false, errors: ["電話番号を入力してください。"] };
  if (!/^0\d{9,10}$/.test(normalized)) {
    return {
      ok: false,
      errors: ["電話番号は0から始まる10〜11桁の数字で入力してください。"],
    };
  }
  return { ok: true, value: normalized };
}

/** お名前 */
export function validateName(input: unknown): ValidationResult<string> {
  const name = cleanLine(input, 40);
  if (!name) return { ok: false, errors: ["お名前を入力してください。"] };
  return { ok: true, value: name };
}

/** 自由記載（任意） */
export function validateNote(input: unknown): ValidationResult<string> {
  if (input === undefined || input === null) return { ok: true, value: "" };
  // 先に制御文字を落としてから長さを判定します（見た目の文字数と揃えるため）
  const note = cleanText(input, 2000);
  if (note.length > 500) {
    return { ok: false, errors: ["ご要望は500文字以内で入力してください。"] };
  }
  return { ok: true, value: note };
}

/** 日付 YYYY-MM-DD */
export function validateDate(input: unknown): ValidationResult<string> {
  if (typeof input !== "string" || !isRealDate(input)) {
    return { ok: false, errors: ["日付の指定が正しくありません。"] };
  }
  return { ok: true, value: input };
}

/** 時刻 HH:mm */
export function validateTime(input: unknown): ValidationResult<string> {
  if (!isTimeString(input)) {
    return { ok: false, errors: ["時間の指定が正しくありません。"] };
  }
  return { ok: true, value: input };
}

/** 開始 < 終了 になっているか */
export function isValidRange(start: string, end: string): boolean {
  return timeToMinutes(start) < timeToMinutes(end);
}

/** ID 文字列（英数字・ハイフン・アンダースコアのみ） */
export function validateId(input: unknown): ValidationResult<string> {
  if (typeof input !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(input)) {
    return { ok: false, errors: ["指定が正しくありません。"] };
  }
  return { ok: true, value: input };
}

/** ID の配列（オプションなど） */
export function validateIdArray(input: unknown, max = 10): ValidationResult<string[]> {
  if (input === undefined || input === null) return { ok: true, value: [] };
  if (!Array.isArray(input)) {
    return { ok: false, errors: ["指定が正しくありません。"] };
  }
  if (input.length > max) {
    return { ok: false, errors: [`選択できるのは${max}件までです。`] };
  }
  const value: string[] = [];
  for (const item of input) {
    const r = validateId(item);
    if (!r.ok) return r;
    if (!value.includes(r.value)) value.push(r.value);
  }
  return { ok: true, value };
}

/** UUID（予約 ID） */
export function isUuid(input: unknown): input is string {
  return (
    typeof input === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      input,
    )
  );
}

/** リクエストボディを安全に JSON として読み取ります */
export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return {};
  try {
    const raw = await request.text();
    // 極端に大きなボディは受け付けません（メモリ枯渇の防止）
    if (raw.length > 20_000) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}
