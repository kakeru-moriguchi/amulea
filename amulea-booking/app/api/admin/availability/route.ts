/**
 * GET /api/admin/availability?date=&menuId=&options=&reservationId=
 * ------------------------------------------------------------------
 * 管理画面の手動予約・予約変更で使う空き時間です。
 * 管理者は「当日直前の予約」なども登録できるよう、
 * お客様向けの制限（何時間前まで等）を受けません。
 */

import { getAvailability } from "@/lib/domain/booking";
import { error, fromBookingError, handle, ok, requireAdmin } from "@/lib/api/http";
import { isUuid, validateDate, validateId } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle("admin.availability", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);

    const date = validateDate(url.searchParams.get("date"));
    if (!date.ok) return error(400, date.errors[0], "invalid");

    const menuId = validateId(url.searchParams.get("menuId"));
    if (!menuId.ok) return error(400, "メニューの指定が正しくありません。", "invalid");

    const optionIds = (url.searchParams.get("options") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    const requested = url.searchParams.get("reservationId");
    const excludeReservationId = requested && isUuid(requested) ? requested : undefined;

    const result = await getAvailability({
      date: date.value,
      menuId: menuId.value,
      optionIds,
      excludeReservationId,
      asAdmin: true,
    });

    if (!result.ok) return fromBookingError(result.error);
    return ok(result.value);
  });
}
