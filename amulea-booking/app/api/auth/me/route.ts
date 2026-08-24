/**
 * GET /api/auth/me
 * ------------------------------------------------------------------
 * 現在のログイン状態を返します。
 * ★ LINE userId そのものはクライアントへ返しません。
 *   画面側で必要なのは「ログイン済みかどうか」と「表示名」だけです。
 */

import { getCustomerSession } from "@/lib/auth/session";
import { handle, ok } from "@/lib/api/http";
import { env, isLineLoginEnabled } from "@/lib/config/env";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle("auth/me", async () => {
    const session = await getCustomerSession();
    return ok({
      loggedIn: Boolean(session),
      name: session?.name ?? "",
      /* 画面側が LIFF を初期化すべきか判断するために使います */
      lineLoginEnabled: isLineLoginEnabled(),
      liffId: env.line.liffId,
      mockMode: env.mockMode,
    });
  });
}
