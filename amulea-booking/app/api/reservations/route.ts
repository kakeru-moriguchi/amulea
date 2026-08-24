/**
 * /api/reservations
 * ------------------------------------------------------------------
 * GET  … ログイン中のお客様「自身の」予約一覧
 * POST … 新規予約
 *
 * ★ どちらもログイン必須です。
 *   LINE userId はセッション（サーバー側）からのみ取得します。
 *   リクエストボディに userId が入っていても完全に無視します。
 */

import { createReservation, listMyReservations } from "@/lib/domain/booking";
import {
  error,
  fromBookingError,
  guardMutation,
  guardRead,
  handle,
  ok,
  requireCustomer,
} from "@/lib/api/http";
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
import { toPublicReservation } from "@/lib/api/serialize";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle("reservations.list", async () => {
    const guard = guardRead(request, "reservations");
    if (guard) return guard;

    const auth = await requireCustomer();
    if (!auth.ok) return auth.response;

    /* ★ セッションの userId と一致する予約だけが返ります */
    const list = await listMyReservations(auth.lineUserId);
    return ok({ reservations: list.map(toPublicReservation) });
  });
}

export async function POST(request: Request): Promise<Response> {
  return handle("reservations.create", async () => {
    const guard = guardMutation(request, "reserve");
    if (guard) return guard;

    const auth = await requireCustomer();
    if (!auth.ok) return auth.response;

    const body = await readJson(request);

    /* ---- 入力の検証（すべてサーバー側で行います） ---- */
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
      /* ★★ ここが重要: userId はセッションから取得したものだけを使います ★★ */
      lineUserId: auth.lineUserId,
      customerName: name.value,
      phone: phone.value,
      menuId: menuId.value,
      optionIds: optionIds.value,
      date: date.value,
      startTime: startTime.value,
      note: note.value,
      source: "customer",
    });

    if (!result.ok) return fromBookingError(result.error);
    return ok({ reservation: toPublicReservation(result.value) });
  });
}
