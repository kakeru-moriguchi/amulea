/**
 * クライアントへ返す形への変換
 * ==================================================================
 * ★ 予約データをそのまま返してはいけません。
 *   LINE userId や Google のイベント ID など、
 *   画面に不要な情報は取り除いてから返します。
 *   （万一クライアント側の不具合で表示されても、被害を小さくするため）
 */

import type { Reservation } from "../domain/types";

/** お客様の画面へ返す予約 */
export type PublicReservation = {
  id: string;
  customerName: string;
  phone: string;
  menuId: string;
  menuName: string;
  optionIds: string[];
  optionNames: string[];
  totalDurationMin: number;
  totalPrice: number;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
  status: Reservation["status"];
  createdAt: string;
};

export function toPublicReservation(r: Reservation): PublicReservation {
  return {
    id: r.id,
    customerName: r.customerName,
    phone: r.phone,
    menuId: r.menuId,
    menuName: r.menuName,
    optionIds: r.optionIds,
    optionNames: r.optionNames,
    totalDurationMin: r.totalDurationMin,
    totalPrice: r.totalPrice,
    date: r.date,
    startTime: r.startTime,
    endTime: r.endTime,
    note: r.note,
    status: r.status,
    createdAt: r.createdAt,
  };
}

/** 管理画面へ返す予約（管理者は詳細まで見られます） */
export type AdminReservation = PublicReservation & {
  /** LINE と紐づいているかどうかだけを返します（userId 自体は返しません） */
  hasLineUser: boolean;
  source: Reservation["source"];
  blockStartTime: string;
  blockEndTime: string;
  updatedAt: string;
  cancelledAt: string | null;
  linkedToCalendar: boolean;
};

export function toAdminReservation(r: Reservation): AdminReservation {
  return {
    ...toPublicReservation(r),
    hasLineUser: Boolean(r.lineUserId),
    source: r.source,
    blockStartTime: r.blockStartTime,
    blockEndTime: r.blockEndTime,
    updatedAt: r.updatedAt,
    cancelledAt: r.cancelledAt,
    linkedToCalendar: Boolean(r.googleCalendarEventId),
  };
}
