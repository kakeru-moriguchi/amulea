/**
 * 管理者パスワードの検証
 * ==================================================================
 * ★ パスワードは平文で保存しません。
 *   scrypt というアルゴリズムでハッシュ化した値だけを
 *   環境変数（ADMIN_PASSWORD_HASH）に置きます。
 *
 *   万一その値が漏れても、元のパスワードは分かりません。
 *
 * 【ハッシュの作り方】
 *   ターミナルで次を実行し、表示された1行を
 *   ADMIN_PASSWORD_HASH に設定してください。
 *
 *     node scripts/hash-password.mjs "設定したいパスワード"
 *
 * 【形式】
 *   scrypt$<salt(hex)>$<hash(hex)>
 */

import { scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

/** scrypt のパラメータ（scripts/hash-password.mjs と揃えてください） */
const KEY_LENGTH = 64;

/**
 * パスワードが正しいかどうかを返します。
 * 比較は timingSafeEqual を使い、応答時間からパスワードを
 * 推測されないようにしています。
 */
export function verifyAdminPassword(password: unknown): boolean {
  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return false;
  }

  /*
    ADMIN_PASSWORD_HASH が未設定のあいだだけ、開発用の平文パスワードで
    ログインできます。ハッシュを設定すると、この入口は自動的に閉じます。
  */
  if (!env.admin.passwordHash) {
    const expected = Buffer.from(env.admin.devPassword);
    const actual = Buffer.from(password);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  const stored = env.admin.passwordHash;
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  const [, saltHex, hashHex] = parts;
  let expected: Buffer;
  let actual: Buffer;
  try {
    expected = Buffer.from(hashHex, "hex");
    actual = scryptSync(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  } catch {
    return false;
  }

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

/** 管理者 ID が一致するか */
export function verifyAdminId(id: unknown): boolean {
  if (typeof id !== "string") return false;
  const expected = Buffer.from(env.admin.id);
  const actual = Buffer.from(id);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
