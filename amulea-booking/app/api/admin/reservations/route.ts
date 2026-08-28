/**
 * /api/admin/reservations
 * ------------------------------------------------------------------
 * GET  … 予約一覧（管理者のみ）
 * POST … 管理者による手動予約（電話・口頭で受けた予約の登録）
 *
 * ★ すべて管理者認証が必須です。
 */

import { createReservation } from "@/lib/domain/booking";
import {
  error,
  fromBookingError,
  guardMutation,
  handle,
  ok,
  requireAdmin,
} from "@/lib/api/http";
import { toAdminReservation } from "@/lib/api/serialize";
import { getStore } from "@/lib/store";
import { addDays, todayJst } from "@/lib/util/datetime";
import {
  readJson,
  validateDate,
  validateId,
  validateIdArray,
  validateName,
  validateNote,
  validatePhone,
  validateTime,
} from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle("admin.reservations.list", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const date = url.searchParams.get("date");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const includeCancelled = url.searchParams.get("includeCancelled") === "1";

    const filter: Parameters<ReturnType<typeof getStore>["listReservations"]>[0] = {
      includeCancelled,
    };

    if (date) {
      const parsed = validateDate(date);
      if (!parsed.ok) return error(400, parsed.errors[0], "invalid");
      filter.date = parsed.value;
    } else {
      /* 既定では「今日から60日先まで」を表示します */
      const parsedFrom = from ? validateDate(from) : null;
      const parsedTo = to ? validateDate(to) : null;
      if (parsedFrom && !parsedFrom.ok) return error(400, parsedFrom.errors[0], "invalid");
      if (parsedTo && !parsedTo.ok) return error(400, parsedTo.errors[0], "invalid");
      filter.from = parsedFrom?.ok ? parsedFrom.value : todayJst();
      filter.to = parsedTo?.ok ? parsedTo.value : addDays(todayJst(), 60);
    }

    const list = await getStore().listReservations(filter);
    return ok({ reservations: list.map(toAdminReservation) });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle("admin.reservations.create", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;

    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await readJson(request);

    const name = validateName(body.customerName);
    if (!name.ok) return error(400, name.errors[0], "invalid");

    const phone = validatePhone(body.phone);
    if (!phone.ok) return error(400, phone.errors[0], "invalid");

    const menuId = validateId(body.menuId);
    if (!menuId.ok) return error(400, "メニューをお選びください。", "invalid");

    const optionIds = validateIdArray(body.optionIds);
    if (!optionIds.ok) return error(400, optionIds.errors[0], "invalid");

    const date = validateDate(body.date);
    if (!date.ok) return error(400, date.errors[0], "invalid");

    const startTime = validateTime(body.startTime);
    if (!startTime.ok) return error(400, startTime.errors[0], "invalid");

    const note = validateNote(body.note);
    if (!note.ok) return error(400, note.errors[0], "invalid");

    const result = await createReservation({
      /*
        ★ 手動予約には LINE userId がありません。
          お客様への LINE 通知は行われません（誤送信を防ぐため）。
          名前や電話番号から通知先を推測することは絶対にしません。
      */
      lineUserId: "",
      customerName: name.value,
      phone: phone.value,
      menuId: menuId.value,
      optionIds: optionIds.value,
      date: date.value,
      startTime: startTime.value,
      note: note.value,
      source: "admin",
    });

    if (!result.ok) return fromBookingError(result.error);
    return ok({ reservation: toAdminReservation(result.value) });
  });
}
