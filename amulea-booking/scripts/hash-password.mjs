/**
 * 管理者パスワードのハッシュを作るスクリプト
 * ==================================================================
 * パスワードをそのまま環境変数に置くのは危険です。
 * このスクリプトで「ハッシュ」という復元できない文字列に変換し、
 * その結果を ADMIN_PASSWORD_HASH に設定します。
 *
 * 【使い方】
 *   ターミナルで、このプロジェクトのフォルダに移動して実行します。
 *
 *     node scripts/hash-password.mjs "ここに設定したいパスワード"
 *
 *   表示された1行をまるごとコピーして、
 *   .env.local（またはVercelの環境変数）の
 *   ADMIN_PASSWORD_HASH に貼り付けてください。
 */

import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password) {
  console.error("");
  console.error("使い方: node scripts/hash-password.mjs \"設定したいパスワード\"");
  console.error("");
  console.error("例: node scripts/hash-password.mjs \"Amulea!2026-Salon\"");
  console.error("");
  process.exit(1);
}

if (password.length < 10) {
  console.error("");
  console.error("パスワードが短すぎます。10文字以上にしてください。");
  console.error("英字の大小・数字・記号を混ぜると、より安全になります。");
  console.error("");
  process.exit(1);
}

/* salt（ソルト）… 同じパスワードでも毎回違うハッシュになるようにする値 */
const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);

console.log("");
console.log("以下の1行を ADMIN_PASSWORD_HASH に設定してください。");
console.log("------------------------------------------------------------");
console.log(`ADMIN_PASSWORD_HASH=scrypt$${salt.toString("hex")}$${hash.toString("hex")}`);
console.log("------------------------------------------------------------");
console.log("");
console.log("※ 元のパスワードはどこにも保存されません。忘れないようご注意ください。");
console.log("");
