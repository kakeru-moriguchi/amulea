/**
 * GET /api/menus
 * ------------------------------------------------------------------
 * 予約画面に必要な「メニュー・オプション・公開してよい設定」を返します。
 * ログイン不要で参照できます（個人情報は含まれません）。
 */

import { guardRead, handle, ok } from "@/lib/api/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handle("menus", async () => {
    const guard = guardRead(request, "menus");
    if (guard) return guard;

    const store = getStore();
    const [menus, options, settings] = await Promise.all([
      store.listMenus(),
      store.listOptions(),
      store.getSettings(),
    ]);

    return ok({
      menus: menus.filter((m) => m.visible),
      options: options.filter((o) => o.visible),
      /* ★ 公開してよい設定だけを返します（LINE のトークン等は含みません） */
      booking: {
        acceptingReservations: settings.acceptingReservations,
        suspendedMessage: settings.suspendedMessage,
        maxAdvanceDays: settings.maxAdvanceDays,
        minAdvanceHours: settings.minAdvanceHours,
        changeDeadlineHours: settings.changeDeadlineHours,
        weekdayHours: settings.weekdayHours,
        holidayHours: settings.holidayHours,
      },
    });
  });
}
