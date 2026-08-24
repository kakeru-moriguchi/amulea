/** POST /api/admin/logout */

import { clearAdminSession } from "@/lib/auth/session";
import { guardMutation, handle, ok } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle("admin.logout", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;
    await clearAdminSession();
    return ok({});
  });
}
