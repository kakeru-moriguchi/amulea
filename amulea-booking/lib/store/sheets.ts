/**
 * Google スプレッドシートを保存先にする実装（Phase 3 / 本番用）
 * ==================================================================
 * 予約 1 件 = 1 行 です。
 * シートを直接見れば、いつでも予約状況を確認・バックアップできます。
 *
 * 【シート構成】
 *   reservations … 予約データ（1行1予約）
 *   settings     … メニュー・オプション・営業設定（JSON を1セルに保存）
 *
 * 【注意】
 *   スプレッドシートは「同時書き込みの排他制御」を持ちません。
 *   そのため二重予約の防止は、スプレッドシートではなく
 *   Google カレンダー側で行っています（lib/domain/booking.ts 参照）。
 *   ここでは記録・参照に徹しています。
 */

import { env } from "../config/env";
import { withSettingsDefaults, DEFAULT_MENUS, DEFAULT_OPTIONS } from "../domain/defaults";
import type { Menu, Option, Reservation, Settings } from "../domain/types";
import {
  appendRows,
  columnName,
  ensureSheet,
  readRange,
  writeRange,
} from "../google/sheets";
import { sanitizeForSheet } from "../security/validation";
import {
  matchesFilter,
  sortByDateTime,
  type DataStore,
  type ReservationFilter,
} from "./types";

/* ------------------------------------------------------------------
   予約シートの列定義
   ------------------------------------------------------------------ */

const HEADERS = [
  "予約ID",
  "LINE userId",
  "名前",
  "電話番号",
  "メニューID",
  "メニュー名",
  "メニュー時間(分)",
  "メニュー料金",
  "オプションID",
  "オプション名",
  "オプション料金",
  "合計時間(分)",
  "合計料金",
  "予約日",
  "開始時間",
  "終了時間",
  "枠開始",
  "枠終了",
  "自由記載",
  "予約ステータス",
  "登録元",
  "Google Calendar Event ID",
  "作成日時",
  "更新日時",
  "キャンセル日時",
] as const;

const LAST_COLUMN = columnName(HEADERS.length);

/** 予約 → 行 */
function toRow(r: Reservation): string[] {
  const cells = [
    r.id,
    r.lineUserId,
    r.customerName,
    r.phone,
    r.menuId,
    r.menuName,
    String(r.menuDurationMin),
    String(r.menuPrice),
    r.optionIds.join(","),
    r.optionNames.join(","),
    String(r.optionPrice),
    String(r.totalDurationMin),
    String(r.totalPrice),
    r.date,
    r.startTime,
    r.endTime,
    r.blockStartTime,
    r.blockEndTime,
    r.note,
    r.status,
    r.source,
    r.googleCalendarEventId ?? "",
    r.createdAt,
    r.updatedAt,
    r.cancelledAt ?? "",
  ];
  // 数式インジェクション対策（= や + で始まる入力を無害化）
  return cells.map((c) => sanitizeForSheet(c));
}

/** 先頭のアポストロフィ（数式インジェクション対策）を取り除きます */
function unescape(value: string): string {
  return value.startsWith("'") ? value.slice(1) : value;
}

/** 行 → 予約 */
function fromRow(row: string[]): Reservation | null {
  const get = (i: number) => unescape(row[i] ?? "");
  const id = get(0);
  if (!id) return null;

  const splitList = (value: string) =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    id,
    lineUserId: get(1),
    customerName: get(2),
    phone: get(3),
    menuId: get(4),
    menuName: get(5),
    menuDurationMin: Number(get(6)) || 0,
    menuPrice: Number(get(7)) || 0,
    optionIds: splitList(get(8)),
    optionNames: splitList(get(9)),
    optionPrice: Number(get(10)) || 0,
    totalDurationMin: Number(get(11)) || 0,
    totalPrice: Number(get(12)) || 0,
    date: get(13),
    startTime: get(14),
    endTime: get(15),
    blockStartTime: get(16) || get(14),
    blockEndTime: get(17) || get(15),
    note: get(18),
    status: get(19) === "cancelled" ? "cancelled" : "confirmed",
    source: get(20) === "admin" ? "admin" : "customer",
    googleCalendarEventId: get(21) || null,
    createdAt: get(22),
    updatedAt: get(23),
    cancelledAt: get(24) || null,
  };
}

/* ------------------------------------------------------------------
   設定シート（キーと JSON の 2 列）
   ------------------------------------------------------------------ */

const SETTINGS_KEYS = {
  settings: "settings",
  menus: "menus",
  options: "options",
} as const;

/** 設定は変更が少ないため、短時間だけキャッシュします */
type Cache<T> = { value: T; expiresAt: number } | null;
const CACHE_MS = 30_000;

export class SheetsStore implements DataStore {
  private settingsCache: Cache<Settings> = null;
  private menusCache: Cache<Menu[]> = null;
  private optionsCache: Cache<Option[]> = null;
  private initialized = false;

  /** 初回アクセス時にシートと見出し行を用意します */
  private async init(): Promise<void> {
    if (this.initialized) return;
    await ensureSheet(env.google.sheetName);
    await ensureSheet(env.google.settingsSheetName);

    const header = await readRange(`${env.google.sheetName}!A1:${LAST_COLUMN}1`);
    if (header.length === 0 || (header[0]?.[0] ?? "") !== HEADERS[0]) {
      await writeRange(`${env.google.sheetName}!A1:${LAST_COLUMN}1`, [[...HEADERS]]);
    }
    this.initialized = true;
  }

  /** 全予約を（行番号つきで）読み取ります */
  private async readAll(): Promise<Array<{ row: number; reservation: Reservation }>> {
    await this.init();
    const values = await readRange(`${env.google.sheetName}!A2:${LAST_COLUMN}`);
    const result: Array<{ row: number; reservation: Reservation }> = [];
    values.forEach((row, i) => {
      const reservation = fromRow(row);
      // 見出し行が 1 行目なので、データは 2 行目から
      if (reservation) result.push({ row: i + 2, reservation });
    });
    return result;
  }

  async listReservations(filter?: ReservationFilter): Promise<Reservation[]> {
    const all = await this.readAll();
    return sortByDateTime(
      all.map((x) => x.reservation).filter((r) => matchesFilter(r, filter)),
    );
  }

  async getReservation(id: string): Promise<Reservation | null> {
    const all = await this.readAll();
    return all.find((x) => x.reservation.id === id)?.reservation ?? null;
  }

  async createReservation(reservation: Reservation): Promise<void> {
    await this.init();
    await appendRows(`${env.google.sheetName}!A:${LAST_COLUMN}`, [toRow(reservation)]);
  }

  async updateReservation(reservation: Reservation): Promise<void> {
    const all = await this.readAll();
    const found = all.find((x) => x.reservation.id === reservation.id);
    if (!found) {
      // 何らかの理由で行が見つからない場合は、失われるより追記します
      await this.createReservation(reservation);
      return;
    }
    await writeRange(
      `${env.google.sheetName}!A${found.row}:${LAST_COLUMN}${found.row}`,
      [toRow(reservation)],
    );
  }

  /* ---------------------------- 設定 ---------------------------- */

  private async readSetting<T>(key: string): Promise<T | null> {
    await this.init();
    const rows = await readRange(`${env.google.settingsSheetName}!A:B`);
    const row = rows.find((r) => unescape(r[0] ?? "") === key);
    if (!row || !row[1]) return null;
    try {
      return JSON.parse(unescape(row[1])) as T;
    } catch {
      return null;
    }
  }

  private async writeSetting(key: string, value: unknown): Promise<void> {
    await this.init();
    const rows = await readRange(`${env.google.settingsSheetName}!A:B`);
    const index = rows.findIndex((r) => unescape(r[0] ?? "") === key);
    const json = JSON.stringify(value);
    if (index === -1) {
      await appendRows(`${env.google.settingsSheetName}!A:B`, [[key, json]]);
    } else {
      await writeRange(`${env.google.settingsSheetName}!A${index + 1}:B${index + 1}`, [
        [key, json],
      ]);
    }
  }

  async getSettings(): Promise<Settings> {
    if (this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return structuredClone(this.settingsCache.value);
    }
    const stored = await this.readSetting<Partial<Settings>>(SETTINGS_KEYS.settings);
    const value = withSettingsDefaults(stored);
    this.settingsCache = { value, expiresAt: Date.now() + CACHE_MS };
    return structuredClone(value);
  }

  async saveSettings(settings: Settings): Promise<void> {
    await this.writeSetting(SETTINGS_KEYS.settings, settings);
    this.settingsCache = null;
  }

  async listMenus(): Promise<Menu[]> {
    if (this.menusCache && this.menusCache.expiresAt > Date.now()) {
      return structuredClone(this.menusCache.value);
    }
    const stored = await this.readSetting<Menu[]>(SETTINGS_KEYS.menus);
    const value = (stored && stored.length > 0 ? stored : DEFAULT_MENUS)
      .slice()
      .sort((a, b) => a.order - b.order);
    this.menusCache = { value, expiresAt: Date.now() + CACHE_MS };
    return structuredClone(value);
  }

  async saveMenus(menus: Menu[]): Promise<void> {
    await this.writeSetting(SETTINGS_KEYS.menus, menus);
    this.menusCache = null;
  }

  async listOptions(): Promise<Option[]> {
    if (this.optionsCache && this.optionsCache.expiresAt > Date.now()) {
      return structuredClone(this.optionsCache.value);
    }
    const stored = await this.readSetting<Option[]>(SETTINGS_KEYS.options);
    const value = (stored && stored.length > 0 ? stored : DEFAULT_OPTIONS)
      .slice()
      .sort((a, b) => a.order - b.order);
    this.optionsCache = { value, expiresAt: Date.now() + CACHE_MS };
    return structuredClone(value);
  }

  async saveOptions(options: Option[]): Promise<void> {
    await this.writeSetting(SETTINGS_KEYS.options, options);
    this.optionsCache = null;
  }
}
