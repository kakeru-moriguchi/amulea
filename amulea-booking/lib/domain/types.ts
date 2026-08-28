/**
 * 予約システムのデータ構造
 * ==================================================================
 * 予約・メニュー・設定の「かたち」をここで一元定義しています。
 * 保存先（メモリ / Google スプレッドシート）が変わっても、
 * この型は変わりません。
 */

/* ------------------------------------------------------------------
   メニュー
   ------------------------------------------------------------------ */

/** メニューの分類 */
export type MenuCategory = "course" | "partial" | "secret";

export type Menu = {
  /** 変更されない ID（予約データに保存されます） */
  id: string;
  /** メニュー名 */
  name: string;
  /** 一行の説明 */
  description: string;
  /** 分類 */
  category: MenuCategory;
  /** 施術時間（分） */
  durationMin: number;
  /** 料金（円・税込） */
  price: number;
  /** 表示順（小さいほど上） */
  order: number;
  /** false にすると予約画面に表示されません */
  visible: boolean;
};

/** オプション（各コースに追加できるもの） */
export type Option = {
  id: string;
  name: string;
  description: string;
  /** 追加料金（円） */
  price: number;
  /**
   * 追加でかかる施術時間（分）。
   * 0 ならコース時間内で行うため、予約枠は伸びません。
   */
  extraDurationMin: number;
  order: number;
  visible: boolean;
};

/* ------------------------------------------------------------------
   予約
   ------------------------------------------------------------------ */

export type ReservationStatus = "confirmed" | "cancelled";

/** 予約が「誰によって」作られたか */
export type ReservationSource = "customer" | "admin";

export type Reservation = {
  /** 推測されにくい UUID */
  id: string;
  /**
   * 予約者の LINE userId。
   * ★ この値だけが本人確認・LINE通知先の判定に使われます。
   *   管理者が代理登録した予約は空文字になることがあります。
   */
  lineUserId: string;
  /** お名前 */
  customerName: string;
  /** 電話番号（ハイフンなし・半角数字） */
  phone: string;

  menuId: string;
  menuName: string;
  /** メニュー単体の施術時間（分） */
  menuDurationMin: number;
  /** メニュー単体の料金 */
  menuPrice: number;

  optionIds: string[];
  optionNames: string[];
  optionPrice: number;

  /** メニュー + オプションの合計施術時間（分） */
  totalDurationMin: number;
  /** メニュー + オプションの合計料金 */
  totalPrice: number;

  /** 予約日 YYYY-MM-DD（日本時間） */
  date: string;
  /** 施術開始 HH:mm */
  startTime: string;
  /** 施術終了 HH:mm */
  endTime: string;
  /** 準備時間を含めた枠の開始 HH:mm（カレンダー登録に使用） */
  blockStartTime: string;
  /** 準備時間を含めた枠の終了 HH:mm */
  blockEndTime: string;

  /** ご要望など（自由記載） */
  note: string;

  status: ReservationStatus;
  source: ReservationSource;

  /** Google カレンダーのイベント ID（連携していないときは null） */
  googleCalendarEventId: string | null;

  /** ISO 8601（UTC） */
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

/** 予約の作成に必要な入力（サーバー側で検証済みのもの） */
export type ReservationInput = {
  lineUserId: string;
  customerName: string;
  phone: string;
  menuId: string;
  optionIds: string[];
  date: string;
  startTime: string;
  note: string;
  source: ReservationSource;
};

/* ------------------------------------------------------------------
   営業設定
   ------------------------------------------------------------------ */

/** 1日の営業時間 */
export type DayHours = {
  /** 営業開始 HH:mm */
  open: string;
  /** 最終予約受付「開始」時刻 HH:mm */
  lastStart: string;
  /** 営業終了 HH:mm（施術がこの時刻を超える予約は取れません） */
  close: string;
};

/** 特定日だけの営業時間変更 */
export type SpecialHours = DayHours & {
  date: string;
  label: string;
};

/** 予約受付を止める時間帯 */
export type BlockedSlot = {
  id: string;
  date: string;
  /** HH:mm */
  start: string;
  /** HH:mm */
  end: string;
  reason: string;
};

/** 臨時休業日 */
export type ClosedDate = {
  date: string;
  reason: string;
};

export type Settings = {
  /** 平日（月〜金）の営業時間 */
  weekdayHours: DayHours;
  /** 土日祝の営業時間 */
  holidayHours: DayHours;

  /** 予約枠の刻み（分）。30 なら 13:00 / 13:30 / 14:00 … */
  slotIntervalMin: number;

  /** 施術前の準備時間（分） */
  bufferBeforeMin: number;
  /** 施術後の片付け時間（分） */
  bufferAfterMin: number;

  /** 定休日（0=日, 1=月 … 6=土）。不定休なら空配列 */
  regularClosedWeekdays: number[];
  /** 臨時休業日 */
  closedDates: ClosedDate[];
  /** 特定日の営業時間変更 */
  specialHours: SpecialHours[];
  /** 予約受付停止の時間帯 */
  blockedSlots: BlockedSlot[];

  /** false にすると新規予約の受付を全面停止します */
  acceptingReservations: boolean;
  /** 受付停止中に表示するお知らせ */
  suspendedMessage: string;

  /** 何日先まで予約を受け付けるか */
  maxAdvanceDays: number;
  /** 何時間後から予約を受け付けるか（直前予約の防止） */
  minAdvanceHours: number;
  /** 変更・キャンセルを受け付ける期限（施術開始の何時間前まで） */
  changeDeadlineHours: number;

  /** LINE 通知の ON / OFF */
  notify: {
    customerOnCreate: boolean;
    customerOnChange: boolean;
    customerOnCancel: boolean;
    adminOnCreate: boolean;
    adminOnChange: boolean;
    adminOnCancel: boolean;
  };
};

/* ------------------------------------------------------------------
   空き時間
   ------------------------------------------------------------------ */

/** 予約が入っている（または予定が入っている）時間帯 */
export type BusyInterval = {
  /** 日本時間の分（0:00 からの経過分）。日をまたぐ場合は 1440 以上 */
  startMin: number;
  endMin: number;
  /** どこから来た予定か（デバッグ・管理画面用） */
  source: "reservation" | "calendar" | "blocked";
  /** 管理画面にだけ表示するラベル（お客様には出しません） */
  label?: string;
  /** Google カレンダーのイベント ID（予約変更時に自分自身を除外するために使用） */
  eventId?: string;
};

/** お客様に返す1件の枠 */
export type Slot = {
  /** HH:mm */
  time: string;
  /** 予約できるか */
  available: boolean;
};

/** 空き時間 API のレスポンス */
export type AvailabilityResult = {
  date: string;
  /** 営業日かどうか */
  open: boolean;
  /** 休業などの理由（お客様に表示してよい文言） */
  closedReason: string | null;
  /** 祝日名（祝日でなければ null） */
  holidayName: string | null;
  /** 営業時間（休業日なら null） */
  hours: DayHours | null;
  slots: Slot[];
};
