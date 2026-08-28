/**
 * POST /api/reservations/[id]/cancel
 * ------------------------------------------------------------------
 * 予約をキャンセルします（★ 本人のものだけ）。
 *
 * DELETE ではなく POST にしているのは、
 * データを消すのではなく「キャンセル済み」に変えるためです。
 * 履歴として残し、あとから確認できるようにしています。
 */

import { cancelReservation } from "@/lib/domain/booking";
import {
  error,
  fromBookingError,
  guardMutation,
  handle,
  ok,
  requireCustomer,
} from "@/lib/api/http";
import { toPublicReservation } from "@/lib/api/serialize";
import { isUuid } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params): Promise<Response> {
  return handle("reservations.cancel", async () => {
    const guard = guardMutation(request, "reserve");
    if (guard) return guard;

    const auth = await requireCustomer();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!isUuid(id)) return error(404, "予約が見つかりませんでした。", "not_found");

    const result = await cancelReservation(id, auth.lineUserId);
    if (!result.ok) return fromBookingError(result.error);

    return ok({ reservation: toPublicReservation(result.value) });
  });
}
