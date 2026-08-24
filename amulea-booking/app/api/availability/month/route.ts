/**
 * GET /api/availability/month?from=2026-09-01&to=2026-09-30&menuId=...
 * ------------------------------------------------------------------
 * カレンダー表示用に、日付ごとの「予約できる枠があるか」を返します。
 * Google カレンダーへの問い合わせは1回にまとめています。
 */

import { getMonthAvailability } from "@/lib/domain/booking";
import { fromBookingError, guardRead, handle, ok, error } from "@/lib/api/http";
import { getAdminSession } from "@/lib/auth/session";
import { diffDays } from "@/lib/util/datetime";
import { validateDate, validateId } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

/** 一度に取得できる最大日数（過大なリクエストを防ぎます） */
const MAX_DAYS = 62;

export async function GET(request: Request): Promise<Response> {
  return handle("availability/month", async () => {
    const guard = guardRead(request, "availability");
    if (guard) return guard;

    const url = new URL(request.url);

    const from = validateDate(url.searchParams.get("from"));
    if (!from.ok) return error(400, from.errors[0], "invalid");
    const to = validateDate(url.searchParams.get("to"));
    if (!to.ok) return error(400, to.errors[0], "invalid");

    const days = diffDays(from.value, to.value);
    if (days < 0 || days > MAX_DAYS) {
      return error(400, "期間の指定が正しくありません。", "invalid");
    }

    const menuId = validateId(url.searchParams.get("menuId"));
    if (!menuId.ok) return error(400, "メニューの指定が正しくありません。", "invalid");

    const optionIds = (url.searchParams.get("options") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);

    /*
      管理画面から呼ばれた場合は、お客様向けの制限
      （何時間前まで・何日先まで）を外して表示します。
      ★ 管理者セッションを持っているときだけ有効です。
    */
    const asAdmin =
      url.searchParams.get("admin") === "1" && Boolean(await getAdminSession());

    const result = await getMonthAvailability(
      from.value,
      to.value,
      menuId.value,
      optionIds,
      asAdmin,
    );
    if (!result.ok) return fromBookingError(result.error);
    return ok({ days: result.value });
  });
}
