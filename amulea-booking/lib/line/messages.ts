/**
 * LINE 通知の文面
 * ==================================================================
 * ★ 個人情報の扱い
 *   お客様への通知には、電話番号・自由記載を載せません。
 *   管理者への通知にも、電話番号・自由記載は載せません。
 *   （詳細は管理画面で確認する運用です）
 *
 * 文面を変えたいときは、このファイルだけを編集してください。
 */

import type { Reservation } from "../domain/types";
import { formatDateJa, formatDateShortJa, formatPrice } from "../util/datetime";

/** 予約の内容を、お客様向けに整形します */
function customerDetail(r: Reservation): string {
  const lines = [
    "【ご予約内容】",
    "",
    "日時",
    `${formatDateJa(r.date)} ${r.startTime}〜${r.endTime}`,
    "",
    "メニュー",
    r.menuName,
  ];

  if (r.optionNames.length > 0) {
    lines.push("", "オプション", r.optionNames.join("・"));
  }

  lines.push("", "料金", formatPrice(r.totalPrice));
  return lines.join("\n");
}

/* ==================================================================
   お客様向け
   ================================================================== */

/** 予約完了 */
export function customerCreated(r: Reservation): string {
  return [
    "Amulea",
    "ご予約ありがとうございます。",
    "",
    customerDetail(r),
    "",
    "ご予約の変更・キャンセルは",
    "「予約確認」からお願いいたします。",
    "",
    "ご来店を心よりお待ちしております。",
    "",
    "Amulea",
  ].join("\n");
}

/** 予約変更 */
export function customerChanged(r: Reservation): string {
  return [
    "Amulea",
    "ご予約内容を変更しました。",
    "",
    "【変更後】",
    "",
    `${formatDateJa(r.date)}`,
    `${r.startTime}〜${r.endTime}`,
    "",
    r.menuName,
    ...(r.optionNames.length > 0 ? [`（${r.optionNames.join("・")}）`] : []),
    "",
    `料金 ${formatPrice(r.totalPrice)}`,
    "",
    "ご来店を心よりお待ちしております。",
    "",
    "Amulea",
  ].join("\n");
}

/** キャンセル */
export function customerCancelled(r: Reservation): string {
  return [
    "Amulea",
    "ご予約をキャンセルしました。",
    "",
    `${formatDateJa(r.date)}`,
    `${r.startTime}〜`,
    "",
    r.menuName,
    "",
    "またのご予約を心よりお待ちしております。",
    "",
    "Amulea",
  ].join("\n");
}

/* ==================================================================
   管理者向け
   ★ 電話番号・自由記載は載せません（管理画面で確認してください）
   ================================================================== */

/** 新規予約 */
export function adminCreated(r: Reservation): string {
  return [
    "【Amulea 新規予約】",
    "",
    `${formatDateShortJa(r.date)} ${r.startTime}〜${r.endTime}`,
    "",
    "メニュー：",
    r.menuName,
    ...(r.optionNames.length > 0 ? ["", "オプション：", r.optionNames.join("・")] : []),
    "",
    "お名前：",
    `${r.customerName} 様`,
    "",
    `料金：${formatPrice(r.totalPrice)}`,
    ...(r.source === "admin" ? ["", "（管理画面からの手動登録）"] : []),
    ...(r.note ? ["", "※ ご要望の記載があります。"] : []),
    "",
    "新しい予約が入りました。",
    "詳細は管理画面から確認してください。",
  ].join("\n");
}

/** 予約変更 */
export function adminChanged(before: Reservation, after: Reservation): string {
  const beforeLine = `${formatDateShortJa(before.date)} ${before.startTime}`;
  const afterLine = `${formatDateShortJa(after.date)} ${after.startTime}`;

  const lines = [
    "【Amulea 予約変更】",
    "",
    `${after.customerName} 様`,
    "",
    beforeLine,
    "↓",
    afterLine,
  ];

  if (before.menuName !== after.menuName) {
    lines.push("", "メニュー", `${before.menuName}`, "↓", `${after.menuName}`);
  } else {
    lines.push("", `メニュー：${after.menuName}`);
  }

  lines.push("", "詳細は管理画面から確認してください。");
  return lines.join("\n");
}

/** キャンセル */
export function adminCancelled(r: Reservation, byAdmin: boolean): string {
  return [
    "【Amulea 予約キャンセル】",
    "",
    `${r.customerName} 様`,
    "",
    `${formatDateShortJa(r.date)}`,
    `${r.startTime}〜`,
    "",
    r.menuName,
    "",
    byAdmin
      ? "管理画面から予約をキャンセルしました。"
      : "お客様により予約がキャンセルされました。",
  ].join("\n");
}
