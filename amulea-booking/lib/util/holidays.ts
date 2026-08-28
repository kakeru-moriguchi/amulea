/**
 * 日本の祝日判定
 * ==================================================================
 * 営業時間が「平日 13:00〜」「土日祝 12:00〜」と分かれているため、
 * 祝日かどうかの判定が必要です。
 *
 * 外部 API やライブラリに依存すると、通信が失敗したときに
 * 予約画面が壊れてしまいます。そのため、法律で決まっている規則を
 * そのまま計算する方式にしています（オフラインで確実に動きます）。
 *
 * 対応範囲: 2000年〜2099年（春分・秋分の近似式の有効範囲）
 *
 * 【祝日が変わったら】
 *   法改正で祝日が変わった場合は、この下の buildHolidays() を
 *   修正してください。単発の変更であれば ONE_OFF_HOLIDAYS に
 *   追記するだけでも対応できます。
 */

import { addDays, parseDate, weekdayOf } from "./datetime";

/** 法改正・特例で単発的に変わった祝日（日付を直接指定） */
const ONE_OFF_HOLIDAYS: Record<string, string> = {
  // 2019年 天皇の即位
  "2019-05-01": "天皇の即位の日",
  "2019-10-22": "即位礼正殿の儀の行われる日",
  // 2020年 東京オリンピック特例
  "2020-07-23": "海の日",
  "2020-07-24": "スポーツの日",
  "2020-08-10": "山の日",
  // 2021年 東京オリンピック特例
  "2021-07-22": "海の日",
  "2021-07-23": "スポーツの日",
  "2021-08-08": "山の日",
};

/** オリンピック特例で「その年は無くなる」祝日 */
const MOVED_AWAY: Record<number, string[]> = {
  2020: ["海の日", "スポーツの日", "山の日"],
  2021: ["海の日", "スポーツの日", "山の日"],
};

/** その月の n 番目の指定曜日の日付を返します */
function nthWeekday(year: number, month: number, weekday: number, nth: number): string {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const day = 1 + ((weekday - first + 7) % 7) + (nth - 1) * 7;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function ymd(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 春分の日 / 秋分の日
 * 国立天文台の暦要項に基づく近似式（1980〜2099年で一致します）
 */
function vernalEquinoxDay(year: number): number {
  return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}
function autumnalEquinoxDay(year: number): number {
  return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
}

/** 1年分の祝日（振替休日・国民の休日を含む）を組み立てます */
function buildHolidays(year: number): Map<string, string> {
  const base = new Map<string, string>();
  const movedAway = MOVED_AWAY[year] ?? [];
  const put = (date: string, name: string) => {
    if (movedAway.includes(name)) return;
    base.set(date, name);
  };

  put(ymd(year, 1, 1), "元日");
  put(nthWeekday(year, 1, 1, 2), "成人の日");
  put(ymd(year, 2, 11), "建国記念の日");
  if (year >= 2020) put(ymd(year, 2, 23), "天皇誕生日");
  put(ymd(year, 3, vernalEquinoxDay(year)), "春分の日");
  put(ymd(year, 4, 29), "昭和の日");
  put(ymd(year, 5, 3), "憲法記念日");
  put(ymd(year, 5, 4), "みどりの日");
  put(ymd(year, 5, 5), "こどもの日");
  put(nthWeekday(year, 7, 1, 3), "海の日");
  if (year >= 2016) put(ymd(year, 8, 11), "山の日");
  put(nthWeekday(year, 9, 1, 3), "敬老の日");
  put(ymd(year, 9, autumnalEquinoxDay(year)), "秋分の日");
  if (year >= 2020) put(nthWeekday(year, 10, 1, 2), "スポーツの日");
  else put(nthWeekday(year, 10, 1, 2), "体育の日");
  put(ymd(year, 11, 3), "文化の日");
  put(ymd(year, 11, 23), "勤労感謝の日");
  if (year <= 2018) put(ymd(year, 12, 23), "天皇誕生日");

  for (const [date, name] of Object.entries(ONE_OFF_HOLIDAYS)) {
    if (Number(date.slice(0, 4)) === year) base.set(date, name);
  }

  /* ---- 国民の休日 ----
     前日と翌日がどちらも祝日の平日は休日になります（例: 敬老の日と秋分の日に挟まれた日） */
  const withCitizens = new Map(base);
  for (const date of base.keys()) {
    const twoLater = addDays(date, 2);
    const between = addDays(date, 1);
    if (base.has(twoLater) && !base.has(between) && weekdayOf(between) !== 0) {
      withCitizens.set(between, "国民の休日");
    }
  }

  /* ---- 振替休日 ----
     日曜と重なった祝日は、その後の「祝日でない最初の日」が休日になります */
  const result = new Map(withCitizens);
  const sundayHolidays = [...withCitizens.keys()]
    .filter((d) => weekdayOf(d) === 0)
    .sort();
  for (const date of sundayHolidays) {
    let next = addDays(date, 1);
    while (result.has(next)) next = addDays(next, 1);
    result.set(next, "振替休日");
  }

  return result;
}

/** 年ごとの計算結果をキャッシュします（毎回計算しないため） */
const cache = new Map<number, Map<string, string>>();

function holidaysOf(year: number): Map<string, string> {
  let found = cache.get(year);
  if (!found) {
    found = buildHolidays(year);
    cache.set(year, found);
  }
  return found;
}

/**
 * 祝日名を返します。祝日でなければ null。
 * 振替休日の計算で年をまたぐことがあるため、前年も確認しています。
 */
export function holidayName(date: string): string | null {
  const { year } = parseDate(date);
  return holidaysOf(year).get(date) ?? holidaysOf(year - 1).get(date) ?? null;
}

/** 祝日かどうか */
export function isHoliday(date: string): boolean {
  return holidayName(date) !== null;
}

/**
 * 「土日祝」の営業時間を使う日かどうか
 * （土曜・日曜・祝日 → 12:00 開店）
 */
export function usesHolidayHours(date: string): boolean {
  const w = weekdayOf(date);
  return w === 0 || w === 6 || isHoliday(date);
}
