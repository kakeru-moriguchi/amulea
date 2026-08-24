/**
 * 空き時間の計算
 * ==================================================================
 * このファイルが予約システムの心臓部です。
 *
 * 「その日のその時間に予約できるか」は、次のすべてを満たすときだけ true です。
 *
 *   1. 予約受付が停止されていない
 *   2. 定休日・臨時休業日ではない
 *   3. Google カレンダーに終日予定（休業など）が入っていない
 *   4. 施術開始が営業開始時刻以降である
 *   5. 施術開始が最終受付時刻（20:00）以前である
 *      ※「20時までに終わる」ではなく「20時までに始める」仕様です
 *   6. 施術終了が営業終了時刻（23:00）以前である
 *      ※ 20:00 開始の 120 分コース（22:00 終了）は予約可能です
 *   7. 準備時間を含めた予約枠が、他の予定と1分も重ならない
 *      ・既存の予約
 *      ・Google カレンダーの個人的な予定
 *      ・管理画面で設定した予約受付停止時間
 *   8. 現在時刻から minAdvanceHours 時間以上先である
 *   9. maxAdvanceDays 日以内である
 */

import type {
  AvailabilityResult,
  BusyInterval,
  DayHours,
  Reservation,
  Settings,
  Slot,
} from "./types";
import { holidayName, usesHolidayHours } from "../util/holidays";
import {
  diffDays,
  nowMinutesJst,
  timeToMinutes,
  minutesToTime,
  todayJst,
  weekdayOf,
} from "../util/datetime";

/** 2つの時間帯が重なっているか（境界が接しているだけなら重ならない扱い） */
export function overlaps(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** その日が休業かどうかと、その理由 */
export type DayStatus = {
  open: boolean;
  /** お客様に表示してよい理由（休業でなければ null） */
  reason: string | null;
  hours: DayHours | null;
  holiday: string | null;
};

/**
 * その日の営業状態を判定します。
 * 優先順位: 特別営業時間 > 臨時休業 > 定休日 > 曜日・祝日による通常営業時間
 */
export function dayStatus(
  date: string,
  settings: Settings,
  calendarAllDayLabel: string | null = null,
): DayStatus {
  const holiday = holidayName(date);

  /* Google カレンダーの終日予定（休業など）が最優先で休業になります */
  if (calendarAllDayLabel) {
    return { open: false, reason: "この日はお休みをいただいております。", hours: null, holiday };
  }

  /* 臨時休業 */
  const closed = settings.closedDates.find((c) => c.date === date);
  if (closed) {
    return {
      open: false,
      reason: closed.reason || "この日はお休みをいただいております。",
      hours: null,
      holiday,
    };
  }

  /* 特別営業時間（臨時休業より後に見るため、休業日の上書きにはなりません） */
  const special = settings.specialHours.find((s) => s.date === date);
  if (special) {
    return {
      open: true,
      reason: null,
      hours: { open: special.open, lastStart: special.lastStart, close: special.close },
      holiday,
    };
  }

  /* 定休日 */
  if (settings.regularClosedWeekdays.includes(weekdayOf(date))) {
    return { open: false, reason: "定休日です。", hours: null, holiday };
  }

  /* 通常営業（土日祝は開店が早くなります） */
  const hours = usesHolidayHours(date) ? settings.holidayHours : settings.weekdayHours;
  return { open: true, reason: null, hours, holiday };
}

/**
 * その日の「埋まっている時間帯」を集めます。
 *
 * @param reservations   その日の有効な予約（キャンセル済みは除外済みであること）
 * @param calendarBusy   Google カレンダーから取得した時間帯
 * @param excludeReservationId 予約変更のとき、自分自身は除外します
 */
export function collectBusy(
  date: string,
  reservations: Reservation[],
  settings: Settings,
  calendarBusy: BusyInterval[] = [],
  excludeReservationId?: string,
): BusyInterval[] {
  const busy: BusyInterval[] = [];

  for (const r of reservations) {
    if (r.date !== date) continue;
    if (r.status === "cancelled") continue;
    if (excludeReservationId && r.id === excludeReservationId) continue;
    busy.push({
      startMin: timeToMinutes(r.blockStartTime),
      endMin: timeToMinutes(r.blockEndTime),
      source: "reservation",
      label: r.menuName,
    });
  }

  for (const b of settings.blockedSlots) {
    if (b.date !== date) continue;
    busy.push({
      startMin: timeToMinutes(b.start),
      endMin: timeToMinutes(b.end),
      source: "blocked",
      label: b.reason || "予約受付停止",
    });
  }

  /*
    Google カレンダーの予定。
    予約システムが登録したイベントは、上の reservations と重複しますが、
    「重なっている＝予約不可」の判定に使うだけなので問題ありません。
    ただし予約変更のときは、自分の予定を除外できないと
    「同じ時間へ変更できない」ことになってしまうため、
    呼び出し元で除外済みのものを渡します。
  */
  busy.push(...calendarBusy);

  return busy;
}

/** 空き時間の計算に必要な入力 */
export type AvailabilityParams = {
  date: string;
  /** 予約したい施術の合計時間（分・オプション込み） */
  durationMin: number;
  settings: Settings;
  /** その日の有効な予約 */
  reservations: Reservation[];
  /** Google カレンダーの時間指定の予定 */
  calendarBusy?: BusyInterval[];
  /** Google カレンダーの終日予定のラベル（あればその日は休業） */
  calendarAllDayLabel?: string | null;
  /** 予約変更時に、自分自身を空きとして扱うための予約 ID */
  excludeReservationId?: string;
  /** 管理者による操作か（直前予約の制限などを緩めます） */
  asAdmin?: boolean;
};

/**
 * 1日分の予約可能枠を計算します。
 * 戻り値には「予約できない枠」も available:false として含みます。
 * お客様の画面では available:true のものだけを表示します。
 */
export function computeAvailability(params: AvailabilityParams): AvailabilityResult {
  const {
    date,
    durationMin,
    settings,
    reservations,
    calendarBusy = [],
    calendarAllDayLabel = null,
    excludeReservationId,
    asAdmin = false,
  } = params;

  const status = dayStatus(date, settings, calendarAllDayLabel);

  const base: AvailabilityResult = {
    date,
    open: status.open,
    closedReason: status.reason,
    holidayName: status.holiday,
    hours: status.hours,
    slots: [],
  };

  /* 予約受付の全面停止（管理者の手動予約は受け付けます） */
  if (!asAdmin && !settings.acceptingReservations) {
    return { ...base, open: false, closedReason: settings.suspendedMessage, slots: [] };
  }

  if (!status.open || !status.hours) return base;

  /* 予約を受け付ける期間の外（管理者は制限を受けません） */
  if (!asAdmin) {
    const daysAhead = diffDays(todayJst(), date);
    if (daysAhead < 0) {
      return { ...base, open: false, closedReason: "過ぎた日付は選択できません。", slots: [] };
    }
    if (daysAhead > settings.maxAdvanceDays) {
      return {
        ...base,
        open: false,
        closedReason: `ご予約は${settings.maxAdvanceDays}日先まで承っております。`,
        slots: [],
      };
    }
  }

  const openMin = timeToMinutes(status.hours.open);
  const lastStartMin = timeToMinutes(status.hours.lastStart);
  const closeMin = timeToMinutes(status.hours.close);

  const busy = collectBusy(
    date,
    reservations,
    settings,
    calendarBusy,
    excludeReservationId,
  );

  /* 「今から何分後以降なら予約できるか」（当日のみ影響します） */
  const isToday = date === todayJst();
  const earliestTodayMin = isToday
    ? nowMinutesJst() + (asAdmin ? 0 : settings.minAdvanceHours * 60)
    : -Infinity;

  const step = Math.max(5, settings.slotIntervalMin);
  const slots: Slot[] = [];

  for (let start = openMin; start <= lastStartMin; start += step) {
    const treatmentEnd = start + durationMin;

    /* 施術が営業終了時刻を超える場合は予約できません */
    if (treatmentEnd > closeMin) {
      slots.push({ time: minutesToTime(start), available: false });
      continue;
    }

    /* 当日の直前予約の制限 */
    if (start < earliestTodayMin) {
      slots.push({ time: minutesToTime(start), available: false });
      continue;
    }

    /* 準備・片付け時間を含めた、実際に押さえる枠 */
    const blockStart = start - settings.bufferBeforeMin;
    const blockEnd = treatmentEnd + settings.bufferAfterMin;

    const conflict = busy.some((b) => overlaps(blockStart, blockEnd, b.startMin, b.endMin));
    slots.push({ time: minutesToTime(start), available: !conflict });
  }

  return { ...base, slots };
}

/**
 * 指定した開始時刻が本当に予約可能かを確認します。
 * 予約の確定直前に、サーバー側でもう一度検証するために使います。
 */
export function isSlotAvailable(
  startTime: string,
  params: AvailabilityParams,
): boolean {
  const result = computeAvailability(params);
  if (!result.open) return false;
  return result.slots.some((s) => s.time === startTime && s.available);
}

/** 予約枠（準備時間込み）の開始・終了を計算します */
export function calcBlock(
  startTime: string,
  durationMin: number,
  settings: Settings,
): { startMin: number; endMin: number; blockStartMin: number; blockEndMin: number } {
  const startMin = timeToMinutes(startTime);
  const endMin = startMin + durationMin;
  return {
    startMin,
    endMin,
    blockStartMin: startMin - settings.bufferBeforeMin,
    blockEndMin: endMin + settings.bufferAfterMin,
  };
}
