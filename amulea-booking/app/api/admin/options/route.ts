/**
 * /api/admin/options
 * ------------------------------------------------------------------
 * GET … オプション一覧（非表示のものも含みます）
 * PUT … オプションの追加・編集・並べ替え・非表示化
 *
 * extraDurationMin を設定すると、そのオプションを選んだ予約は
 * その分だけ枠が長くなります（例: 占い 10 分）。
 */

import { error, guardMutation, handle, ok, requireAdmin } from "@/lib/api/http";
import type { Option } from "@/lib/domain/types";
import { getStore } from "@/lib/store";
import { cleanLine, cleanText, readJson, validateId } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return handle("admin.options.get", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return ok({ options: await getStore().listOptions() });
  });
}

export async function PUT(request: Request): Promise<Response> {
  return handle("admin.options.put", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;

    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await readJson(request);
    if (!Array.isArray(body.options)) {
      return error(400, "オプションの形式が正しくありません。", "invalid");
    }
    if (body.options.length > 50) {
      return error(400, "オプションは50件までです。", "invalid");
    }

    const options: Option[] = [];
    const seenIds = new Set<string>();

    for (const raw of body.options) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;

      const id = validateId(item.id);
      if (!id.ok) return error(400, "オプションIDの形式が正しくありません。", "invalid");
      if (seenIds.has(id.value)) {
        return error(400, "オプションIDが重複しています。", "invalid");
      }
      seenIds.add(id.value);

      const name = cleanLine(item.name, 60);
      if (!name) return error(400, "オプション名を入力してください。", "invalid");

      const price = Number(item.price);
      if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
        return error(400, `「${name}」の料金が正しくありません。`, "invalid");
      }

      const extra = Number(item.extraDurationMin ?? 0);
      if (!Number.isInteger(extra) || extra < 0 || extra > 240) {
        return error(400, `「${name}」の追加時間は0〜240分で入力してください。`, "invalid");
      }

      options.push({
        id: id.value,
        name,
        description: cleanText(item.description, 200),
        price,
        extraDurationMin: extra,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : options.length * 10,
        visible: item.visible !== false,
      });
    }

    await getStore().saveOptions(options);
    return ok({ options });
  });
}
