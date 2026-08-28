/**
 * メモリ上の保存先（Phase 1 / 開発・デモ用）
 * ==================================================================
 * Google 連携なしで、予約〜変更〜キャンセルまでの全機能を
 * そのまま動かして確認するための保存先です。
 *
 * ★ サーバーを再起動するとデータは消えます。本番では使いません。
 *   （MOCK_MODE=false かつ Google の設定が揃うと、
 *     自動的にスプレッドシート側へ切り替わります）
 */

import { DEFAULT_MENUS, DEFAULT_OPTIONS, DEFAULT_SETTINGS } from "../domain/defaults";
import type { Menu, Option, Reservation, Settings } from "../domain/types";
import { addDays, todayJst } from "../util/datetime";
import { newId } from "../util/id";
import {
  matchesFilter,
  sortByDateTime,
  type DataStore,
  type ReservationFilter,
} from "./types";

/**
 * 開発サーバーはファイル変更のたびにモジュールを読み直すため、
 * globalThis に置いてデータが消えないようにしています。
 */
type MemoryDb = {
  reservations: Map<string, Reservation>;
  settings: Settings;
  menus: Menu[];
  options: Option[];
};

const GLOBAL_KEY = Symbol.for("amulea.booking.memory-db");

function seed(): MemoryDb {
  const reservations = new Map<string, Reservation>();

  /* 管理画面の見た目を確認できるよう、サンプル予約を数件入れています */
  const samples: Array<{
    name: string;
    phone: string;
    menuId: string;
    dayOffset: number;
    start: string;
    note: string;
    optionIds: string[];
  }> = [
    {
      name: "山田 花子",
      phone: "09012345678",
      menuId: "course-lymph",
      dayOffset: 0,
      start: "15:00",
      note: "肩こりが気になります。",
      optionIds: ["opt-hotstone"],
    },
    {
      name: "佐藤 美咲",
      phone: "08098765432",
      menuId: "course-quick",
      dayOffset: 1,
      start: "13:00",
      note: "",
      optionIds: [],
    },
    {
      name: "鈴木 あゆみ",
      phone: "07011112222",
      menuId: "course-full",
      dayOffset: 2,
      start: "18:00",
      note: "はじめて伺います。よろしくお願いします。",
      optionIds: [],
    },
  ];

  for (const s of samples) {
    const menu = DEFAULT_MENUS.find((m) => m.id === s.menuId)!;
    const options = DEFAULT_OPTIONS.filter((o) => s.optionIds.includes(o.id));
    const optionPrice = options.reduce((sum, o) => sum + o.price, 0);
    const extra = options.reduce((sum, o) => sum + o.extraDurationMin, 0);
    const totalDuration = menu.durationMin + extra;

    const [h, m] = s.start.split(":").map(Number);
    const endMin = h * 60 + m + totalDuration;
    const endTime = `${String(Math.floor(endMin / 60)).padStart(2, "0")}:${String(
      endMin % 60,
    ).padStart(2, "0")}`;

    const id = newId();
    const now = new Date().toISOString();
    reservations.set(id, {
      id,
      lineUserId: `Udemo${s.name.length}0000000000000000000000`,
      customerName: s.name,
      phone: s.phone,
      menuId: menu.id,
      menuName: menu.name,
      menuDurationMin: menu.durationMin,
      menuPrice: menu.price,
      optionIds: options.map((o) => o.id),
      optionNames: options.map((o) => o.name),
      optionPrice,
      totalDurationMin: totalDuration,
      totalPrice: menu.price + optionPrice,
      date: addDays(todayJst(), s.dayOffset),
      startTime: s.start,
      endTime,
      blockStartTime: s.start,
      blockEndTime: endTime,
      note: s.note,
      status: "confirmed",
      source: "customer",
      googleCalendarEventId: null,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
    });
  }

  return {
    reservations,
    settings: structuredClone(DEFAULT_SETTINGS),
    menus: structuredClone(DEFAULT_MENUS),
    options: structuredClone(DEFAULT_OPTIONS),
  };
}

function db(): MemoryDb {
  const g = globalThis as unknown as Record<symbol, MemoryDb | undefined>;
  let found = g[GLOBAL_KEY];
  if (!found) {
    found = seed();
    g[GLOBAL_KEY] = found;
  }
  return found;
}

export class MemoryStore implements DataStore {
  async listReservations(filter?: ReservationFilter): Promise<Reservation[]> {
    const all = [...db().reservations.values()].filter((r) => matchesFilter(r, filter));
    return sortByDateTime(all).map((r) => structuredClone(r));
  }

  async getReservation(id: string): Promise<Reservation | null> {
    const found = db().reservations.get(id);
    return found ? structuredClone(found) : null;
  }

  async createReservation(reservation: Reservation): Promise<void> {
    db().reservations.set(reservation.id, structuredClone(reservation));
  }

  async updateReservation(reservation: Reservation): Promise<void> {
    db().reservations.set(reservation.id, structuredClone(reservation));
  }

  async getSettings(): Promise<Settings> {
    return structuredClone(db().settings);
  }

  async saveSettings(settings: Settings): Promise<void> {
    db().settings = structuredClone(settings);
  }

  async listMenus(): Promise<Menu[]> {
    return structuredClone(db().menus).sort((a, b) => a.order - b.order);
  }

  async saveMenus(menus: Menu[]): Promise<void> {
    db().menus = structuredClone(menus);
  }

  async listOptions(): Promise<Option[]> {
    return structuredClone(db().options).sort((a, b) => a.order - b.order);
  }

  async saveOptions(options: Option[]): Promise<void> {
    db().options = structuredClone(options);
  }
}
