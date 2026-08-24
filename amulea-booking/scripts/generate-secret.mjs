/**
 * SESSION_SECRET を作るスクリプト
 * ==================================================================
 * ログイン状態（Cookie）が偽造されないよう、
 * 署名に使うための「長くてランダムな文字列」を作ります。
 *
 * 【使い方】
 *     node scripts/generate-secret.mjs
 *
 *   表示された1行を .env.local（またはVercelの環境変数）へ貼り付けてください。
 *
 * ★ この値が他人に知られると、ログイン状態を偽造されてしまいます。
 *   絶対に公開・共有しないでください。
 */

import { randomBytes } from "node:crypto";

console.log("");
console.log("以下の1行を SESSION_SECRET に設定してください。");
console.log("------------------------------------------------------------");
console.log(`SESSION_SECRET=${randomBytes(48).toString("base64url")}`);
console.log("------------------------------------------------------------");
console.log("");
