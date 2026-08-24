/**
 * GET /api/admin/day?date=2026-09-10
 * ------------------------------------------------------------------
 * 管理画面のカレンダー用。
 * その日の予約に加えて、Google カレンダーの予定（私用など）も返します。
 * 「なぜこの時間が埋まっているのか」を管理者が把握できるようにするためです。
 */

import { getAdminDay } from "@/lib/domain/booking";
import { error, handle, ok, requireAdmin } from "@/lib/api/http";
import { toAdminReservation } from "@/lib/api/serialize";
import { validateDate } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle("admin.day", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const url = new URL(request.url);
    const date = validateDate(url.searchParams.get("date"));
    if (!date.ok) return error(400, date.errors[0], "invalid");

    const day = await getAdminDay(date.value);

    return ok({
      date: date.value,
      open: day.status.open,
      closedReason: day.status.reason,
      holidayName: day.status.holiday,
      hours: day.status.hours,
      reservations: day.reservations.map(toAdminReservation),
      calendar: {
        allDayBlocked: day.calendar.allDayBlocked,
        intervals: day.calendar.intervals,
      },
    });
  });
}
