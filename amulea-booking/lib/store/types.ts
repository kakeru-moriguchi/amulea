/**
 * 保存先の共通インターフェース
 * ==================================================================
 * 予約データの保存先を「差し替え可能」にするための約束事です。
 *
 *   MemoryStore … サーバーのメモリ上（Phase 1 / 開発・デモ用）
 *   SheetsStore … Google スプレッドシート（Phase 3 / 本番用）
 *
 * アプリ本体はこのインターフェースだけを見ているため、
 * 将来 DB（Postgres など）へ移行する場合も、
 * この形に合わせた実装を1つ追加するだけで済みます。
 */

import type { Menu, Option, Reservation, Settings } from "../domain/types";

export type ReservationFilter = {
  /** この日付のみ（YYYY-MM-DD） */
  date?: string;
  /** この日付以降 */
  from?: string;
  /** この日付以前 */
  to?: string;
  /** この LINE userId のみ */
  lineUserId?: string;
  /** キャンセル済みも含めるか（初期値 false = 有効な予約のみ） */
  includeCancelled?: boolean;
};

export interface DataStore {
  /** 条件に合う予約を、日時の昇順で返します */
  listReservations(filter?: ReservationFilter): Promise<Reservation[]>;
  /** 1件取得（存在しなければ null） */
  getReservation(id: string): Promise<Reservation | null>;
  /** 新規保存 */
  createReservation(reservation: Reservation): Promise<void>;
  /** 上書き保存（変更・キャンセル） */
  updateReservation(reservation: Reservation): Promise<void>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  listMenus(): Promise<Menu[]>;
  saveMenus(menus: Menu[]): Promise<void>;

  listOptions(): Promise<Option[]>;
  saveOptions(options: Option[]): Promise<void>;
}

/** 日時の昇順に並べ替えます（一覧表示の共通処理） */
export function sortByDateTime(list: Reservation[]): Reservation[] {
  return [...list].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.startTime !== b.startTime) return a.startTime < b.startTime ? -1 : 1;
    return a.createdAt < b.createdAt ? -1 : 1;
  });
}

/** フィルタ条件に合うかどうか */
export function matchesFilter(r: Reservation, filter?: ReservationFilter): boolean {
  if (!filter) return r.status !== "cancelled";
  if (!filter.includeCancelled && r.status === "cancelled") return false;
  if (filter.date && r.date !== filter.date) return false;
  if (filter.from && r.date < filter.from) return false;
  if (filter.to && r.date > filter.to) return false;
  if (filter.lineUserId !== undefined && r.lineUserId !== filter.lineUserId) return false;
  return true;
}
