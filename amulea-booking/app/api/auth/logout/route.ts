/**
 * POST /api/auth/logout
 */

import { clearCustomerSession } from "@/lib/auth/session";
import { guardMutation, handle, ok } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle("auth/logout", async () => {
    const guard = guardMutation(request, "auth");
    if (guard) return guard;
    await clearCustomerSession();
    return ok({});
  });
}
