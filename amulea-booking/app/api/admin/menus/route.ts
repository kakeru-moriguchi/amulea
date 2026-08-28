/**
 * /api/admin/menus
 * ------------------------------------------------------------------
 * GET … メニュー一覧（非表示のものも含みます）
 * PUT … メニューの追加・編集・並べ替え・非表示化
 *
 * ★ メニューはコードに固定していません。
 *   ここから追加・編集でき、保存先（スプレッドシート）に記録されます。
 *
 * ★ 既存の予約は「予約時点のメニュー名・料金・時間」を
 *   予約データ側に保存しています。
 *   そのため、あとから料金を変えても過去の予約は書き換わりません。
 */

import { error, guardMutation, handle, ok, requireAdmin } from "@/lib/api/http";
import type { Menu, MenuCategory } from "@/lib/domain/types";
import { getStore } from "@/lib/store";
import { cleanLine, cleanText, readJson, validateId } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

const CATEGORIES: MenuCategory[] = ["course", "partial", "secret"];

export async function GET(): Promise<Response> {
  return handle("admin.menus.get", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
    return ok({ menus: await getStore().listMenus() });
  });
}

export async function PUT(request: Request): Promise<Response> {
  return handle("admin.menus.put", async () => {
    const guard = guardMutation(request, "admin");
    if (guard) return guard;

    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await readJson(request);
    if (!Array.isArray(body.menus)) {
      return error(400, "メニューの形式が正しくありません。", "invalid");
    }
    if (body.menus.length > 100) {
      return error(400, "メニューは100件までです。", "invalid");
    }

    const menus: Menu[] = [];
    const seenIds = new Set<string>();

    for (const raw of body.menus) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;

      const id = validateId(item.id);
      if (!id.ok) return error(400, "メニューIDの形式が正しくありません。", "invalid");
      if (seenIds.has(id.value)) {
        return error(400, "メニューIDが重複しています。", "invalid");
      }
      seenIds.add(id.value);

      const name = cleanLine(item.name, 60);
      if (!name) return error(400, "メニュー名を入力してください。", "invalid");

      const durationMin = Number(item.durationMin);
      if (!Number.isInteger(durationMin) || durationMin < 5 || durationMin > 600) {
        return error(400, `「${name}」の施術時間は5〜600分で入力してください。`, "invalid");
      }

      const price = Number(item.price);
      if (!Number.isInteger(price) || price < 0 || price > 1_000_000) {
        return error(400, `「${name}」の料金が正しくありません。`, "invalid");
      }

      const category = CATEGORIES.includes(item.category as MenuCategory)
        ? (item.category as MenuCategory)
        : "course";

      menus.push({
        id: id.value,
        name,
        description: cleanText(item.description, 200),
        category,
        durationMin,
        price,
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : menus.length * 10,
        visible: item.visible !== false,
      });
    }

    if (menus.length === 0) {
      return error(400, "メニューは1件以上必要です。", "invalid");
    }

    await getStore().saveMenus(menus);
    return ok({ menus });
  });
}
