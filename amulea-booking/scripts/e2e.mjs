/**
 * 統合テスト（E2E）
 * ==================================================================
 * 本番と同じビルドをローカルで起動し、HTTP 越しに動作を確認します。
 *
 *   npm run e2e
 *
 * 【このテストの役割】
 *   予約システムで「壊れたら営業に直接響く」ところを守ります。
 *     ・二重予約が成立しないこと
 *     ・他人の予約を覗いたり変更したりできないこと
 *     ・ログに電話番号が残らないこと
 *   仕様変更でこれらが崩れたとき、公開前に気づけるようにします。
 *
 * 【安全のための配慮】
 *   テスト用サーバーは必ず MOCK_MODE=true で起動します。
 *   こうすると Google カレンダー・スプレッドシート・LINE へは
 *   一切接続しません。手元に本物の .env.local があっても、
 *   本番のカレンダーに予定を作ってしまう事故が起きません。
 *
 * 【追加ライブラリは使いません】
 *   Node.js に最初から入っている機能だけで書いています。
 */

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ============================================================
   集計
   ============================================================ */

let passed = 0;
const failures = [];

/** 期待どおりかを1件確認します */
function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failures.push({ name, actual: a, expected: e });
    console.log(`  ❌ ${name}（期待:${e} 実際:${a}）`);
  }
}

function section(title) {
  console.log(`\n── ${title} ──`);
}

/* ============================================================
   日付（アプリと同じく日本時間で固定して計算します）
   ============================================================ */

const JST_OFFSET_MIN = 9 * 60;

function todayJst() {
  const now = new Date(Date.now() + JST_OFFSET_MIN * 60_000);
  return now.toISOString().slice(0, 10);
}

function addDays(date, n) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** 0=日曜 … 6=土曜 */
function weekdayOf(date) {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/* ============================================================
   HTTP
   ============================================================ */

let BASE = "";

/** Cookie をブラウザの代わりに保持します（お客様ごと・管理者用に分けます） */
function newJar() {
  return new Map();
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function storeCookies(jar, response) {
  const raw = response.headers.getSetCookie?.() ?? [];
  for (const line of raw) {
    const [pair] = line.split(";");
    const idx = pair.indexOf("=");
    if (idx > 0) jar.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
  }
}

/**
 * API を呼びます。
 * @param opts.jar      Cookie入れ（省略時は未ログイン）
 * @param opts.origin   CSRF確認用。null を渡すと Origin を付けません
 * @param opts.rawBody  文字列をそのまま送ります（形式違いの検証用）
 */
async function api(method, pathname, opts = {}) {
  const headers = {};
  if (opts.jar) {
    const c = cookieHeader(opts.jar);
    if (c) headers.cookie = c;
  }

  let body;
  if (opts.rawBody !== undefined) {
    body = opts.rawBody;
    if (opts.contentType) headers["content-type"] = opts.contentType;
  } else if (opts.body !== undefined) {
    body = JSON.stringify(opts.body);
    headers["content-type"] = "application/json";
  }

  if (method !== "GET" && opts.origin !== null) {
    headers.origin = opts.origin ?? BASE;
  }

  const res = await fetch(BASE + pathname, { method, headers, body, redirect: "manual" });
  if (opts.jar) storeCookies(opts.jar, res);

  let json = null;
  try {
    json = await res.json();
  } catch {
    /* HTML が返る画面などは JSON ではありません */
  }
  return { status: res.status, json, headers: res.headers };
}

const get = (p, o) => api("GET", p, o);
const post = (p, o) => api("POST", p, o);
const patch = (p, o) => api("PATCH", p, o);

/* ============================================================
   テスト用サーバーの起動
   ============================================================ */

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

const ADMIN_PASSWORD = "e2e-admin-password";
let serverLog = "";

async function startServer() {
  if (!existsSync(path.join(ROOT, ".next", "BUILD_ID"))) {
    console.log("本番ビルドが見つかりません。先にビルドします…\n");
    await run("npx", ["next", "build"], {
      SESSION_SECRET: randomBytes(32).toString("hex"),
    });
  }

  const port = await freePort();
  BASE = `http://127.0.0.1:${port}`;

  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    cwd: ROOT,
    env: {
      ...process.env,
      /* ★ 外部サービスへ一切接続させません（本番データを触らないため） */
      MOCK_MODE: "true",
      SESSION_SECRET: randomBytes(32).toString("hex"),
      ADMIN_ID: "admin",
      ADMIN_PASSWORD_HASH: "",
      ADMIN_DEV_PASSWORD: ADMIN_PASSWORD,
      APP_URL: BASE,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (d) => (serverLog += d));
  child.stderr.on("data", (d) => (serverLog += d));

  /* 応答するまで待ちます */
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      const res = await fetch(`${BASE}/api/menus`);
      if (res.ok) break;
    } catch {
      /* まだ起動していません */
    }
    if (Date.now() > deadline) {
      child.kill("SIGKILL");
      throw new Error(`サーバーが起動しませんでした:\n${serverLog}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  return child;
}

function run(cmd, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const c = spawn(cmd, args, {
      cwd: ROOT,
      env: { ...process.env, ...extraEnv },
      stdio: "inherit",
    });
    c.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} が失敗しました（${code}）`)),
    );
  });
}

/* ============================================================
   本編
   ============================================================ */

/** 予約を1件入れます */
async function book(jar, { date, startTime, menuId = "course-quick", name, phone, note = "" }) {
  return post("/api/reservations", {
    jar,
    body: { customerName: name, phone, menuId, optionIds: [], date, startTime, note },
  });
}

/** その日の空き枠の時刻一覧 */
async function openSlots(date, menuId = "course-quick") {
  const r = await get(`/api/availability?date=${date}&menuId=${menuId}`);
  const slots = r.json?.data?.slots ?? [];
  return slots.filter((s) => s.available).map((s) => s.time);
}

async function main() {
  const server = await startServer();
  const TEST_PHONE = "09012345678";
  const TEST_NOTE = "ひみつのご要望メモ";

  try {
    /* ---------------------------------------------------- */
    section("1. 公開ページと公開API");

    const top = await get("/");
    check("トップページが表示される", top.status, 200);

    const menus = await get("/api/menus");
    check("メニュー一覧を取得できる", menus.status, 200);
    check("メニューが1件以上ある", (menus.json?.data?.menus ?? []).length > 0, true);
    check(
      "平日の営業時間が公開される",
      menus.json?.data?.booking?.weekdayHours?.open,
      "13:00",
    );

    /* ---------------------------------------------------- */
    section("2. セキュリティヘッダー");

    check(
      "CSPが返る",
      (top.headers.get("content-security-policy") ?? "").includes("default-src 'self'"),
      true,
    );
    check("iframe埋め込みを禁止している", top.headers.get("x-frame-options"), "DENY");
    check("MIME推測を禁止している", top.headers.get("x-content-type-options"), "nosniff");
    check("Refererを外部へ渡さない", top.headers.get("referrer-policy"), "same-origin");
    check(
      "APIをキャッシュさせない",
      (menus.headers.get("cache-control") ?? "").includes("no-store"),
      true,
    );
    check("サーバーの種類を隠している", top.headers.get("x-powered-by"), null);

    /* ---------------------------------------------------- */
    section("3. ログイン");

    check("未ログインでは予約一覧を見られない", (await get("/api/reservations")).status, 401);
    check(
      "未ログインでは予約できない",
      (await book(null, { date: todayJst(), startTime: "15:00", name: "名無し", phone: TEST_PHONE }))
        .status,
      401,
    );

    const alice = newJar();
    const bob = newJar();
    check("仮ログインできる", (await post("/api/auth/dev", { jar: alice, body: { seat: "1" } })).status, 200);
    await post("/api/auth/dev", { jar: bob, body: { seat: "2" } });

    const me = await get("/api/auth/me", { jar: alice });
    check("ログイン状態を取得できる", me.json?.data?.loggedIn, true);
    check(
      "ログイン情報にLINE userIdを含めない",
      JSON.stringify(me.json).includes("sub") || JSON.stringify(me.json).includes("userId"),
      false,
    );

    /* ---------------------------------------------------- */
    section("4. 管理APIの保護");

    for (const p of [
      "/api/admin/reservations",
      "/api/admin/settings",
      "/api/admin/menus",
      "/api/admin/options",
      "/api/admin/diagnostics",
    ]) {
      check(`未認証で拒否される（${p}）`, (await get(p)).status, 401);
    }

    /* ---------------------------------------------------- */
    section("5. 営業時間と祝日の判定");

    /* 平日（祝日でない）と土曜を、受付期間内から選びます */
    let weekdays = [];
    let saturday = null;
    for (let i = 7; i <= 50 && (weekdays.length < 5 || !saturday); i++) {
      const d = addDays(todayJst(), i);
      const w = weekdayOf(d);
      const res = await get(`/api/availability?date=${d}&menuId=course-quick`);
      const data = res.json?.data;
      if (!data) continue;
      if (w >= 1 && w <= 5 && !data.holidayName && data.open && weekdays.length < 5) {
        weekdays.push(d);
      }
      if (w === 6 && !saturday) saturday = d;
    }
    check("検証に使う平日を確保できた", weekdays.length, 5);

    const wd = await get(`/api/availability?date=${weekdays[0]}&menuId=course-quick`);
    check("平日は13:00開店", wd.json?.data?.hours?.open, "13:00");

    const sat = await get(`/api/availability?date=${saturday}&menuId=course-quick`);
    check("土曜は12:00開店", sat.json?.data?.hours?.open, "12:00");

    /* 祝日の判定は、受付期間の外でも holidayName として返ります */
    const newYear = await get("/api/availability?date=2027-01-01&menuId=course-quick");
    check("元日を祝日と判定する", newYear.json?.data?.holidayName, "元日");

    const respectDay = await get("/api/availability?date=2027-09-20&menuId=course-quick");
    check("敬老の日（9月第3月曜）を判定する", respectDay.json?.data?.holidayName, "敬老の日");

    /* 最終受付20:00 は「開始時刻」の上限。120分コースでも20:00開始は可 */
    const fullCourse = await openSlots(weekdays[0], "course-full");
    check("120分コースでも20:00開始を受け付ける", fullCourse.includes("20:00"), true);
    check("20:30開始は受け付けない（最終受付超過）", fullCourse.includes("20:30"), false);

    const past = await get(`/api/availability?date=${addDays(todayJst(), -1)}&menuId=course-quick`);
    check("過ぎた日付は受け付けない", past.json?.data?.open, false);

    /* ---------------------------------------------------- */
    section("6. 予約の作成と二重予約の防止");

    const dayA = weekdays[0];
    const created = await book(alice, {
      date: dayA,
      startTime: "15:00",
      name: "テスト 太郎",
      phone: TEST_PHONE,
      note: TEST_NOTE,
    });
    check("予約を作成できる", created.status, 200);
    const reservationId = created.json?.data?.reservation?.id;
    check("予約IDが発行される", typeof reservationId === "string" && reservationId.length > 0, true);
    check(
      "予約データにLINE userIdを含めない",
      JSON.stringify(created.json).includes("lineUserId"),
      false,
    );

    const mine = await get("/api/reservations", { jar: alice });
    check("自分の予約一覧に出る", (mine.json?.data?.reservations ?? []).length, 1);

    /* 別のお客様が同じ時間を取ろうとする */
    const dup = await book(bob, {
      date: dayA,
      startTime: "15:00",
      name: "テスト 次郎",
      phone: "08011112222",
    });
    check("同じ時間に二重予約できない", dup.json?.error?.code, "conflict");
    /*
      画面で読みやすいよう改行が入っているため、改行を除いて比べます。
      （要件で決められているのは文言であって、改行位置ではありません）
    */
    check(
      "二重予約のメッセージが所定の文言である",
      (dup.json?.error?.message ?? "").replace(/\n/g, ""),
      "申し訳ありません。この時間は先ほど他のお客様の予約が入りました。別のお時間をお選びください。",
    );

    /* 60分コースなので 15:00〜16:00。30分刻みで前後の枠も埋まる */
    const afterBooking = await openSlots(dayA);
    check("予約時間そのものが埋まる", afterBooking.includes("15:00"), false);
    check("施術中に重なる枠も埋まる", afterBooking.includes("15:30"), false);
    check("施術が始まる前の枠は空いている", afterBooking.includes("14:00"), true);

    /* ---------------------------------------------------- */
    section("7. 他人の予約に触れられないこと");

    check("他人の予約は見られない", (await get(`/api/reservations/${reservationId}`, { jar: bob })).status, 404);
    check(
      "他人の予約は変更できない",
      (await patch(`/api/reservations/${reservationId}`, {
        jar: bob,
        body: { date: weekdays[1], startTime: "16:00" },
      })).status,
      403,
    );
    check(
      "他人の予約はキャンセルできない",
      (await post(`/api/reservations/${reservationId}/cancel`, { jar: bob, body: {} })).status,
      403,
    );
    const bobList = await get("/api/reservations", { jar: bob });
    check("他人の予約は一覧に出ない", (bobList.json?.data?.reservations ?? []).length, 0);

    /* ---------------------------------------------------- */
    section("8. CSRF対策");

    check(
      "外部サイトからの書き込みを拒否",
      (await post("/api/auth/dev", { body: { seat: "9" }, origin: "https://evil.example.com" })).status,
      403,
    );
    check(
      "Originの無い書き込みを拒否",
      (await post("/api/auth/dev", { rawBody: "{}", contentType: "application/json", origin: null })).status,
      403,
    );
    check(
      "フォーム形式の書き込みを拒否",
      (await post("/api/auth/dev", { rawBody: "seat=1", contentType: "application/x-www-form-urlencoded" }))
        .status,
      415,
    );

    /* ---------------------------------------------------- */
    section("9. 入力の検証");

    const invalid = async (body) =>
      (await post("/api/reservations", { jar: alice, body })).status;

    const base = {
      customerName: "テスト 太郎",
      phone: TEST_PHONE,
      menuId: "course-quick",
      optionIds: [],
      date: weekdays[1],
      startTime: "16:00",
      note: "",
    };
    check("電話番号の形式を検証する", await invalid({ ...base, phone: "あいうえお" }), 400);
    check("名前は必須", await invalid({ ...base, customerName: "" }), 400);
    check("存在しない日付を拒否", await invalid({ ...base, date: "2026-02-30" }), 400);
    check("存在しないメニューを拒否", await invalid({ ...base, menuId: "no-such-menu" }), 400);
    check("長すぎる自由記載を拒否", await invalid({ ...base, note: "あ".repeat(2000) }), 400);

    /* ---------------------------------------------------- */
    section("10. 変更とキャンセル");

    const dayB = weekdays[2];
    const changed = await patch(`/api/reservations/${reservationId}`, {
      jar: alice,
      body: { date: dayB, startTime: "17:00" },
    });
    check("予約を変更できる", changed.status, 200);
    check("変更後の日付が反映される", changed.json?.data?.reservation?.date, dayB);

    const restoredA = await openSlots(dayA);
    check("変更元の枠が元に戻る", restoredA.includes("15:00"), true);

    const cancelled = await post(`/api/reservations/${reservationId}/cancel`, {
      jar: alice,
      body: {},
    });
    check("予約をキャンセルできる", cancelled.status, 200);

    const detail = await get(`/api/reservations/${reservationId}`, { jar: alice });
    check("キャンセル済みの状態になる", detail.json?.data?.reservation?.status, "cancelled");

    const restoredB = await openSlots(dayB);
    check("キャンセルで枠が元に戻る", restoredB.includes("17:00"), true);

    /* ---------------------------------------------------- */
    section("11. 管理画面");

    const admin = newJar();
    const badLogin = await post("/api/admin/login", {
      jar: admin,
      body: { id: "admin", password: "まちがったパスワード" },
    });
    check("誤ったパスワードを拒否", badLogin.status, 401);

    const login = await post("/api/admin/login", {
      jar: admin,
      body: { id: "admin", password: ADMIN_PASSWORD },
    });
    check("管理者としてログインできる", login.status, 200);
    check("管理者の予約一覧を取得できる", (await get("/api/admin/reservations", { jar: admin })).status, 200);

    const dayC = weekdays[3];
    const manual = await post("/api/admin/reservations", {
      jar: admin,
      body: {
        customerName: "電話 花子",
        phone: "08099998888",
        menuId: "course-quick",
        optionIds: [],
        date: dayC,
        startTime: "14:00",
        note: "",
      },
    });
    check("管理画面から手動で予約を登録できる", manual.status, 200);
    check("手動予約はLINEと紐づかない", manual.json?.data?.reservation?.hasLineUser, false);
    check(
      "管理APIもLINE userIdを返さない",
      JSON.stringify(manual.json).includes("lineUserId"),
      false,
    );

    const afterManual = await openSlots(dayC);
    check("手動予約も空き枠に反映される", afterManual.includes("14:00"), false);

    /* ---------------------------------------------------- */
    section("12. ログに個人情報を残さないこと");

    check("ログに電話番号が出ていない", serverLog.includes(TEST_PHONE), false);
    check("ログに自由記載が出ていない", serverLog.includes(TEST_NOTE), false);
    check("ログにお客様の氏名が出ていない", serverLog.includes("テスト 太郎"), false);
  } finally {
    server.kill("SIGKILL");
  }

  /* ---------------------------------------------------- */
  console.log("\n" + "═".repeat(40));
  console.log(`  成功 ${passed} 件 / 失敗 ${failures.length} 件`);
  console.log("═".repeat(40));

  if (failures.length > 0) {
    console.log("\n失敗した項目:");
    for (const f of failures) {
      console.log(`  ・${f.name}\n      期待: ${f.expected}\n      実際: ${f.actual}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\nテストの実行自体が失敗しました:\n", e);
  process.exit(1);
});
