/**
 * ID の生成
 * ------------------------------------------------------------------
 * 予約 ID は URL に載るため、連番にすると
 * 「1つ増やせば他人の予約が見える」状態になりかねません。
 * 推測が事実上不可能な UUID v4 を使用します。
 * （加えてサーバー側でも必ず本人確認を行っています）
 */
import { randomUUID, randomBytes } from "node:crypto";

/** 予約 ID など、外部に出る ID */
export function newId(): string {
  return randomUUID();
}

/** CSRF トークンなど、短めのランダム文字列 */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
