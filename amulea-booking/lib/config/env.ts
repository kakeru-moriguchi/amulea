/**
 * 環境変数の読み込み
 * ==================================================================
 * APIキー・秘密鍵の類は、必ずこのファイル経由で読み込みます。
 * ソースコードへ直書きすることは絶対に行いません。
 *
 * ここで読み込む値は「サーバー側でのみ」使用されます。
 * NEXT_PUBLIC_ が付いていない環境変数は、ブラウザへは一切送られません。
 *
 * 設定方法は docs/SETUP-GOOGLE.md / docs/SETUP-LINE.md を参照してください。
 */

/** 文字列の環境変数を読み込みます（未設定なら空文字） */
function str(name: string, fallback = ""): string {
  const v = process.env[name];
  return typeof v === "string" && v.length > 0 ? v : fallback;
}

/** true / 1 / yes を真として扱います */
function bool(name: string, fallback = false): boolean {
  const v = process.env[name];
  if (v === undefined || v === "") return fallback;
  return ["true", "1", "yes", "on"].includes(v.toLowerCase());
}

function num(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) ? v : fallback;
}

/**
 * Google のサービスアカウント秘密鍵。
 * Vercel の環境変数へ貼り付けると改行が "\n" の2文字になるため、
 * 実際の改行へ戻しています。
 */
function privateKey(name: string): string {
  return str(name).replace(/\\n/g, "\n");
}

export const env = {
  /** 本番かどうか */
  isProduction: process.env.NODE_ENV === "production",

  /**
   * モックモード（強制オフのスイッチ）
   * ------------------------------------------------------------
   * true にすると、認証情報が揃っていても Google / LINE へは
   * 一切接続しません。手元での開発や、連携を一時的に止めたいときに使います。
   *
   * ★ 通常は設定不要です（初期値 false）。
   *   各連携は「その連携の認証情報が揃っているかどうか」で
   *   独立して有効になります。そのため
   *     Google だけ先に設定して試す → あとで LINE を追加する
   *   という段階的な導入ができます。
   */
  mockMode: bool("MOCK_MODE", false),

  /** アプリの公開 URL（CSRF の Origin 判定などに使用） */
  appUrl: str("APP_URL", "http://localhost:3000"),

  /** セッション Cookie の署名鍵（32文字以上のランダム文字列） */
  sessionSecret: str("SESSION_SECRET"),

  /** ----------------------------- 管理者 ----------------------------- */
  admin: {
    /** 管理者ログイン ID */
    id: str("ADMIN_ID", "admin"),
    /**
     * 管理者パスワードのハッシュ（scrypt）。
     * scripts/hash-password.mjs で生成します。
     * 形式: scrypt$<saltHex>$<hashHex>
     */
    passwordHash: str("ADMIN_PASSWORD_HASH"),
    /** 開発用の平文パスワード（MOCK_MODE のときだけ有効） */
    devPassword: str("ADMIN_DEV_PASSWORD", "amulea-dev"),
  },

  /** ----------------------------- Google ----------------------------- */
  google: {
    /** サービスアカウントのメールアドレス */
    clientEmail: str("GOOGLE_CLIENT_EMAIL"),
    /** サービスアカウントの秘密鍵 */
    privateKey: privateKey("GOOGLE_PRIVATE_KEY"),
    /** 予約を書き込む Google カレンダー ID（例: amulea.163@gmail.com） */
    calendarId: str("GOOGLE_CALENDAR_ID"),
    /** 予約を保存する Google スプレッドシート ID */
    spreadsheetId: str("GOOGLE_SPREADSHEET_ID"),
    /** 予約データのシート名 */
    sheetName: str("GOOGLE_SHEET_NAME", "reservations"),
    /** 設定値を保存するシート名 */
    settingsSheetName: str("GOOGLE_SETTINGS_SHEET_NAME", "settings"),
  },

  /** ------------------------------ LINE ------------------------------ */
  line: {
    /** LIFF ID（フロントで使用するため NEXT_PUBLIC_ が付きます） */
    liffId: str("NEXT_PUBLIC_LIFF_ID"),
    /** LINE ログインチャネルの Channel ID（IDトークン検証に使用） */
    loginChannelId: str("LINE_LOGIN_CHANNEL_ID"),
    /** Messaging API チャネルのアクセストークン（絶対に公開しない） */
    messagingAccessToken: str("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN"),
    /**
     * 管理者へ通知する LINE userId（カンマ区切りで複数指定可）
     * 管理者が Messaging API のチャネルを友だち追加している必要があります。
     */
    adminUserIds: str("LINE_ADMIN_USER_IDS")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },

  /** --------------------------- レート制限 --------------------------- */
  rateLimit: {
    /** 書き込み系 API を、同一IPあたり windowSec 秒間に何回まで許可するか */
    max: num("RATE_LIMIT_MAX", 20),
    windowSec: num("RATE_LIMIT_WINDOW_SEC", 60),
  },
} as const;

/**
 * Google カレンダー連携が使える状態かどうか
 * （必要な値がすべて揃っていて、MOCK_MODE で止められていないとき）
 */
export function isGoogleEnabled(): boolean {
  return (
    !env.mockMode &&
    Boolean(env.google.clientEmail) &&
    Boolean(env.google.privateKey) &&
    Boolean(env.google.calendarId)
  );
}

/** Google スプレッドシート連携が使える状態かどうか */
export function isSheetsEnabled(): boolean {
  return (
    !env.mockMode &&
    Boolean(env.google.clientEmail) &&
    Boolean(env.google.privateKey) &&
    Boolean(env.google.spreadsheetId)
  );
}

/** LINE ログイン（LIFF）が使える状態かどうか */
export function isLineLoginEnabled(): boolean {
  return !env.mockMode && Boolean(env.line.loginChannelId) && Boolean(env.line.liffId);
}

/** LINE 通知（Messaging API）が使える状態かどうか */
export function isLineMessagingEnabled(): boolean {
  return !env.mockMode && Boolean(env.line.messagingAccessToken);
}

/**
 * 開発用の簡易ログインを許可してよいか
 * ==================================================================
 * ★ お客様の本人確認は LINE ログインで行います。
 *   まだ LINE の設定が済んでいない段階では本人確認の手段が無く、
 *   予約画面をまったく試せなくなってしまいます。
 *
 *   そこで「LINE ログインが未設定のあいだだけ」、
 *   誰でも仮のお客様としてログインできる開発用の入口を開けています。
 *
 * ★ LINE の設定が完了すると、この入口は自動的に閉じます。
 *   閉じ忘れる心配はありません。
 *
 * ★ 開いているあいだは管理画面に警告を表示します。
 *   本番のお客様をお迎えする前に、必ず LINE 連携を完了してください。
 */
export function isDevLoginAllowed(): boolean {
  return !isLineLoginEnabled();
}

/**
 * 起動時の設定チェック。
 * 本番なのに必須の値が無い場合に、不足している「変数名だけ」を返します。
 * 値そのものは絶対に返しません（ログ流出を防ぐため）。
 */
export function missingProductionEnv(): string[] {
  const missing: string[] = [];
  if (!env.isProduction || env.mockMode) return missing;

  if (!env.sessionSecret || env.sessionSecret.length < 32)
    missing.push("SESSION_SECRET（32文字以上）");
  if (!env.admin.passwordHash) missing.push("ADMIN_PASSWORD_HASH");
  if (!env.google.clientEmail) missing.push("GOOGLE_CLIENT_EMAIL");
  if (!env.google.privateKey) missing.push("GOOGLE_PRIVATE_KEY");
  if (!env.google.calendarId) missing.push("GOOGLE_CALENDAR_ID");
  if (!env.line.loginChannelId) missing.push("LINE_LOGIN_CHANNEL_ID");
  if (!env.line.messagingAccessToken)
    missing.push("LINE_MESSAGING_CHANNEL_ACCESS_TOKEN");
  return missing;
}
