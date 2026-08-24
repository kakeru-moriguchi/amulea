/**
 * /api/admin/reservations/[id]
 * ------------------------------------------------------------------
 * GET    … 予約詳細（管理者は電話番号・自由記載まで確認できます）
 * PATCH  … 予約日時・メニューの変更
 * DELETE … 予約のキャンセル
 */

import { cancelReservation, changeReservation } from "@/lib/domain/booking";
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
  return handle("admin.reservations.get", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return error(404, "予約が見つかりませんでした。", "not_found");

    const found = await getStore().getReservation(id);
    if (!found) return error(404, "予約が見つかりませんでした。", "not_found");

    return ok({ reservation: toAdminReservation(found) });
  });
}

export async function PATCH(request: Request, { params }: Params): Promise<Response> {
  return handle("admin.reservations.change", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;

    const auth = await requireAdmin();
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

    /* null を渡すと「管理者による操作」として扱われます */
    const result = await changeReservation(
      id,
      { date: date.value, startTime: startTime.value, menuId, optionIds },
      null,
    );

    if (!result.ok) return fromBookingError(result.error);
    return ok({ reservation: toAdminReservation(result.value.after) });
  });
}

export async function DELETE(request: Request, { params }: Params): Promise<Response> {
  return handle("admin.reservations.cancel", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;

    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return error(404, "予約が見つかりませんでした。", "not_found");

    const result = await cancelReservation(id, null);
    if (!result.ok) return fromBookingError(result.error);
    return ok({ reservation: toAdminReservation(result.value) });
  });
}
