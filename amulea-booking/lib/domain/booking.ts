/**
 * 予約サービス（新規・変更・キャンセル）
 * ==================================================================
 * 予約に関する「決まりごと」はすべてここに集約しています。
 * 画面（app/）や API ルートは、ここを呼ぶだけです。
 *
 * ★★ 二重予約の防止について ★★
 *
 * 「フロント画面で空いていたから予約できる」では不十分です。
 * 表示してから確定するまでの数十秒のあいだに、
 * 別のお客様が同じ枠を取ってしまうことがあるためです。
 *
 * そこで確定処理では、次の順序で必ずサーバー側から確認します。
 *
 *   1. 同一サーバー内の処理を1件ずつに直列化する（ロック）
 *   2. 空き時間をもう一度計算し直す（保存済み予約 + カレンダー）
 *   3. 先に Google カレンダーへイベントを作成して「場所を取る」
 *   4. 作成した直後にもう一度カレンダーを問い合わせ、
 *      自分以外の予定が重なっていないか確認する
 *   5. 重なっていたら、作ったイベントを削除して予約を失敗させる
 *
 * 4 の再確認により、複数のサーバー（Vercel は複数インスタンスで動きます）
 * から同時に予約が入った場合でも、必ず片方だけが成立します。
 * どちらが勝つかは「イベント ID の小さい方」で決めるため、
 * 両方が同時に諦めてしまうことはありません。
 */

import {
  isGoogleEnabled,
  isLineMessagingEnabled,
} from "../config/env";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  fetchCalendarBusy,
  fetchCalendarBusyForDate,
  findConflicts,
  updateCalendarEvent,
  type CalendarDayBusy,
} from "../google/calendar";
import * as messages from "../line/messages";
import { notifyAdmins, notifyCustomer } from "../line/messaging";
import { log, maskId, maskUserId } from "../security/logger";
import { getStore } from "../store";
import {
  addDays,
  minutesToTime,
  nowIso,
  timeToMinutes,
  todayJst,
  nowMinutesJst,
  diffDays,
} from "../util/datetime";
import { newId } from "../util/id";
import { calcBlock, computeAvailability, dayStatus } from "./availability";
import type {
  AvailabilityResult,
  BusyInterval,
  Menu,
  Option,
  Reservation,
  ReservationInput,
  Settings,
} from "./types";

/* ==================================================================
   結果の型
   ================================================================== */

export type BookingErrorCode =
  | "invalid"
  | "unavailable"
  | "conflict"
  | "not_found"
  | "forbidden"
  | "deadline"
  | "suspended";

export type BookingError = { code: BookingErrorCode; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: BookingError };

function fail(code: BookingErrorCode, message: string): { ok: false; error: BookingError } {
  return { ok: false, error: { code, message } };
}

/** 二重予約が起きたときにお客様へ表示する文言 */
const CONFLICT_MESSAGE =
  "申し訳ありません。この時間は先ほど他のお客様の予約が入りました。\n別のお時間をお選びください。";

/* ==================================================================
   同一サーバー内のロック
   ================================================================== */

/**
 * 同じサーバーで同時に走る予約処理を1件ずつに直列化します。
 * （Vercel が複数インスタンスに分かれた場合は、
 *   上記のカレンダー再確認が最後の砦になります）
 */
let lockChain: Promise<unknown> = Promise.resolve();

function withLock<T>(task: () => Promise<T>): Promise<T> {
  const run = lockChain.then(task, task);
  // 例外でチェーンが止まらないようにします
  lockChain = run.catch(() => undefined);
  return run;
}

/* ==================================================================
   メニュー・オプションの取り出し
   ================================================================== */

export type Priced = {
  menu: Menu;
  options: Option[];
  totalDurationMin: number;
  totalPrice: number;
  optionPrice: number;
};

/** メニュー ID とオプション ID から、時間と料金を計算します */
export function priceOf(
  menus: Menu[],
  options: Option[],
  menuId: string,
  optionIds: string[],
  allowHidden = false,
): Priced | null {
  const menu = menus.find((m) => m.id === menuId && (allowHidden || m.visible));
  if (!menu) return null;

  const chosen = options.filter(
    (o) => optionIds.includes(o.id) && (allowHidden || o.visible),
  );
  // 存在しないオプション ID が混ざっていたら不正な入力として扱います
  if (chosen.length !== optionIds.length) return null;

  const optionPrice = chosen.reduce((sum, o) => sum + o.price, 0);
  const extra = chosen.reduce((sum, o) => sum + o.extraDurationMin, 0);

  return {
    menu,
    options: chosen,
    optionPrice,
    totalDurationMin: menu.durationMin + extra,
    totalPrice: menu.price + optionPrice,
  };
}

/* ==================================================================
   空き時間の取得
   ================================================================== */

export type AvailabilityQuery = {
  date: string;
  menuId: string;
  optionIds: string[];
  /** 予約変更のとき、自分自身の枠は空きとして扱います */
  excludeReservationId?: string;
  asAdmin?: boolean;
};

/**
 * Google カレンダーの予定を取得します。
 * 連携していない（モードモード）ときは空を返し、
 * 保存済みの予約だけで空き時間を計算します。
 */
async function loadCalendar(
  fromDate: string,
  toDate: string,
): Promise<Map<string, CalendarDayBusy>> {
  if (!isGoogleEnabled()) return new Map();
  try {
    return await fetchCalendarBusy(fromDate, toDate);
  } catch (error) {
    /*
      カレンダーが読めないときは、安全側に倒して
      「予約を受け付けない」ようにはしません。
      保存済みの予約データだけで判定を続けます。
      （管理者が気づけるようログには残します）
    */
    log.error("Google カレンダーの読み取りに失敗（予約データのみで判定します）", error);
    return new Map();
  }
}

/** カレンダーの予定から、自分自身のイベントを取り除きます */
function withoutOwnEvent(
  intervals: BusyInterval[],
  eventId: string | null | undefined,
): BusyInterval[] {
  if (!eventId) return intervals;
  return intervals.filter((i) => i.eventId !== eventId);
}

/** 1日分の予約可能枠を返します */
export async function getAvailability(
  query: AvailabilityQuery,
): Promise<Result<AvailabilityResult & { totalDurationMin: number; totalPrice: number }>> {
  const store = getStore();
  const [settings, menus, options] = await Promise.all([
    store.getSettings(),
    store.listMenus(),
    store.listOptions(),
  ]);

  const priced = priceOf(menus, options, query.menuId, query.optionIds, query.asAdmin);
  if (!priced) return fail("invalid", "メニューの指定が正しくありません。");

  const [reservations, calendar] = await Promise.all([
    store.listReservations({ date: query.date }),
    loadCalendar(query.date, query.date),
  ]);

  const day = calendar.get(query.date);

  /* 予約変更のときは、自分の予定を「空き」として扱います */
  let excludeEventId: string | null = null;
  if (query.excludeReservationId) {
    const own = await store.getReservation(query.excludeReservationId);
    excludeEventId = own?.googleCalendarEventId ?? null;
  }

  const result = computeAvailability({
    date: query.date,
    durationMin: priced.totalDurationMin,
    settings,
    reservations,
    calendarBusy: withoutOwnEvent(day?.intervals ?? [], excludeEventId),
    calendarAllDayLabel: day?.allDayBlocked ?? null,
    excludeReservationId: query.excludeReservationId,
    asAdmin: query.asAdmin,
  });

  return {
    ok: true,
    value: {
      ...result,
      totalDurationMin: priced.totalDurationMin,
      totalPrice: priced.totalPrice,
    },
  };
}

/**
 * カレンダー表示用に、日付ごとの「予約できる枠があるか」を返します。
 * 1か月分をまとめて計算するため、Google への問い合わせは1回で済みます。
 */
export async function getMonthAvailability(
  fromDate: string,
  toDate: string,
  menuId: string,
  optionIds: string[],
  asAdmin = false,
): Promise<Result<Record<string, { open: boolean; hasSlot: boolean; holiday: string | null }>>> {
  const store = getStore();
  const [settings, menus, options] = await Promise.all([
    store.getSettings(),
    store.listMenus(),
    store.listOptions(),
  ]);

  const priced = priceOf(menus, options, menuId, optionIds, asAdmin);
  if (!priced) return fail("invalid", "メニューの指定が正しくありません。");

  const [reservations, calendar] = await Promise.all([
    store.listReservations({ from: fromDate, to: toDate }),
    loadCalendar(fromDate, toDate),
  ]);

  const result: Record<string, { open: boolean; hasSlot: boolean; holiday: string | null }> =
    {};

  for (let date = fromDate; date <= toDate; date = addDays(date, 1)) {
    const day = calendar.get(date);
    const availability = computeAvailability({
      date,
      durationMin: priced.totalDurationMin,
      settings,
      reservations: reservations.filter((r) => r.date === date),
      calendarBusy: day?.intervals ?? [],
      calendarAllDayLabel: day?.allDayBlocked ?? null,
      asAdmin,
    });
    result[date] = {
      open: availability.open,
      hasSlot: availability.slots.some((s) => s.available),
      holiday: availability.holidayName,
    };
  }

  return { ok: true, value: result };
}

/* ==================================================================
   予約の作成
   ================================================================== */

/** 予約レコードを組み立てます */
function buildReservation(
  input: ReservationInput,
  priced: Priced,
  settings: Settings,
  id: string,
): Reservation {
  const block = calcBlock(input.startTime, priced.totalDurationMin, settings);
  const now = nowIso();

  return {
    id,
    lineUserId: input.lineUserId,
    customerName: input.customerName,
    phone: input.phone,
    menuId: priced.menu.id,
    menuName: priced.menu.name,
    menuDurationMin: priced.menu.durationMin,
    menuPrice: priced.menu.price,
    optionIds: priced.options.map((o) => o.id),
    optionNames: priced.options.map((o) => o.name),
    optionPrice: priced.optionPrice,
    totalDurationMin: priced.totalDurationMin,
    totalPrice: priced.totalPrice,
    date: input.date,
    startTime: minutesToTime(block.startMin),
    endTime: minutesToTime(block.endMin),
    blockStartTime: minutesToTime(block.blockStartMin),
    blockEndTime: minutesToTime(block.blockEndMin),
    note: input.note,
    status: "confirmed",
    source: input.source,
    googleCalendarEventId: null,
    createdAt: now,
    updatedAt: now,
    cancelledAt: null,
  };
}

/**
 * Google カレンダーへ枠を確保します（二重予約防止の要）。
 *
 * 手順
 *   1. イベントを作成する
 *   2. 直後にもう一度、その時間帯を問い合わせる
 *   3. 自分以外の予定があれば、作成したイベントを消して失敗を返す
 *
 * 戻り値: 確保できたらイベント ID、できなければ null
 */
async function claimCalendarSlot(
  reservation: Reservation,
  blockStartMin: number,
  blockEndMin: number,
): Promise<{ ok: true; eventId: string | null } | { ok: false }> {
  if (!isGoogleEnabled()) return { ok: true, eventId: null };

  let eventId: string;
  try {
    eventId = await createCalendarEvent({
      reservationId: reservation.id,
      menuName: reservation.menuName,
      date: reservation.date,
      blockStartMin,
      blockEndMin,
    });
  } catch (error) {
    log.error("カレンダーへの登録に失敗", error, { reservation: maskId(reservation.id) });
    throw error;
  }

  /* ---- 作成直後の再確認 ---- */
  try {
    const conflicts = await findConflicts(
      reservation.date,
      blockStartMin,
      blockEndMin,
      eventId,
    );

    /*
      勝敗の決め方
        ・予約以外の予定（管理者の私用など）が重なっていたら、必ず自分が譲る
        ・予約どうしがぶつかった場合は「イベント ID が小さい方」が勝つ
          → 両者が同じ規則で判断するため、必ず片方だけが成立します
    */
    const mustYield = conflicts.some((c) => !c.isOwn || c.id < eventId);

    if (mustYield) {
      await deleteCalendarEvent(eventId).catch((error) =>
        log.error("競合時のイベント削除に失敗", error, {
          reservation: maskId(reservation.id),
        }),
      );
      log.warn("二重予約を検出したため予約を中止しました", {
        reservation: maskId(reservation.id),
        date: reservation.date,
        start: reservation.startTime,
      });
      return { ok: false };
    }
  } catch (error) {
    /* 再確認そのものが失敗した場合は、安全側に倒して予約を取り消します */
    log.error("二重予約チェックに失敗したため予約を中止しました", error, {
      reservation: maskId(reservation.id),
    });
    await deleteCalendarEvent(eventId).catch(() => undefined);
    throw error;
  }

  return { ok: true, eventId };
}

/** 予約を作成します */
export async function createReservation(
  input: ReservationInput,
): Promise<Result<Reservation>> {
  return withLock(async () => {
    const store = getStore();
    const [settings, menus, options] = await Promise.all([
      store.getSettings(),
      store.listMenus(),
      store.listOptions(),
    ]);

    const isAdmin = input.source === "admin";

    if (!isAdmin && !settings.acceptingReservations) {
      return fail("suspended", settings.suspendedMessage);
    }

    const priced = priceOf(menus, options, input.menuId, input.optionIds, isAdmin);
    if (!priced) return fail("invalid", "メニューの指定が正しくありません。");

    /* ---- サーバー側でもう一度、空き状況を確認します ---- */
    const availability = await getAvailability({
      date: input.date,
      menuId: input.menuId,
      optionIds: input.optionIds,
      asAdmin: isAdmin,
    });
    if (!availability.ok) return availability;

    if (!availability.value.open) {
      return fail(
        "unavailable",
        availability.value.closedReason ?? "この日はご予約を承っておりません。",
      );
    }

    const slot = availability.value.slots.find((s) => s.time === input.startTime);
    if (!slot) return fail("invalid", "選択された時間はご予約いただけません。");
    if (!slot.available) return fail("conflict", CONFLICT_MESSAGE);

    /* ---- カレンダーへ枠を確保（ここで最終的な勝敗が決まります） ---- */
    const reservation = buildReservation(input, priced, settings, newId());
    const block = calcBlock(input.startTime, priced.totalDurationMin, settings);

    let claimed: { ok: true; eventId: string | null } | { ok: false };
    try {
      claimed = await claimCalendarSlot(reservation, block.blockStartMin, block.blockEndMin);
    } catch {
      return fail(
        "unavailable",
        "ただいま予約を確定できませんでした。恐れ入りますが、もう一度お試しください。",
      );
    }
    if (!claimed.ok) return fail("conflict", CONFLICT_MESSAGE);

    reservation.googleCalendarEventId = claimed.eventId;

    /* ---- 保存 ---- */
    try {
      await store.createReservation(reservation);
    } catch (error) {
      log.error("予約の保存に失敗", error, { reservation: maskId(reservation.id) });
      // 保存できなかったのにカレンダーだけ残るのを防ぎます
      if (claimed.eventId) await deleteCalendarEvent(claimed.eventId).catch(() => undefined);
      return fail(
        "unavailable",
        "ただいま予約を確定できませんでした。恐れ入りますが、もう一度お試しください。",
      );
    }

    log.info("予約を作成しました", {
      reservation: maskId(reservation.id),
      user: maskUserId(reservation.lineUserId),
      date: reservation.date,
      start: reservation.startTime,
      source: reservation.source,
    });

    /* ---- LINE 通知（失敗しても予約は成立させます） ---- */
    void sendCreateNotifications(reservation, settings);

    return { ok: true, value: reservation };
  });
}

async function sendCreateNotifications(r: Reservation, settings: Settings): Promise<void> {
  try {
    if (settings.notify.customerOnCreate) {
      await notifyCustomer(r.id, r.lineUserId, messages.customerCreated(r));
    }
    if (settings.notify.adminOnCreate) {
      await notifyAdmins(messages.adminCreated(r));
    }
  } catch (error) {
    log.error("予約完了通知の送信に失敗", error, { reservation: maskId(r.id) });
  }
}

/* ==================================================================
   予約の変更
   ================================================================== */

export type ChangeInput = {
  date: string;
  startTime: string;
  /** メニューを変えない場合は省略できます */
  menuId?: string;
  optionIds?: string[];
};

/** 変更・キャンセルの受付期限を過ぎていないか */
function isPastDeadline(r: Reservation, settings: Settings, asAdmin: boolean): boolean {
  if (asAdmin) return false;
  const days = diffDays(todayJst(), r.date);
  if (days < 0) return true;
  const minutesUntil = days * 1440 + timeToMinutes(r.startTime) - nowMinutesJst();
  return minutesUntil < settings.changeDeadlineHours * 60;
}

/**
 * 予約日時（およびメニュー）を変更します。
 *
 * @param actorLineUserId お客様が操作する場合の LINE userId。
 *                        管理者操作のときは null を渡してください。
 */
export async function changeReservation(
  reservationId: string,
  input: ChangeInput,
  actorLineUserId: string | null,
): Promise<Result<{ before: Reservation; after: Reservation }>> {
  return withLock(async () => {
    const store = getStore();
    const asAdmin = actorLineUserId === null;

    const before = await store.getReservation(reservationId);
    if (!before) return fail("not_found", "予約が見つかりませんでした。");

    /* ★ 本人確認（サーバー側）。他人の予約は変更できません */
    if (!asAdmin && before.lineUserId !== actorLineUserId) {
      return fail("forbidden", "この予約を操作する権限がありません。");
    }
    if (before.status === "cancelled") {
      return fail("invalid", "キャンセル済みの予約は変更できません。");
    }

    const [settings, menus, options] = await Promise.all([
      store.getSettings(),
      store.listMenus(),
      store.listOptions(),
    ]);

    if (isPastDeadline(before, settings, asAdmin)) {
      return fail(
        "deadline",
        `ご予約の変更は${settings.changeDeadlineHours}時間前までとなります。恐れ入りますが、公式LINEよりご連絡ください。`,
      );
    }

    const menuId = input.menuId ?? before.menuId;
    const optionIds = input.optionIds ?? before.optionIds;
    // 既存予約のメニューが非表示になっていても変更できるようにします
    const priced = priceOf(menus, options, menuId, optionIds, true);
    if (!priced) return fail("invalid", "メニューの指定が正しくありません。");

    /* ---- 変更先の空き確認（自分自身は空きとして扱います） ---- */
    const availability = await getAvailability({
      date: input.date,
      menuId,
      optionIds,
      excludeReservationId: before.id,
      asAdmin,
    });
    if (!availability.ok) return availability;

    if (!availability.value.open) {
      return fail(
        "unavailable",
        availability.value.closedReason ?? "この日はご予約を承っておりません。",
      );
    }
    const slot = availability.value.slots.find((s) => s.time === input.startTime);
    if (!slot) return fail("invalid", "選択された時間はご予約いただけません。");
    if (!slot.available) return fail("conflict", CONFLICT_MESSAGE);

    /* ---- 予約内容を作り直します（ID と userId は変えません） ---- */
    const block = calcBlock(input.startTime, priced.totalDurationMin, settings);
    const after: Reservation = {
      ...before,
      menuId: priced.menu.id,
      menuName: priced.menu.name,
      menuDurationMin: priced.menu.durationMin,
      menuPrice: priced.menu.price,
      optionIds: priced.options.map((o) => o.id),
      optionNames: priced.options.map((o) => o.name),
      optionPrice: priced.optionPrice,
      totalDurationMin: priced.totalDurationMin,
      totalPrice: priced.totalPrice,
      date: input.date,
      startTime: minutesToTime(block.startMin),
      endTime: minutesToTime(block.endMin),
      blockStartTime: minutesToTime(block.blockStartMin),
      blockEndTime: minutesToTime(block.blockEndMin),
      updatedAt: nowIso(),
    };

    /* ---- カレンダーの更新 ---- */
    if (isGoogleEnabled()) {
      try {
        if (before.googleCalendarEventId) {
          /*
            既存のイベントを新しい時間へ動かしてから、重なりを再確認します。
            自分自身は除外して確認するため、同じ枠への「メニューだけ変更」も通ります。
          */
          await updateCalendarEvent(before.googleCalendarEventId, {
            reservationId: after.id,
            menuName: after.menuName,
            date: after.date,
            blockStartMin: block.blockStartMin,
            blockEndMin: block.blockEndMin,
          });

          const conflicts = await findConflicts(
            after.date,
            block.blockStartMin,
            block.blockEndMin,
            before.googleCalendarEventId,
          );

          if (conflicts.length > 0) {
            /* 元の時間へ戻します */
            await updateCalendarEvent(before.googleCalendarEventId, {
              reservationId: before.id,
              menuName: before.menuName,
              date: before.date,
              blockStartMin: timeToMinutes(before.blockStartTime),
              blockEndMin: timeToMinutes(before.blockEndTime),
            }).catch((error) =>
              log.error("変更取り消し時のカレンダー復元に失敗", error, {
                reservation: maskId(before.id),
              }),
            );
            return fail("conflict", CONFLICT_MESSAGE);
          }
        } else {
          /* まだイベントが無い予約（連携前に入った予約）は、ここで作成します */
          const claimed = await claimCalendarSlot(
            after,
            block.blockStartMin,
            block.blockEndMin,
          );
          if (!claimed.ok) return fail("conflict", CONFLICT_MESSAGE);
          after.googleCalendarEventId = claimed.eventId;
        }
      } catch (error) {
        log.error("カレンダーの更新に失敗", error, { reservation: maskId(before.id) });
        return fail(
          "unavailable",
          "ただいま変更を確定できませんでした。恐れ入りますが、もう一度お試しください。",
        );
      }
    }

    await store.updateReservation(after);

    log.info("予約を変更しました", {
      reservation: maskId(after.id),
      from: `${before.date} ${before.startTime}`,
      to: `${after.date} ${after.startTime}`,
      byAdmin: asAdmin,
    });

    void sendChangeNotifications(before, after, settings);

    return { ok: true, value: { before, after } };
  });
}

async function sendChangeNotifications(
  before: Reservation,
  after: Reservation,
  settings: Settings,
): Promise<void> {
  try {
    if (settings.notify.customerOnChange) {
      /* ★ 通知先は必ず「予約データに保存されている userId」です */
      await notifyCustomer(after.id, after.lineUserId, messages.customerChanged(after));
    }
    if (settings.notify.adminOnChange) {
      await notifyAdmins(messages.adminChanged(before, after));
    }
  } catch (error) {
    log.error("変更通知の送信に失敗", error, { reservation: maskId(after.id) });
  }
}

/* ==================================================================
   予約のキャンセル
   ================================================================== */

export async function cancelReservation(
  reservationId: string,
  actorLineUserId: string | null,
): Promise<Result<Reservation>> {
  return withLock(async () => {
    const store = getStore();
    const asAdmin = actorLineUserId === null;

    const found = await store.getReservation(reservationId);
    if (!found) return fail("not_found", "予約が見つかりませんでした。");

    /* ★ 本人確認（サーバー側） */
    if (!asAdmin && found.lineUserId !== actorLineUserId) {
      return fail("forbidden", "この予約を操作する権限がありません。");
    }
    if (found.status === "cancelled") {
      return { ok: true, value: found };
    }

    const settings = await store.getSettings();
    if (isPastDeadline(found, settings, asAdmin)) {
      return fail(
        "deadline",
        `キャンセルは${settings.changeDeadlineHours}時間前までとなります。恐れ入りますが、公式LINEよりご連絡ください。`,
      );
    }

    /* ---- カレンダーから削除して、枠を空けます ---- */
    if (isGoogleEnabled() && found.googleCalendarEventId) {
      try {
        await deleteCalendarEvent(found.googleCalendarEventId);
      } catch (error) {
        /*
          既に手動で消されている場合も 404 で失敗します。
          その場合もキャンセル自体は成立させます。
        */
        log.error("カレンダーのイベント削除に失敗（キャンセルは継続）", error, {
          reservation: maskId(found.id),
        });
      }
    }

    const now = nowIso();
    const cancelled: Reservation = {
      ...found,
      status: "cancelled",
      googleCalendarEventId: null,
      updatedAt: now,
      cancelledAt: now,
    };

    await store.updateReservation(cancelled);

    log.info("予約をキャンセルしました", {
      reservation: maskId(cancelled.id),
      date: cancelled.date,
      start: cancelled.startTime,
      byAdmin: asAdmin,
    });

    void sendCancelNotifications(cancelled, settings, asAdmin);

    return { ok: true, value: cancelled };
  });
}

async function sendCancelNotifications(
  r: Reservation,
  settings: Settings,
  byAdmin: boolean,
): Promise<void> {
  try {
    if (settings.notify.customerOnCancel) {
      await notifyCustomer(r.id, r.lineUserId, messages.customerCancelled(r));
    }
    if (settings.notify.adminOnCancel) {
      await notifyAdmins(messages.adminCancelled(r, byAdmin));
    }
  } catch (error) {
    log.error("キャンセル通知の送信に失敗", error, { reservation: maskId(r.id) });
  }
}

/* ==================================================================
   参照系
   ================================================================== */

/**
 * ログイン中のお客様の予約だけを返します。
 * ★ 引数の lineUserId は必ずセッションから取得したものを渡してください。
 */
export async function listMyReservations(lineUserId: string): Promise<Reservation[]> {
  if (!lineUserId) return [];
  const store = getStore();
  return store.listReservations({ lineUserId, includeCancelled: true });
}

/**
 * 予約を1件取得します（本人のものだけ）。
 * URL の予約 ID を書き換えても、他人の予約は取得できません。
 */
export async function getMyReservation(
  reservationId: string,
  lineUserId: string,
): Promise<Reservation | null> {
  if (!lineUserId) return null;
  const store = getStore();
  const found = await store.getReservation(reservationId);
  if (!found) return null;
  if (found.lineUserId !== lineUserId) return null;
  return found;
}

/** その日の予定（管理画面のカレンダー表示用） */
export async function getAdminDay(date: string): Promise<{
  reservations: Reservation[];
  calendar: CalendarDayBusy;
  settings: Settings;
  status: ReturnType<typeof dayStatus>;
}> {
  const store = getStore();
  const [settings, reservations] = await Promise.all([
    store.getSettings(),
    store.listReservations({ date, includeCancelled: true }),
  ]);

  let calendar: CalendarDayBusy = { allDayBlocked: null, intervals: [] };
  if (isGoogleEnabled()) {
    try {
      calendar = await fetchCalendarBusyForDate(date);
    } catch (error) {
      log.error("管理画面のカレンダー取得に失敗", error);
    }
  }

  return {
    reservations,
    calendar,
    settings,
    status: dayStatus(date, settings, calendar.allDayBlocked),
  };
}

/** 連携状態（管理画面に表示します） */
export function integrationStatus() {
  return {
    googleCalendar: isGoogleEnabled(),
    lineMessaging: isLineMessagingEnabled(),
  };
}
