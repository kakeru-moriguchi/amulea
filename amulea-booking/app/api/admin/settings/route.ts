/**
 * /api/admin/settings
 * ------------------------------------------------------------------
 * GET … 現在の営業設定
 * PUT … 営業設定の更新（営業時間・準備時間・休業日・受付停止・通知）
 *
 * ★ 受け取った値はすべて検証してから保存します。
 *   「営業終了より遅い営業開始」などの矛盾した設定を弾きます。
 */

import { error, guardMutation, handle, ok, requireAdmin } from "@/lib/api/http";
import { withSettingsDefaults } from "@/lib/domain/defaults";
import type { BlockedSlot, ClosedDate, DayHours, Settings, SpecialHours } from "@/lib/domain/types";
import { getStore } from "@/lib/store";
import { isRealDate, isTimeString, timeToMinutes } from "@/lib/util/datetime";
import { cleanLine, readJson } from "@/lib/security/validation";
import { newId } from "@/lib/util/id";

export const dynamic = "force-dynamic";

/** 選べる準備時間（分） */
const ALLOWED_BUFFERS = [0, 15, 30, 45, 60];

export async function GET(): Promise<Response> {
  return handle("admin.settings.get", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return ok({ settings: await getStore().getSettings() });
  });
}

/** 営業時間の検証（開店 < 最終受付 <= 閉店） */
function parseHours(input: unknown, fallback: DayHours): DayHours | string {
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Record<string, unknown>;

  const open = isTimeString(raw.open) ? raw.open : fallback.open;
  const lastStart = isTimeString(raw.lastStart) ? raw.lastStart : fallback.lastStart;
  const close = isTimeString(raw.close) ? raw.close : fallback.close;

  if (timeToMinutes(open) >= timeToMinutes(close)) {
    return "営業開始時刻は営業終了時刻より前にしてください。";
  }
  if (timeToMinutes(lastStart) < timeToMinutes(open)) {
    return "最終受付時刻は営業開始時刻より後にしてください。";
  }
  if (timeToMinutes(lastStart) > timeToMinutes(close)) {
    return "最終受付時刻は営業終了時刻より前にしてください。";
  }
  return { open, lastStart, close };
}

export async function PUT(request: Request): Promise<Response> {
  return handle("admin.settings.put", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;

    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const store = getStore();
    const current = await store.getSettings();
    const body = await readJson(request);

    const weekday = parseHours(body.weekdayHours, current.weekdayHours);
    if (typeof weekday === "string") return error(400, `平日: ${weekday}`, "invalid");

    const holiday = parseHours(body.holidayHours, current.holidayHours);
    if (typeof holiday === "string") return error(400, `土日祝: ${holiday}`, "invalid");

    /* ---- 準備時間 ---- */
    const bufferBefore = Number(body.bufferBeforeMin ?? current.bufferBeforeMin);
    const bufferAfter = Number(body.bufferAfterMin ?? current.bufferAfterMin);
    if (!ALLOWED_BUFFERS.includes(bufferBefore) || !ALLOWED_BUFFERS.includes(bufferAfter)) {
      return error(400, "準備時間は 0 / 15 / 30 / 45 / 60 分から選んでください。", "invalid");
    }

    /* ---- 予約枠の刻み ---- */
    const slotInterval = Number(body.slotIntervalMin ?? current.slotIntervalMin);
    if (![10, 15, 20, 30, 60].includes(slotInterval)) {
      return error(400, "予約枠の刻みは 10 / 15 / 20 / 30 / 60 分から選んでください。", "invalid");
    }

    /* ---- 定休日 ---- */
    const regularClosed = Array.isArray(body.regularClosedWeekdays)
      ? [...new Set(body.regularClosedWeekdays.map(Number))].filter(
          (n) => Number.isInteger(n) && n >= 0 && n <= 6,
        )
      : current.regularClosedWeekdays;
    if (regularClosed.length >= 7) {
      return error(400, "すべての曜日を定休日にすることはできません。", "invalid");
    }

    /* ---- 臨時休業日 ---- */
    const closedDates: ClosedDate[] = Array.isArray(body.closedDates)
      ? body.closedDates
          .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object")
          .filter((c) => isRealDate(String(c.date)))
          .slice(0, 400)
          .map((c) => ({
            date: String(c.date),
            reason: cleanLine(c.reason, 60) || "お休みをいただいております。",
          }))
      : current.closedDates;

    /* ---- 特別営業時間 ---- */
    const specialHours: SpecialHours[] = [];
    if (Array.isArray(body.specialHours)) {
      for (const raw of body.specialHours.slice(0, 400)) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        if (!isRealDate(String(item.date))) continue;
        const hours = parseHours(item, current.weekdayHours);
        if (typeof hours === "string") {
          return error(400, `${String(item.date)}: ${hours}`, "invalid");
        }
        specialHours.push({
          date: String(item.date),
          label: cleanLine(item.label, 40),
          ...hours,
        });
      }
    } else {
      specialHours.push(...current.specialHours);
    }

    /* ---- 予約受付停止の時間帯 ---- */
    const blockedSlots: BlockedSlot[] = [];
    if (Array.isArray(body.blockedSlots)) {
      for (const raw of body.blockedSlots.slice(0, 500)) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        if (!isRealDate(String(item.date))) continue;
        if (!isTimeString(item.start) || !isTimeString(item.end)) continue;
        if (timeToMinutes(item.start) >= timeToMinutes(item.end)) {
          return error(400, "受付停止の開始時刻は終了時刻より前にしてください。", "invalid");
        }
        blockedSlots.push({
          id: typeof item.id === "string" && item.id ? item.id.slice(0, 64) : newId(),
          date: String(item.date),
          start: item.start,
          end: item.end,
          reason: cleanLine(item.reason, 60),
        });
      }
    } else {
      blockedSlots.push(...current.blockedSlots);
    }

    /* ---- 受付期間 ---- */
    const maxAdvanceDays = Number(body.maxAdvanceDays ?? current.maxAdvanceDays);
    const minAdvanceHours = Number(body.minAdvanceHours ?? current.minAdvanceHours);
    const changeDeadlineHours = Number(
      body.changeDeadlineHours ?? current.changeDeadlineHours,
    );
    if (
      !Number.isInteger(maxAdvanceDays) ||
      maxAdvanceDays < 1 ||
      maxAdvanceDays > 365 ||
      !Number.isInteger(minAdvanceHours) ||
      minAdvanceHours < 0 ||
      minAdvanceHours > 168 ||
      !Number.isInteger(changeDeadlineHours) ||
      changeDeadlineHours < 0 ||
      changeDeadlineHours > 168
    ) {
      return error(400, "受付期間の指定が正しくありません。", "invalid");
    }

    const notifyInput =
      body.notify && typeof body.notify === "object"
        ? (body.notify as Record<string, unknown>)
        : {};
    const flag = (key: keyof Settings["notify"]) =>
      typeof notifyInput[key] === "boolean"
        ? (notifyInput[key] as boolean)
        : current.notify[key];

    const next: Settings = withSettingsDefaults({
      ...current,
      weekdayHours: weekday,
      holidayHours: holiday,
      slotIntervalMin: slotInterval,
      bufferBeforeMin: bufferBefore,
      bufferAfterMin: bufferAfter,
      regularClosedWeekdays: regularClosed,
      closedDates,
      specialHours,
      blockedSlots,
      acceptingReservations:
        typeof body.acceptingReservations === "boolean"
          ? body.acceptingReservations
          : current.acceptingReservations,
      suspendedMessage:
        cleanLine(body.suspendedMessage, 200) || current.suspendedMessage,
      maxAdvanceDays,
      minAdvanceHours,
      changeDeadlineHours,
      notify: {
        customerOnCreate: flag("customerOnCreate"),
        customerOnChange: flag("customerOnChange"),
        customerOnCancel: flag("customerOnCancel"),
        adminOnCreate: flag("adminOnCreate"),
        adminOnChange: flag("adminOnChange"),
        adminOnCancel: flag("adminOnCancel"),
      },
    });

    await store.saveSettings(next);
    return ok({ settings: next });
  });
}
