/**
 * 初期データ（メニュー・オプション・営業設定）
 * ==================================================================
 * Amulea 公式サイトの料金表をもとにした初期値です。
 *
 * ★ ここはあくまで「初期値」です。
 *   公開後のメニュー追加・料金変更・営業時間変更は、
 *   管理画面（/admin/settings）から行えます。
 *   変更内容は保存先（スプレッドシート）に記録され、
 *   このファイルを編集し直す必要はありません。
 */

import type { Menu, Option, Settings } from "./types";

/** メニューの初期値 */
export const DEFAULT_MENUS: Menu[] = [
  {
    id: "course-quick",
    name: "お試しクイックコース",
    description: "香りに癒やされ、巡り整う。全身かるくなるアロマリンパトリートメント。",
    category: "course",
    durationMin: 60,
    price: 7000,
    order: 10,
    visible: true,
  },
  {
    id: "course-lymph",
    name: "極上リンパアロマトリートメント",
    description:
      "五感が潤う、極上の巡り。心身をゼロにリセットする全身アロマリンパトリートメント。",
    category: "course",
    durationMin: 90,
    price: 10000,
    order: 20,
    visible: true,
  },
  {
    id: "course-full",
    name: "極上ご褒美フルコース",
    description:
      "足先から指先・デコルテまで丁寧にトリートメント。最後に頭をほぐし、極上のリラックスへ。",
    category: "course",
    durationMin: 120,
    price: 13000,
    order: 30,
    visible: true,
  },
  {
    id: "partial-lower",
    name: "下半身",
    description: "立ち仕事の味方。足の疲れを解きほぐすアロマリンパトリートメント。",
    category: "partial",
    durationMin: 30,
    price: 4000,
    order: 40,
    visible: true,
  },
  {
    id: "partial-back",
    name: "背中・お腹",
    description: "背中のハリと腹部の緊張をほぐす、身体の巡り徹底改善コース。",
    category: "partial",
    durationMin: 30,
    price: 4000,
    order: 50,
    visible: true,
  },
  {
    id: "partial-head",
    name: "デコルテ・肩・ヘッド",
    description: "首・肩・頭を丸ごとほぐし、最高峰の休息タイム。",
    category: "partial",
    durationMin: 30,
    price: 4000,
    order: 60,
    visible: true,
  },
];

/** オプションの初期値 */
export const DEFAULT_OPTIONS: Option[] = [
  {
    id: "opt-hotstone",
    name: "ホットストーン",
    description: "ストーンの遠赤外線効果で巡り力アップ。",
    price: 1000,
    // コース時間の中で行うため、予約枠は伸びません
    extraDurationMin: 0,
    order: 10,
    visible: true,
  },
  {
    id: "opt-fortune",
    name: "占い（10分）",
    description: "Amulea の隠れメニュー。あなたの心にそっと寄り添います。",
    price: 1000,
    // 施術のあとに 10 分いただきます
    extraDurationMin: 10,
    order: 20,
    visible: true,
  },
];

/** 営業設定の初期値 */
export const DEFAULT_SETTINGS: Settings = {
  /* 月〜金 13:00〜23:00 */
  weekdayHours: { open: "13:00", lastStart: "20:00", close: "23:00" },
  /* 土・日・祝 12:00〜23:00 */
  holidayHours: { open: "12:00", lastStart: "20:00", close: "23:00" },

  /* 予約枠は 30 分刻み */
  slotIntervalMin: 30,

  /* 準備時間の初期値は 0 分（管理画面から 15/30/45/60 分に変更できます） */
  bufferBeforeMin: 0,
  bufferAfterMin: 0,

  /* 不定休のため、固定の定休日はありません */
  regularClosedWeekdays: [],
  closedDates: [],
  specialHours: [],
  blockedSlots: [],

  acceptingReservations: true,
  suspendedMessage:
    "ただいま予約の受付を停止しております。恐れ入りますが、公式LINEよりお問い合わせください。",

  maxAdvanceDays: 60,
  /* 直前予約の防止（3時間後以降のみ受付） */
  minAdvanceHours: 3,
  /* 施術開始の 24 時間前まで変更・キャンセル可能 */
  changeDeadlineHours: 24,

  notify: {
    customerOnCreate: true,
    customerOnChange: true,
    customerOnCancel: true,
    adminOnCreate: true,
    adminOnChange: true,
    adminOnCancel: true,
  },
};

/**
 * 保存されている設定に、後から追加された項目が無い場合でも
 * 落ちないように初期値で補完します。
 */
export function withSettingsDefaults(partial: Partial<Settings> | null): Settings {
  if (!partial) return structuredClone(DEFAULT_SETTINGS);
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...partial,
    weekdayHours: { ...DEFAULT_SETTINGS.weekdayHours, ...partial.weekdayHours },
    holidayHours: { ...DEFAULT_SETTINGS.holidayHours, ...partial.holidayHours },
    notify: { ...DEFAULT_SETTINGS.notify, ...partial.notify },
  };
}
