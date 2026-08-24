/**
 * 保存先の選択
 * ==================================================================
 * 環境変数の状態を見て、使用する保存先を自動的に切り替えます。
 *
 *   MOCK_MODE=true（初期値）              → メモリ（Phase 1）
 *   MOCK_MODE=false かつ Google 設定あり  → スプレッドシート（Phase 3）
 *
 * ★ 開発中に Google の設定が無くても、アプリは動き続けます。
 */

import { isSheetsEnabled } from "../config/env";
import { MemoryStore } from "./memory";
import { SheetsStore } from "./sheets";
import type { DataStore } from "./types";

let instance: DataStore | null = null;

export function getStore(): DataStore {
  if (!instance) {
    instance = isSheetsEnabled() ? new SheetsStore() : new MemoryStore();
  }
  return instance;
}

/** 設定を変えたときなどに、次回アクセスで作り直させます */
export function resetStore(): void {
  instance = null;
}

export type { DataStore, ReservationFilter } from "./types";
