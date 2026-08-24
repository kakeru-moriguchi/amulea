/**
 * GET /api/availability?date=2026-09-10&menuId=course-lymph&options=opt-hotstone
 * ------------------------------------------------------------------
 * 指定日の予約可能枠を返します。
 *
 * ★ 空き判定は必ずサーバー側で行います。
 *   画面はこの結果を表示するだけで、判定はしません。
 */

import { getAvailability } from "@/lib/domain/booking";
import { fromBookingError, guardRead, handle, ok, error } from "@/lib/api/http";
import { getCustomerSession } from "@/lib/auth/session";
import { isUuid, validateDate, validateId } from "@/lib/security/validation";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle("availability", async () => {
    const guard = guardRead(request, "availability");
    if (guard) return guard;

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

    /*
      予約変更のとき、自分自身の枠は「空き」として扱います。
      ★ 他人の予約 ID を渡して枠をこじ開けられないよう、
        本人の予約かどうかをここで必ず確認します。
    */
    let excludeReservationId: string | undefined;
    const requested = url.searchParams.get("reservationId");
    if (requested && isUuid(requested)) {
      const session = await getCustomerSession();
      if (session) {
        const own = await getStore().getReservation(requested);
        if (own && own.lineUserId === session.sub) excludeReservationId = requested;
      }
    }

    const result = await getAvailability({
      date: date.value,
      menuId: menuId.value,
      optionIds,
      excludeReservationId,
    });

    if (!result.ok) return fromBookingError(result.error);
    return ok(result.value);
  });
}
