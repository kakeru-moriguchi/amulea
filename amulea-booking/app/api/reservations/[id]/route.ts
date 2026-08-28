/**
 * /api/reservations/[id]
 * ------------------------------------------------------------------
 * GET   … 予約1件の取得（★ 本人のものだけ）
 * PATCH … 予約日時・メニューの変更
 *
 * ★ URL の予約 ID を書き換えても、他人の予約は取得・変更できません。
 *   サーバー側で「セッションの userId」と
 *   「予約データの userId」が一致することを必ず確認しています。
 */

import { changeReservation, getMyReservation } from "@/lib/domain/booking";
import {
  error,
  fromBookingError,
  guardMutation,
  guardRead,
  handle,
  ok,
  requireCustomer,
} from "@/lib/api/http";
import { toPublicReservation } from "@/lib/api/serialize";
import {
  isUuid,
  readJson,
  validateDate,
  validateId,
  validateIdArray,
  validateTime,
} from "@/lib/security/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params): Promise<Response> {
  return handle("reservations.get", async () => {
    const guard = guardRead(request, "reservations");
    if (guard) return guard;

    const auth = await requireCustomer();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return error(404, "予約が見つかりませんでした。", "not_found");

    const found = await getMyReservation(id, auth.lineUserId);
    /*
      他人の予約でも「権限がありません」ではなく「見つかりません」を返します。
      予約 ID が存在するかどうかを外部から探れないようにするためです。
    */
    if (!found) return error(404, "予約が見つかりませんでした。", "not_found");

    return ok({ reservation: toPublicReservation(found) });
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle("reservations.change", async () => {
    const guard = guardMutation(request, "reserve");
    if (guard) return guard;

    const auth = await requireCustomer();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return error(404, "予約が見つかりませんでした。", "not_found");

    const body = await readJson(request);

    const date = validateDate(body.date);
    if (!date.ok) return error(400, date.errors[0], "invalid");

    const startTime = validateTime(body.startTime);
    if (!startTime.ok) return error(400, startTime.errors[0], "invalid");

    let menuId: string | undefined;
    if (body.menuId !== undefined) {
      const parsed = validateId(body.menuId);
      if (!parsed.ok) return error(400, "メニューの指定が正しくありません。", "invalid");
      menuId = parsed.value;
    }

    let optionIds: string[] | undefined;
    if (body.optionIds !== undefined) {
      const parsed = validateIdArray(body.optionIds);
      if (!parsed.ok) return error(400, parsed.errors[0], "invalid");
      optionIds = parsed.value;
    }

    const result = await changeReservation(
      id,
      { date: date.value, startTime: startTime.value, menuId, optionIds },
      /* ★ 本人確認はサービス側で行います */
      auth.lineUserId,
    );

    if (!result.ok) return fromBookingError(result.error);
    return ok({ reservation: toPublicReservation(result.value.after) });
  });
}
