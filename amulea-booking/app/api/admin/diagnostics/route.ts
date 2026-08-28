/**
 * GET /api/admin/diagnostics
 * ==================================================================
 * Google 連携がうまくいかないときの「原因の切り分け」をします。
 *
 * どこまで成功して、どこで止まっているのかを順番に確認し、
 * 管理者に分かる日本語で返します。
 *
 * ★ 安全のための配慮
 *   ・管理者としてログインしている場合のみ実行できます
 *   ・秘密鍵やトークンの中身は絶対に返しません
 *   ・設定値は「入っているかどうか」と、末尾のごく一部だけを返します
 *     （取り違えに気づけるようにするため）
 */

import { handle, ok, requireAdmin } from "@/lib/api/http";
import { env, isGoogleEnabled, isSheetsEnabled } from "@/lib/config/env";
import { getAccessToken } from "@/lib/google/auth";
import { fetchCalendarBusyForDate } from "@/lib/google/calendar";
import { listSheetTitles } from "@/lib/google/sheets";
import { todayJst } from "@/lib/util/datetime";

export const dynamic = "force-dynamic";

type Check = {
  name: string;
  ok: boolean;
  /** 管理者に見せる説明（秘密情報は含みません） */
  detail: string;
  /** 直し方のヒント */
  hint?: string;
};

/** 設定されているかどうかだけを示します（値は伏せます） */
function present(value: string): string {
  if (!value) return "未設定";
  return `設定あり（${value.length}文字）`;
}

/** 取り違えに気づけるよう、末尾だけ見せます */
function tail(value: string, n = 6): string {
  if (!value) return "未設定";
  return value.length <= n ? value : `…${value.slice(-n)}`;
}

/** エラーから、原因のあたりを付けます */
function hintFor(message: string): string {
  if (message.includes("403")) {
    return "共有の権限が足りません。カレンダーは「予定の変更権限」、スプレッドシートは「編集者」で、サービスアカウントのメールアドレスに共有してください。";
  }
  if (message.includes("404")) {
    return "IDが違うか、共有されていません。カレンダーID／スプレッドシートIDを確認してください。";
  }
  if (message.includes("401")) {
    return "認証に失敗しています。秘密鍵かサービスアカウントのメールアドレスを確認してください。";
  }
  /* Node が秘密鍵を読めなかったときの、専門的なエラー文言を拾います */
  if (
    message.includes("DECODER") ||
    message.includes("PEM") ||
    message.includes("asn1") ||
    message.includes("unsupported")
  ) {
    return "秘密鍵の形が壊れています。JSONファイルの private_key を、-----BEGIN から -----END PRIVATE KEY----- まで貼り直してください（途中の改行 \\n も消さずにそのまま）。";
  }
  if (message.includes("認証")) {
    return "秘密鍵の貼り付けを確認してください。-----BEGIN から -----END PRIVATE KEY----- まで全部入っている必要があります。";
  }
  return "Vercel の Logs タブに詳しい記録が残っています。";
}

export async function GET(): Promise<Response> {
  return handle("admin.diagnostics", async () => {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const checks: Check[] = [];

    /* ---- 1. 環境変数が入っているか ---- */
    /*
      手順書に載せている「記入例」をそのまま貼ってしまうことがあるため、
      例と一致していないかを確認します。
    */
    const SAMPLE_EMAIL = "amulea-booking@amulea-booking-123456.iam.gserviceaccount.com";
    const isSample = env.google.clientEmail === SAMPLE_EMAIL;

    if (env.google.fromJson) {
      checks.push({
        name: "設定方法",
        ok: true,
        detail:
          "サービスアカウントの JSON を丸ごと読み込んでいます（GOOGLE_SERVICE_ACCOUNT_JSON）。メールアドレスと秘密鍵は JSON の中身が使われます。",
      });
    }

    checks.push({
      name: "サービスアカウントのメールアドレス",
      ok: Boolean(env.google.clientEmail) && !isSample,
      detail: !env.google.clientEmail
        ? "未設定（GOOGLE_CLIENT_EMAIL）"
        : isSample
          ? `${env.google.clientEmail}\n※ これは手順書の「記入例」と同じ値です。`
          : env.google.clientEmail,
      hint: !env.google.clientEmail
        ? "Vercel の環境変数に GOOGLE_CLIENT_EMAIL を追加してください。"
        : isSample
          ? "手順書の例ではなく、ご自身の JSON ファイルの client_email の値を貼ってください。"
          : undefined,
    });

    const keyLooksValid =
      env.google.privateKey.includes("BEGIN") && env.google.privateKey.includes("END");

    /*
      よくある取り違え。
      JSON ファイルをメモ帳で開いて「private_key」を検索すると、
      1つ手前にある "private_key_id" のほうが先に見つかります。
      その値（16進数40文字ほど）をコピーしてしまう事故が多いため、
      形から見分けて名指しします。
    */
    const looksLikeKeyId =
      !keyLooksValid && /^[0-9a-f]{20,64}$/i.test(env.google.privateKey.trim());
    checks.push({
      name: "秘密鍵の形",
      ok: keyLooksValid,
      detail: keyLooksValid
        ? `${present(env.google.privateKey)}・BEGIN と END を確認`
        : env.google.privateKey
          ? /*
               形が違うときだけ、先頭の数文字を見せます。
               正しい鍵の先頭は "-----BEGIN PRIV..." という公開された決まり文句なので、
               ここを見せても秘密は漏れません。
               逆に「何を貼ってしまったか」がすぐ分かります。
            */
            looksLikeKeyId
              ? `「private_key」ではなく「private_key_id」の値が入っています（先頭「${env.google.privateKey.slice(0, 12)}…」）`
              : `形が正しくありません。先頭が「${env.google.privateKey.slice(0, 15)}」で始まっています（正しくは「-----BEGIN PRIV」）`
          : "未設定（GOOGLE_PRIVATE_KEY）",
      hint: keyLooksValid
        ? undefined
        : looksLikeKeyId
          ? "JSONを検索すると、1つ手前にある private_key_id が先に見つかります。その次にある「private_key」（-----BEGIN PRIVATE KEY----- で始まる長い値）を使ってください。JSONを丸ごと GOOGLE_SERVICE_ACCOUNT_JSON に貼るのが確実です。"
          : "-----BEGIN PRIVATE KEY----- から -----END PRIVATE KEY----- まで、途中で切れずに貼れているか確認してください。",
    });

    checks.push({
      name: "カレンダーID",
      ok: Boolean(env.google.calendarId),
      detail: env.google.calendarId || "未設定（GOOGLE_CALENDAR_ID）",
    });

    checks.push({
      name: "スプレッドシートID",
      ok: Boolean(env.google.spreadsheetId),
      detail: env.google.spreadsheetId
        ? `${present(env.google.spreadsheetId)}・末尾 ${tail(env.google.spreadsheetId)}`
        : "未設定（GOOGLE_SPREADSHEET_ID）",
    });

    /* ---- 2. Google にログインできるか ---- */
    let authOk = false;
    if (isGoogleEnabled() || isSheetsEnabled()) {
      try {
        await getAccessToken();
        authOk = true;
        checks.push({
          name: "Google への接続（認証）",
          ok: true,
          detail: "成功しました。",
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        checks.push({
          name: "Google への接続（認証）",
          ok: false,
          /* 専門的なエラー文言はそのまま見せず、意味の分かる説明にします */
          detail:
            message.includes("DECODER") || message.includes("unsupported")
              ? "秘密鍵を読み取れませんでした。"
              : message,
          hint: hintFor(message),
        });
      }
    } else {
      checks.push({
        name: "Google への接続（認証）",
        ok: false,
        detail: env.mockMode
          ? "MOCK_MODE が有効なため、接続を行いません。"
          : "必要な設定が揃っていないため、まだ接続していません。",
      });
    }

    /* ---- 3. カレンダーを読めるか ---- */
    if (authOk && isGoogleEnabled()) {
      try {
        const day = await fetchCalendarBusyForDate(todayJst());
        checks.push({
          name: "カレンダーの読み取り",
          ok: true,
          detail: `成功しました（本日の予定 ${day.intervals.length} 件）。`,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        checks.push({
          name: "カレンダーの読み取り",
          ok: false,
          detail: message,
          hint: hintFor(message),
        });
      }
    }

    /* ---- 4. スプレッドシートを読めるか ---- */
    if (authOk && isSheetsEnabled()) {
      try {
        const titles = await listSheetTitles();
        checks.push({
          name: "スプレッドシートの読み取り",
          ok: true,
          detail: `成功しました（シート: ${titles.join(" / ") || "なし"}）。`,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        checks.push({
          name: "スプレッドシートの読み取り",
          ok: false,
          detail: message,
          hint: hintFor(message),
        });
      }
    }

    return ok({
      checks,
      allOk: checks.every((c) => c.ok),
      mockMode: env.mockMode,
    });
  });
}
