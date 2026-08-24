/**
 * 日付・時刻ユーティリティ（すべて日本時間 JST = UTC+9 基準）
 * ==================================================================
 * このアプリの日付・時刻は、サーバーがどの国にあっても
 * 必ず「日本時間」で計算されなければなりません。
 * （Vercel のサーバーは UTC で動きます）
 *
 * 日本には夏時間が無いため、UTC+9 の固定オフセットで計算しています。
 * 外部ライブラリは使用していません。
 */

/** 日本時間のオフセット（分） */
const JST_OFFSET_MIN = 9 * 60;

/** YYYY-MM-DD 形式かどうか */
export function isDateString(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/** HH:mm 形式かどうか */
export function isTimeString(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** "HH:mm" → 0:00 からの経過分 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * 経過分 → "HH:mm"
 * 24:00 を超える場合（翌日にまたがる場合）も "25:30" のようには返さず、
 * 24 時間で折り返した表示にします。
 */
export function minutesToTime(min: number): string {
  const normalized = ((min % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 現在時刻を日本時間の Date として（getUTC* で日本時間の値が読めます） */
function nowAsJst(): Date {
  return new Date(Date.now() + JST_OFFSET_MIN * 60 * 1000);
}

/** 今日の日付（日本時間）YYYY-MM-DD */
export function todayJst(): string {
  const d = nowAsJst();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** 現在時刻（日本時間）の 0:00 からの経過分 */
export function nowMinutesJst(): number {
  const d = nowAsJst();
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/** YYYY-MM-DD を {year, month, day} に分解 */
export function parseDate(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split("-").map(Number);
  return { year, month, day };
}

/** YYYY-MM-DD が実在する日付かどうか（2026-02-31 などを弾きます） */
export function isRealDate(date: string): boolean {
  if (!isDateString(date)) return false;
  const { year, month, day } = parseDate(date);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day
  );
}

/** 曜日（0=日曜 … 6=土曜） */
export function weekdayOf(date: string): number {
  const { year, month, day } = parseDate(date);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** 日付を n 日進める（負の数で戻る） */
export function addDays(date: string, n: number): string {
  const { year, month, day } = parseDate(date);
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate(),
  ).padStart(2, "0")}`;
}

/** 2つの日付の差（日数）。b - a */
export function diffDays(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  const ta = Date.UTC(pa.year, pa.month - 1, pa.day);
  const tb = Date.UTC(pb.year, pb.month - 1, pb.day);
  return Math.round((tb - ta) / 86400000);
}

/**
 * 日本時間の「日付 + 時刻」を ISO 8601 文字列にします。
 * Google カレンダー API へ渡すときに使用します。
 * 例: ("2026-09-10", "15:00") → "2026-09-10T15:00:00+09:00"
 *
 * 時刻が 24:00 以上（翌日にまたがる枠）の場合は、日付を繰り上げます。
 */
export function toJstIso(date: string, minutesFromMidnight: number): string {
  const extraDays = Math.floor(minutesFromMidnight / 1440);
  const d = extraDays === 0 ? date : addDays(date, extraDays);
  return `${d}T${minutesToTime(minutesFromMidnight)}:00+09:00`;
}

/** 現在時刻を UTC の ISO 文字列で（作成日時などの記録用） */
export function nowIso(): string {
  return new Date().toISOString();
}

const WEEKDAY_JA = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** 曜日の日本語 1 文字 */
export function weekdayJa(date: string): string {
  return WEEKDAY_JA[weekdayOf(date)];
}

/** "2026-09-10" → "9月10日（木）" */
export function formatDateShortJa(date: string): string {
  const { month, day } = parseDate(date);
  return `${month}月${day}日（${weekdayJa(date)}）`;
}

/** "2026-09-10" → "2026年9月10日（木）" */
export function formatDateJa(date: string): string {
  const { year, month, day } = parseDate(date);
  return `${year}年${month}月${day}日（${weekdayJa(date)}）`;
}

/** "2026-09-10" + "15:00" → "2026年9月10日（木） 15:00〜" */
export function formatDateTimeJa(date: string, time: string): string {
  return `${formatDateJa(date)} ${time}〜`;
}

/** 金額を "¥10,000" 形式に */
export function formatPrice(price: number): string {
  return `¥${price.toLocaleString("ja-JP")}`;
}

/** 施術時間を "90分" 形式に */
export function formatDuration(min: number): string {
  return `${min}分`;
}
