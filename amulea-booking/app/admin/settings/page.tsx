/**
 * 設定（管理画面）
 * ==================================================================
 * 営業時間・準備時間・休業日・受付停止・LINE通知の設定を行います。
 * メニューと料金もここから編集できます。
 *
 * ★ 保存した内容はスプレッドシートに記録されます。
 *   コードを書き換える必要はありません。
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { Loading, Notice } from "@/components/ui/Notice";
import { apiGet, apiPut } from "@/lib/client/api";
import { formatDateShortJa, todayJst } from "@/lib/util/datetime";

type DayHours = { open: string; lastStart: string; close: string };
type ClosedDate = { date: string; reason: string };
type BlockedSlot = { id: string; date: string; start: string; end: string; reason: string };

type Settings = {
  weekdayHours: DayHours;
  holidayHours: DayHours;
  slotIntervalMin: number;
  bufferBeforeMin: number;
  bufferAfterMin: number;
  regularClosedWeekdays: number[];
  closedDates: ClosedDate[];
  specialHours: Array<DayHours & { date: string; label: string }>;
  blockedSlots: BlockedSlot[];
  acceptingReservations: boolean;
  suspendedMessage: string;
  maxAdvanceDays: number;
  minAdvanceHours: number;
  changeDeadlineHours: number;
  notify: {
    customerOnCreate: boolean;
    customerOnChange: boolean;
    customerOnCancel: boolean;
    adminOnCreate: boolean;
    adminOnChange: boolean;
    adminOnCancel: boolean;
  };
};

type Menu = {
  id: string;
  name: string;
  description: string;
  category: "course" | "partial" | "secret";
  durationMin: number;
  price: number;
  order: number;
  visible: boolean;
};

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];
const BUFFERS = [0, 15, 30, 45, 60];

function SettingsForm({ lineEnabled }: { lineEnabled: boolean }) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");

  const [newClosedDate, setNewClosedDate] = useState(todayJst());
  const [newClosedReason, setNewClosedReason] = useState("");

  const [newBlock, setNewBlock] = useState({
    date: todayJst(),
    start: "13:00",
    end: "15:00",
    reason: "",
  });

  useEffect(() => {
    void (async () => {
      const [s, m] = await Promise.all([
        apiGet<{ settings: Settings }>("/api/admin/settings"),
        apiGet<{ menus: Menu[] }>("/api/admin/menus"),
      ]);
      if (s.ok) setSettings(s.data.settings);
      if (m.ok) setMenus(m.data.menus);
      setLoading(false);
    })();
  }, []);

  const patch = useCallback((update: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...update } : s));
  }, []);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");

    const result = await apiPut<{ settings: Settings }>("/api/admin/settings", settings);
    if (!result.ok) {
      setTone("error");
      setMessage(result.error.message);
    } else {
      setSettings(result.data.settings);
      setTone("success");
      setMessage("設定を保存しました。");
    }
    setSaving(false);
  }, [settings]);

  const saveMenus = useCallback(async () => {
    setSaving(true);
    setMessage("");
    const result = await apiPut<{ menus: Menu[] }>("/api/admin/menus", { menus });
    if (!result.ok) {
      setTone("error");
      setMessage(result.error.message);
    } else {
      setMenus(result.data.menus);
      setTone("success");
      setMessage("メニューを保存しました。");
    }
    setSaving(false);
  }, [menus]);

  if (loading) return <Loading />;
  if (!settings) return <Notice tone="error">設定を読み込めませんでした。</Notice>;

  return (
    <div className="flex flex-col gap-8 pb-6">
      {message && <Notice tone={tone}>{message}</Notice>}

      <Diagnostics />

      {/* ============ 予約の受付 ============ */}
      <Section title="予約の受付" description="一時的に新規予約を止めたいときに使います。">
        <Toggle
          label="新規予約を受け付ける"
          checked={settings.acceptingReservations}
          onChange={(v) => patch({ acceptingReservations: v })}
        />
        {!settings.acceptingReservations && (
          <Textarea
            label="受付停止中にお客様へ表示する文章"
            value={settings.suspendedMessage}
            onChange={(v) => patch({ suspendedMessage: v })}
          />
        )}
      </Section>

      {/* ============ 営業時間 ============ */}
      <Section
        title="営業時間"
        description="最終受付は「施術を始められる最後の時刻」です。20:00 の 120 分コースは 22:00 終了となり、営業終了が 23:00 なら予約できます。"
      >
        <HoursEditor
          label="平日（月〜金）"
          value={settings.weekdayHours}
          onChange={(v) => patch({ weekdayHours: v })}
        />
        <HoursEditor
          label="土・日・祝"
          value={settings.holidayHours}
          onChange={(v) => patch({ holidayHours: v })}
        />
        <p className="text-[0.78rem] leading-relaxed text-umber-400">
          日本の祝日は自動で判定されます（振替休日・国民の休日を含みます）。
        </p>
      </Section>

      {/* ============ 予約枠 ============ */}
      <Section
        title="予約枠と準備時間"
        description="施術の前後に確保する時間です。設定するとその分だけ予約枠が長くなります。"
      >
        <Select
          label="予約枠の刻み"
          value={String(settings.slotIntervalMin)}
          options={[10, 15, 20, 30, 60].map((n) => [String(n), `${n}分ごと`])}
          onChange={(v) => patch({ slotIntervalMin: Number(v) })}
        />
        <Select
          label="施術前の準備時間"
          value={String(settings.bufferBeforeMin)}
          options={BUFFERS.map((n) => [String(n), `${n}分`])}
          onChange={(v) => patch({ bufferBeforeMin: Number(v) })}
        />
        <Select
          label="施術後の片付け時間"
          value={String(settings.bufferAfterMin)}
          options={BUFFERS.map((n) => [String(n), `${n}分`])}
          onChange={(v) => patch({ bufferAfterMin: Number(v) })}
        />
      </Section>

      {/* ============ 受付期間 ============ */}
      <Section title="受付期間">
        <NumberField
          label="何日先まで予約を受け付けるか"
          value={settings.maxAdvanceDays}
          onChange={(v) => patch({ maxAdvanceDays: v })}
          suffix="日先まで"
          min={1}
          max={365}
        />
        <NumberField
          label="何時間後から予約を受け付けるか"
          value={settings.minAdvanceHours}
          onChange={(v) => patch({ minAdvanceHours: v })}
          suffix="時間後から"
          min={0}
          max={168}
        />
        <NumberField
          label="変更・キャンセルの締切"
          value={settings.changeDeadlineHours}
          onChange={(v) => patch({ changeDeadlineHours: v })}
          suffix="時間前まで"
          min={0}
          max={168}
        />
      </Section>

      {/* ============ 定休日 ============ */}
      <Section
        title="定休日"
        description="毎週決まった休みがある場合に選びます。不定休の場合は選択不要です。"
      >
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((label, index) => {
            const on = settings.regularClosedWeekdays.includes(index);
            return (
              <button
                key={label}
                type="button"
                onClick={() =>
                  patch({
                    regularClosedWeekdays: on
                      ? settings.regularClosedWeekdays.filter((d) => d !== index)
                      : [...settings.regularClosedWeekdays, index],
                  })
                }
                className={`h-12 w-12 rounded-full border text-[0.9rem] transition-colors ${
                  on
                    ? "border-umber-700 bg-umber-700 text-champagne-100"
                    : "border-champagne-500/30 bg-white text-umber-600"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ============ 臨時休業 ============ */}
      <Section
        title="臨時休業日"
        description="Google カレンダーに終日予定を入れても、その日は自動で休業になります。"
      >
        <div className="flex flex-col gap-2">
          {settings.closedDates.length === 0 && (
            <p className="text-[0.85rem] text-umber-400">登録されていません。</p>
          )}
          {settings.closedDates
            .slice()
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .map((c) => (
              <div
                key={c.date}
                className="flex items-center gap-3 rounded-xl border border-champagne-500/25 bg-white/70 px-4 py-3"
              >
                <span className="text-[0.9rem] text-umber-800">
                  {formatDateShortJa(c.date)}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.82rem] text-umber-500">
                  {c.reason}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      closedDates: settings.closedDates.filter((x) => x.date !== c.date),
                    })
                  }
                  className="shrink-0 text-[0.8rem] text-clay underline underline-offset-4"
                >
                  削除
                </button>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-champagne-500/40 p-4">
          <input
            type="date"
            value={newClosedDate}
            onChange={(e) => setNewClosedDate(e.target.value)}
            aria-label="休業日"
            className="min-h-[48px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800"
          />
          <input
            value={newClosedReason}
            onChange={(e) => setNewClosedReason(e.target.value)}
            placeholder="理由（お客様に表示されます）"
            maxLength={60}
            aria-label="休業の理由"
            className="min-h-[48px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800"
          />
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              if (!newClosedDate) return;
              if (settings.closedDates.some((c) => c.date === newClosedDate)) return;
              patch({
                closedDates: [
                  ...settings.closedDates,
                  {
                    date: newClosedDate,
                    reason: newClosedReason || "お休みをいただいております。",
                  },
                ],
              });
              setNewClosedReason("");
            }}
          >
            休業日を追加
          </Button>
        </div>
      </Section>

      {/* ============ 受付停止時間 ============ */}
      <Section
        title="予約受付を止める時間帯"
        description="その日の一部の時間だけ予約を止めたいときに使います（用事・私用など）。"
      >
        <div className="flex flex-col gap-2">
          {settings.blockedSlots.length === 0 && (
            <p className="text-[0.85rem] text-umber-400">登録されていません。</p>
          )}
          {settings.blockedSlots
            .slice()
            .sort((a, b) => (a.date + a.start < b.date + b.start ? -1 : 1))
            .map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-xl border border-champagne-500/25 bg-white/70 px-4 py-3"
              >
                <span className="text-[0.85rem] text-umber-800">
                  {formatDateShortJa(b.date)} {b.start}〜{b.end}
                </span>
                <span className="min-w-0 flex-1 truncate text-[0.8rem] text-umber-500">
                  {b.reason}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      blockedSlots: settings.blockedSlots.filter((x) => x.id !== b.id),
                    })
                  }
                  className="shrink-0 text-[0.8rem] text-clay underline underline-offset-4"
                >
                  削除
                </button>
              </div>
            ))}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-champagne-500/40 p-4">
          <input
            type="date"
            value={newBlock.date}
            onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
            aria-label="受付停止の日付"
            className="min-h-[48px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800"
          />
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={newBlock.start}
              onChange={(e) => setNewBlock({ ...newBlock, start: e.target.value })}
              aria-label="開始時刻"
              className="min-h-[48px] flex-1 rounded-xl border border-champagne-500/30 bg-white px-3 text-umber-800"
            />
            <span className="text-umber-400">〜</span>
            <input
              type="time"
              value={newBlock.end}
              onChange={(e) => setNewBlock({ ...newBlock, end: e.target.value })}
              aria-label="終了時刻"
              className="min-h-[48px] flex-1 rounded-xl border border-champagne-500/30 bg-white px-3 text-umber-800"
            />
          </div>
          <input
            value={newBlock.reason}
            onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
            placeholder="メモ（管理者のみ表示）"
            maxLength={60}
            aria-label="受付停止のメモ"
            className="min-h-[48px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800"
          />
          <Button
            variant="outline"
            size="md"
            onClick={() => {
              if (!newBlock.date || newBlock.start >= newBlock.end) return;
              patch({
                blockedSlots: [
                  ...settings.blockedSlots,
                  { ...newBlock, id: `block-${Date.now()}` },
                ],
              });
              setNewBlock({ ...newBlock, reason: "" });
            }}
          >
            受付停止を追加
          </Button>
        </div>
      </Section>

      {/* ============ LINE 通知 ============ */}
      <Section
        title="LINE通知"
        description={
          lineEnabled
            ? "送信する通知を選べます。"
            : "LINE Messaging API が未設定のため、通知は送信されません（設定だけ保存できます）。"
        }
      >
        <p className="text-[0.78rem] tracking-[0.16em] text-champagne-700">お客様へ</p>
        <Toggle
          label="予約完了時"
          checked={settings.notify.customerOnCreate}
          onChange={(v) => patch({ notify: { ...settings.notify, customerOnCreate: v } })}
        />
        <Toggle
          label="予約変更時"
          checked={settings.notify.customerOnChange}
          onChange={(v) => patch({ notify: { ...settings.notify, customerOnChange: v } })}
        />
        <Toggle
          label="キャンセル時"
          checked={settings.notify.customerOnCancel}
          onChange={(v) => patch({ notify: { ...settings.notify, customerOnCancel: v } })}
        />

        <p className="mt-3 text-[0.78rem] tracking-[0.16em] text-champagne-700">
          管理者へ
        </p>
        <Toggle
          label="新規予約が入ったとき"
          checked={settings.notify.adminOnCreate}
          onChange={(v) => patch({ notify: { ...settings.notify, adminOnCreate: v } })}
        />
        <Toggle
          label="予約が変更されたとき"
          checked={settings.notify.adminOnChange}
          onChange={(v) => patch({ notify: { ...settings.notify, adminOnChange: v } })}
        />
        <Toggle
          label="キャンセルされたとき"
          checked={settings.notify.adminOnCancel}
          onChange={(v) => patch({ notify: { ...settings.notify, adminOnCancel: v } })}
        />
      </Section>

      <Button block loading={saving} onClick={() => void saveSettings()}>
        設定を保存する
      </Button>

      {/* ============ メニュー ============ */}
      <Section
        title="メニューと料金"
        description="非表示にすると、お客様の予約画面には出なくなります（過去の予約はそのまま残ります）。"
      >
        <div className="flex flex-col gap-3">
          {menus.map((menu, index) => (
            <div
              key={menu.id}
              className="flex flex-col gap-2 rounded-xl border border-champagne-500/25 bg-white/70 p-4"
            >
              <input
                value={menu.name}
                onChange={(e) => {
                  const next = [...menus];
                  next[index] = { ...menu, name: e.target.value };
                  setMenus(next);
                }}
                aria-label="メニュー名"
                className="min-h-[46px] rounded-lg border border-champagne-500/30 bg-white px-3 text-umber-800"
              />
              <div className="flex gap-2">
                <label className="flex flex-1 items-center gap-2 rounded-lg border border-champagne-500/30 bg-white px-3">
                  <input
                    type="number"
                    value={menu.durationMin}
                    min={5}
                    max={600}
                    onChange={(e) => {
                      const next = [...menus];
                      next[index] = { ...menu, durationMin: Number(e.target.value) };
                      setMenus(next);
                    }}
                    aria-label="施術時間"
                    className="min-h-[46px] w-full bg-transparent text-umber-800 focus:outline-none"
                  />
                  <span className="shrink-0 text-[0.8rem] text-umber-400">分</span>
                </label>
                <label className="flex flex-1 items-center gap-2 rounded-lg border border-champagne-500/30 bg-white px-3">
                  <input
                    type="number"
                    value={menu.price}
                    min={0}
                    step={100}
                    onChange={(e) => {
                      const next = [...menus];
                      next[index] = { ...menu, price: Number(e.target.value) };
                      setMenus(next);
                    }}
                    aria-label="料金"
                    className="min-h-[46px] w-full bg-transparent text-umber-800 focus:outline-none"
                  />
                  <span className="shrink-0 text-[0.8rem] text-umber-400">円</span>
                </label>
              </div>
              <Toggle
                label="お客様の画面に表示する"
                checked={menu.visible}
                onChange={(v) => {
                  const next = [...menus];
                  next[index] = { ...menu, visible: v };
                  setMenus(next);
                }}
              />
            </div>
          ))}
        </div>

        <Button variant="outline" block loading={saving} onClick={() => void saveMenus()}>
          メニューを保存する
        </Button>

        <p className="text-[0.78rem] leading-relaxed text-umber-400">
          メニューの新規追加・削除は、現在この画面では行えません。
          追加が必要な場合は開発者にご相談ください
          （データ構造としては追加できるようになっています）。
        </p>
      </Section>
    </div>
  );
}

/* ==================================================================
   小さな部品
   ================================================================== */

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-[0.95rem] tracking-[0.12em] text-umber-800">{title}</h2>
        {description && (
          <p className="mt-1 text-[0.78rem] leading-relaxed text-umber-400">
            {description}
          </p>
        )}
      </div>
      <div className="gold-rule" aria-hidden="true" />
      {children}
    </section>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-[48px] cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[#bc9a57]"
      />
      <span className="text-[0.9rem] text-umber-700">{label}</span>
    </label>
  );
}

function HoursEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: DayHours;
  onChange: (value: DayHours) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-champagne-500/25 bg-white/70 p-4">
      <p className="text-[0.85rem] text-umber-700">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["open", "開店"],
            ["lastStart", "最終受付"],
            ["close", "閉店"],
          ] as const
        ).map(([key, text]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-[0.7rem] text-umber-400">{text}</span>
            <input
              type="time"
              value={value[key]}
              onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              className="min-h-[46px] rounded-lg border border-champagne-500/30 bg-white px-2 text-center text-umber-800"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-[0.9rem] text-umber-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[48px] min-w-[7.5rem] rounded-xl border border-champagne-500/30 bg-white px-3 text-umber-800"
      >
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  min: number;
  max: number;
}) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="flex-1 text-[0.9rem] text-umber-700">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-h-[48px] w-20 rounded-xl border border-champagne-500/30 bg-white px-3 text-center text-umber-800"
        />
        <span className="shrink-0 text-[0.78rem] text-umber-400">{suffix}</span>
      </span>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.85rem] text-umber-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        maxLength={200}
        className="rounded-xl border border-champagne-500/30 bg-white px-4 py-3 text-umber-800"
      />
    </label>
  );
}

/* ==================================================================
   接続診断
   ------------------------------------------------------------------
   Google 連携がうまくいかないときに、どこで止まっているかを
   その場で確認できるようにします。
   ================================================================== */

type Check = { name: string; ok: boolean; detail: string; hint?: string };

function Diagnostics() {
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");

  const run = useCallback(async () => {
    setRunning(true);
    setError("");
    const result = await apiGet<{ checks: Check[] }>("/api/admin/diagnostics");
    if (result.ok) setChecks(result.data.checks);
    else setError(result.error.message);
    setRunning(false);
  }, []);

  return (
    <Section
      title="接続診断"
      description="Google カレンダー・スプレッドシートに正しくつながっているかを確認します。うまく動かないときにお使いください。"
    >
      <Button variant="outline" size="md" loading={running} onClick={() => void run()}>
        接続を確認する
      </Button>

      {error && <Notice tone="error">{error}</Notice>}

      {checks && (
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li
              key={c.name}
              className={`rounded-xl border p-3 ${
                c.ok
                  ? "border-forest/25 bg-forest-light"
                  : "border-clay/30 bg-clay-light"
              }`}
            >
              <p className="flex items-center gap-2 text-[0.88rem] text-umber-800">
                <span aria-hidden="true">{c.ok ? "✅" : "❌"}</span>
                {c.name}
              </p>
              <p className="mt-1 text-[0.78rem] leading-relaxed break-all text-umber-600">
                {c.detail}
              </p>
              {!c.ok && c.hint && (
                <p className="mt-1.5 text-[0.78rem] leading-relaxed text-clay">
                  → {c.hint}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export default function AdminSettingsPage() {
  return (
    <AdminShell title="設定">
      {(info) => <SettingsForm lineEnabled={info.integrations.lineMessaging} />}
    </AdminShell>
  );
}
