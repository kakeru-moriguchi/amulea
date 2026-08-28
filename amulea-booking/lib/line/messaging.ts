/**
 * LINE Messaging API（通知の送信）
 * ==================================================================
 * ★ 誤送信を防ぐための約束事
 *
 *   1. 送信先は「予約データに保存されている lineUserId」だけです。
 *      名前や電話番号から送信先を推測することは絶対にしません。
 *   2. 送信直前に、予約 ID と userId の組み合わせを確認します。
 *   3. userId が空（管理者が電話で代理登録した予約など）の場合は、
 *      送信せずに黙って終了します。
 *   4. 通知の失敗で予約処理そのものを失敗させません。
 *      （予約は成立しているのに「失敗しました」と出るのを防ぐため）
 */

import { env, isLineMessagingEnabled } from "../config/env";
import { log, maskId, maskUserId } from "../security/logger";

const PUSH_URL = "https://api.line.me/v2/bot/message/push";

/** LINE userId の形式（U から始まる 33 文字の英数字） */
export function isLineUserId(value: unknown): value is string {
  return typeof value === "string" && /^U[0-9a-f]{32}$/i.test(value);
}

/**
 * テキストメッセージを送信します。
 * 送信できたかどうかを boolean で返します（例外は投げません）。
 */
async function push(to: string, text: string): Promise<boolean> {
  if (!isLineMessagingEnabled()) {
    // モックモードでは送信内容をサーバーのログにだけ出します（動作確認用）
    log.info("LINE通知（モック・未送信）", { to: maskUserId(to), length: text.length });
    return false;
  }

  if (!to) return false;

  try {
    const response = await fetch(PUSH_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.line.messagingAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      // ★ 応答本文にはトークンや個人情報が含まれ得るため、本文は残しません
      log.warn("LINE通知の送信に失敗", {
        to: maskUserId(to),
        status: response.status,
      });
      return false;
    }
    return true;
  } catch (error) {
    log.error("LINE通知の送信でエラー", error, { to: maskUserId(to) });
    return false;
  }
}

/**
 * お客様へ通知します。
 *
 * @param reservationId  ログ用。userId との紐付き確認は呼び出し元で済ませてください
 * @param lineUserId     予約データに保存されている userId
 */
export async function notifyCustomer(
  reservationId: string,
  lineUserId: string,
  text: string,
): Promise<boolean> {
  /* 保存されている userId が LINE の形式でない場合は送信しません */
  if (!isLineUserId(lineUserId)) {
    log.info("お客様への通知をスキップ（userIdなし）", {
      reservation: maskId(reservationId),
    });
    return false;
  }
  return push(lineUserId, text);
}

/** 管理者（複数可）へ通知します */
export async function notifyAdmins(text: string): Promise<void> {
  const targets = env.line.adminUserIds.filter(isLineUserId);
  if (targets.length === 0) {
    log.info("管理者への通知をスキップ（LINE_ADMIN_USER_IDS 未設定）");
    if (!isLineMessagingEnabled()) log.info("管理者通知（モック）", { length: text.length });
    return;
  }
  await Promise.all(targets.map((to) => push(to, text)));
}
