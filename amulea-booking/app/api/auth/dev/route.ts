/**
 * POST /api/auth/dev
 * ------------------------------------------------------------------
 * 開発用の仮ログインです。
 *
 * ★ MOCK_MODE=true のときしか動きません。
 *   本番（MOCK_MODE=false）では必ず 404 を返します。
 *   LINE の設定が済んでいない段階でも、予約〜変更〜キャンセルまでの
 *   流れを一通り確認できるようにするためのものです。
 */

import { createCustomerSession } from "@/lib/auth/session";
import { error, guardMutation, handle, ok } from "@/lib/api/http";
import { env } from "@/lib/config/env";
import { readJson, cleanLine } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handle("auth/dev", async () => {
    if (!env.mockMode) {
      return error(404, "ご利用いただけません。", "not_found");
    }

    const guard = guardMutation(request, "auth");
    if (guard) return guard;

    const body = await readJson(request);

    /*
      開発用の擬似 userId。
      本物の LINE userId と同じ形式（U + 16進数32文字）にしています。
      こうすることで、通知先の形式チェックまで含めて
      本番とまったく同じ経路を通せます。
      seat の数字を変えると「別のお客様」として動作確認できます。
    */
    const seat = String(body.seat ?? "1").replace(/[^0-9]/g, "").slice(0, 2) || "1";
    const userId = `U${seat.padStart(2, "0")}${"0".repeat(30)}`;
    const name = cleanLine(body.name, 20) || `テスト太郎${seat}`;

    await createCustomerSession(userId, name);
    return ok({ name, mock: true });
  });
}
