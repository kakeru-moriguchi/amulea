/**
 * GET /api/admin/session
 * ------------------------------------------------------------------
 * 管理者としてログインしているかどうかを返します。
 */

import { getAdminSession } from "@/lib/auth/session";
import { handle, ok } from "@/lib/api/http";
import { integrationStatus } from "@/lib/domain/booking";
import { env, isDevLoginAllowed, isLineLoginEnabled } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle("admin.session", async () => {
    const session = await getAdminSession();
    return ok({
      loggedIn: Boolean(session),
      mockMode: env.mockMode,
      integrations: {
        ...integrationStatus(),
        lineLogin: isLineLoginEnabled(),
      },
      /* まだ誰でも仮ログインできる状態かどうか（管理画面に警告を出すため） */
      devLoginOpen: isDevLoginAllowed(),
    });
  });
}
