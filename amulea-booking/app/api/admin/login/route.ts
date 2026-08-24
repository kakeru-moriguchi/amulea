/**
 * POST /api/admin/login
 * ------------------------------------------------------------------
 * 管理者ログイン。
 *
 * ★ セキュリティ上の配慮
 *   ・パスワードはハッシュ化した値とだけ比較します
 *   ・ID とパスワードのどちらが違うかは教えません（総当たり対策）
 *   ・失敗時はレート制限を厳しめにかけます
 *   ・パスワードはログに一切出しません
 */

import { verifyAdminId, verifyAdminPassword } from "@/lib/auth/admin";
import { createAdminSession } from "@/lib/auth/session";
import { error, guardMutation, handle, ok } from "@/lib/api/http";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
import { log } from "@/lib/security/logger";
import { readJson } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle("admin.login", async () => {
    const guard = guardMutation(request, "admin-login");
    if (guard) return guard;

    /* ログインは 5 分間に 10 回までに制限します */
    const limited = rateLimit(`admin-login-strict:${clientKey(request)}`, 10, 300);
    if (!limited.allowed) {
      return error(
        429,
        "ログインの試行回数が上限に達しました。しばらくしてからお試しください。",
        "rate_limited",
      );
    }

    const body = await readJson(request);
    const idOk = verifyAdminId(body.id);
    const passwordOk = verifyAdminPassword(body.password);

    if (!idOk || !passwordOk) {
      log.warn("管理者ログインに失敗", { ip: clientKey(request) });
      return error(401, "IDまたはパスワードが正しくありません。", "unauthorized");
    }

    await createAdminSession(String(body.id));
    log.info("管理者ログイン成功");
    return ok({});
  });
}
