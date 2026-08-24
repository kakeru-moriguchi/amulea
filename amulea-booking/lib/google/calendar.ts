/**
 * Google カレンダー連携
 * ==================================================================
 * 役割は2つです。
 *
 *  1. 空き時間の判定に使う「予定が入っている時間帯」を読み取る
 *     - 予約システムが登録した予約
 *     - 管理者が個人的に入れた予定（私用・通院など）も同じく予約不可にします
 *     - 終日予定（例:「休業」）が入っている日は、その日を丸ごと予約不可にします
 *
 *  2. 予約が確定したらイベントを登録する
 *     ★ 個人情報保護のため、タイトルには
 *       「Amulea予約｜メニュー名」しか入れません。
 *       電話番号・自由記載・お名前はカレンダーへ書き込みません。
 *       （詳細は管理画面またはスプレッドシートで確認します）
 */

import { env } from "../config/env";
import type { BusyInterval } from "../domain/types";
import { addDays, toJstIso } from "../util/datetime";
import { googleFetch } from "./auth";

const API = "https://www.googleapis.com/calendar/v3";

/** 予約システムが作ったイベントであることの目印 */
const APP_TAG = "amulea-booking";

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  transparency?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  extendedProperties?: { private?: Record<string, string> };
};

/** 1日分の「予定が入っている状況」 */
export type CalendarDayBusy = {
  /** 終日予定でその日全体が予約不可なら、その理由ラベル */
  allDayBlocked: string | null;
  /** 時間指定の予定 */
  intervals: BusyInterval[];
};

/** ISO 日時文字列を日本時間の「日付」と「0:00からの分」に変換します */
function toJstParts(iso: string): { date: string; minutes: number } {
  const t = new Date(iso).getTime() + 9 * 60 * 60 * 1000;
  const d = new Date(t);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { date, minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/**
 * 指定期間のカレンダー予定を読み取り、日付ごとにまとめます。
 *
 * @param fromDate YYYY-MM-DD（この日を含む）
 * @param toDate   YYYY-MM-DD（この日を含む）
 */
export async function fetchCalendarBusy(
  fromDate: string,
  toDate: string,
): Promise<Map<string, CalendarDayBusy>> {
  const params = new URLSearchParams({
    timeMin: toJstIso(fromDate, 0),
    // 終了日の翌日 0:00 まで
    timeMax: toJstIso(addDays(toDate, 1), 0),
    // 繰り返し予定を1件ずつに展開します
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
    timeZone: "Asia/Tokyo",
  });

  const data = (await googleFetch(
    `${API}/calendars/${encodeURIComponent(env.google.calendarId)}/events?${params}`,
    { method: "GET", label: "events.list" },
  )) as { items?: GoogleEvent[] } | null;

  const result = new Map<string, CalendarDayBusy>();
  const dayOf = (date: string): CalendarDayBusy => {
    let day = result.get(date);
    if (!day) {
      day = { allDayBlocked: null, intervals: [] };
      result.set(date, day);
    }
    return day;
  };

  for (const event of data?.items ?? []) {
    // キャンセル済みの予定は無視します
    if (event.status === "cancelled") continue;
    // 「予定なし（transparent）」の予定は営業の妨げにならないため無視します
    if (event.transparency === "transparent") continue;

    /* ---- 終日予定 → その日を丸ごと予約不可にします ---- */
    if (event.start?.date && event.end?.date) {
      const label = event.summary?.trim() || "休業";
      let date = event.start.date;
      // 終日予定の end.date は「翌日」を指します
      while (date < event.end.date) {
        dayOf(date).allDayBlocked = label;
        date = addDays(date, 1);
      }
      continue;
    }

    /* ---- 時間指定の予定 ---- */
    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    const start = toJstParts(event.start.dateTime);
    const end = toJstParts(event.end.dateTime);

    const isOwn = event.extendedProperties?.private?.app === APP_TAG;
    const label = isOwn ? "予約" : event.summary?.trim() || "予定あり";

    if (start.date === end.date) {
      dayOf(start.date).intervals.push({
        startMin: start.minutes,
        endMin: end.minutes,
        source: "calendar",
        label,
        eventId: event.id,
      });
    } else {
      // 日をまたぐ予定は、日付ごとに切り分けます
      let date = start.date;
      let from = start.minutes;
      while (date < end.date) {
        dayOf(date).intervals.push({
          startMin: from,
          endMin: 1440,
          source: "calendar",
          label,
          eventId: event.id,
        });
        date = addDays(date, 1);
        from = 0;
      }
      if (end.minutes > 0) {
        dayOf(end.date).intervals.push({
          startMin: 0,
          endMin: end.minutes,
          source: "calendar",
          label,
          eventId: event.id,
        });
      }
    }
  }

  return result;
}

/** 1日分だけ取得する簡易版 */
export async function fetchCalendarBusyForDate(date: string): Promise<CalendarDayBusy> {
  const map = await fetchCalendarBusy(date, date);
  return map.get(date) ?? { allDayBlocked: null, intervals: [] };
}

/* ==================================================================
   予約イベントの登録・更新・削除
   ================================================================== */

/** カレンダーへ登録する内容（★ 個人情報は含めません） */
export type CalendarEventInput = {
  reservationId: string;
  menuName: string;
  date: string;
  /** 準備時間を含む枠（0:00 からの分） */
  blockStartMin: number;
  blockEndMin: number;
};

function eventBody(input: CalendarEventInput) {
  return {
    // ★ タイトルにはメニュー名のみ。氏名・電話番号は入れません
    summary: `Amulea予約｜${input.menuName}`,
    // 詳細も最小限にとどめ、実データは管理画面で確認します
    description:
      `この予定は予約システムが自動作成しています。\n` +
      `お客様情報は管理画面でご確認ください。\n` +
      `予約ID: ${input.reservationId}`,
    start: { dateTime: toJstIso(input.date, input.blockStartMin), timeZone: "Asia/Tokyo" },
    end: { dateTime: toJstIso(input.date, input.blockEndMin), timeZone: "Asia/Tokyo" },
    // 非公開の目印。予約システムが作ったイベントを見分けるために使います
    extendedProperties: {
      private: { app: APP_TAG, reservationId: input.reservationId },
    },
    // 通知は管理者の好みで設定できるよう、既定の通知に任せます
    reminders: { useDefault: true },
  };
}

/** 予約イベントを作成し、イベント ID を返します */
export async function createCalendarEvent(input: CalendarEventInput): Promise<string> {
  const data = (await googleFetch(
    `${API}/calendars/${encodeURIComponent(env.google.calendarId)}/events`,
    { method: "POST", body: JSON.stringify(eventBody(input)), label: "events.insert" },
  )) as { id: string };
  return data.id;
}

/** 予約イベントを更新します（日時変更・メニュー変更） */
export async function updateCalendarEvent(
  eventId: string,
  input: CalendarEventInput,
): Promise<void> {
  await googleFetch(
    `${API}/calendars/${encodeURIComponent(env.google.calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PUT", body: JSON.stringify(eventBody(input)), label: "events.update" },
  );
}

/** 予約イベントを削除します（キャンセル時） */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  await googleFetch(
    `${API}/calendars/${encodeURIComponent(env.google.calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", label: "events.delete" },
  );
}

/** 競合している予定の情報（二重予約防止の判定に使います） */
export type ConflictingEvent = {
  id: string;
  /** 予約システムが作ったイベントかどうか */
  isOwn: boolean;
};

/**
 * 指定した時間帯に入っている、自分以外の予定を返します。
 * 予約確定の直前に、サーバー側でもう一度確認するために使います（二重予約防止）。
 *
 * ※ Google カレンダーの events.list は
 *   「timeMin より前に始まり timeMax より後に終わる」予定も返します。
 *   そのため、境界が接しているだけの予定を除くために
 *   こちら側でも重なりを確認しています。
 */
export async function findConflicts(
  date: string,
  startMin: number,
  endMin: number,
  excludeEventId?: string,
): Promise<ConflictingEvent[]> {
  const params = new URLSearchParams({
    timeMin: toJstIso(date, startMin),
    timeMax: toJstIso(date, endMin),
    singleEvents: "true",
    maxResults: "100",
    timeZone: "Asia/Tokyo",
  });

  const data = (await googleFetch(
    `${API}/calendars/${encodeURIComponent(env.google.calendarId)}/events?${params}`,
    { method: "GET", label: "events.list(conflict)" },
  )) as { items?: GoogleEvent[] } | null;

  const conflicts: ConflictingEvent[] = [];

  for (const event of data?.items ?? []) {
    if (event.status === "cancelled") continue;
    if (event.transparency === "transparent") continue;
    if (excludeEventId && event.id === excludeEventId) continue;

    /* 終日予定はその日全体を塞ぎます */
    if (event.start?.date && event.end?.date) {
      conflicts.push({ id: event.id, isOwn: false });
      continue;
    }

    if (!event.start?.dateTime || !event.end?.dateTime) continue;
    const s = toJstParts(event.start.dateTime);
    const e = toJstParts(event.end.dateTime);

    /* 日付が違う分は分単位に補正してから重なりを見ます */
    const toAbs = (part: { date: string; minutes: number }) =>
      part.date === date
        ? part.minutes
        : part.date < date
          ? part.minutes - 1440
          : part.minutes + 1440;

    const eventStart = toAbs(s);
    const eventEnd = toAbs(e);

    // 境界が接しているだけ（前の施術の終了 = 次の開始）は競合としません
    if (eventStart < endMin && startMin < eventEnd) {
      conflicts.push({
        id: event.id,
        isOwn: event.extendedProperties?.private?.app === APP_TAG,
      });
    }
  }

  return conflicts;
}
