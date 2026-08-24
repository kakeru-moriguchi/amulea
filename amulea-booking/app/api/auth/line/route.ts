/**
 * POST /api/auth/line
 * ------------------------------------------------------------------
 * LIFF が発行した IDトークンを受け取り、LINE のサーバーで検証したうえで
 * ログインセッションを作ります。
 *
 * ★ ここが本人確認の入口です。
 *   クライアントから userId を受け取ることは絶対にしません。
 */

import { createCustomerSession } from "@/lib/auth/session";
import { error, guardMutation, handle, ok } from "@/lib/api/http";
import { isLineLoginEnabled } from "@/lib/config/env";
import { verifyIdToken } from "@/lib/line/verify";
import { readJson } from "@/lib/security/validation";
import { log, maskUserId } from "@/lib/security/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle("auth/line", async () => {
    const guard = guardMutation(request, "auth");
    if (guard) return guard;

    if (!isLineLoginEnabled()) {
      return error(503, "LINEログインは現在ご利用いただけません。", "line_disabled");
    }

    const body = await readJson(request);
    const profile = await verifyIdToken(body.idToken);

    if (!profile) {
      return error(401, "ログインに失敗しました。公式LINEから開き直してください。", "invalid_token");
    }

    await createCustomerSession(profile.userId, profile.displayName);
    log.info("LINEログイン成功", { user: maskUserId(profile.userId) });

    return ok({ name: profile.displayName });
  });
}
