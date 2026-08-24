/**
 * 予約フォーム（ステップ形式）
 * ==================================================================
 * STEP 1 メニュー選択
 * STEP 2 オプション選択
 * STEP 3 日付選択
 * STEP 4 時間選択
 * STEP 5 お名前・電話番号・ご要望
 * STEP 6 内容確認
 * STEP 7 予約確定
 *
 * ★ スマートフォン最優先の工夫
 *   ・進むボタンは常に画面下に固定（片手で押せます）
 *   ・入力内容は自動保存され、戻っても消えません
 *   ・ブラウザの「戻る」でも1ステップずつ戻れます
 *   ・入力は必要最小限（名前・電話番号のみ必須）
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { Card, Content, Brand, Screen, StickyFooter } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";
import DatePicker from "./DatePicker";
import StepIndicator from "./StepIndicator";
import TimeSlots from "./TimeSlots";
import { formatDateJa, formatPrice, timeToMinutes, minutesToTime } from "@/lib/util/datetime";
import type { Session } from "@/components/SessionGate";

/* ------------------------------------------------------------------
   型
   ------------------------------------------------------------------ */

type Menu = {
  id: string;
  name: string;
  description: string;
  category: "course" | "partial" | "secret";
  durationMin: number;
  price: number;
};

type Option = {
  id: string;
  name: string;
  description: string;
  price: number;
  extraDurationMin: number;
};

type BookingConfig = {
  acceptingReservations: boolean;
  suspendedMessage: string;
  maxAdvanceDays: number;
  minAdvanceHours: number;
  changeDeadlineHours: number;
};

type MenusResponse = { menus: Menu[]; options: Option[]; booking: BookingConfig };

/** 入力途中の内容（自動保存されます） */
type Draft = {
  menuId: string | null;
  optionIds: string[];
  date: string | null;
  startTime: string | null;
  customerName: string;
  phone: string;
  note: string;
};

const EMPTY_DRAFT: Draft = {
  menuId: null,
  optionIds: [],
  date: null,
  startTime: null,
  customerName: "",
  phone: "",
  note: "",
};

/** 入力内容の一時保存先（このタブを閉じるまで保持されます） */
const DRAFT_KEY = "amulea.booking.draft";

const STEP_COUNT = 6;

/** 各ステップが、上部の進行表示のどれに当たるか */
const STEP_TO_INDICATOR = [1, 1, 2, 2, 3, 4];

const CATEGORY_LABELS: Record<Menu["category"], string> = {
  course: "全身コース",
  partial: "部分コース",
  secret: "隠れメニュー",
};

/* ------------------------------------------------------------------
   本体
   ------------------------------------------------------------------ */

export default function BookingWizard({ session }: { session: Session }) {
  const router = useRouter();

  const [config, setConfig] = useState<MenusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [restored, setRestored] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const topRef = useRef<HTMLDivElement>(null);

  /* ---------------- 初期読み込み ---------------- */
  useEffect(() => {
    void (async () => {
      const result = await apiGet<MenusResponse>("/api/menus");
      if (result.ok) setConfig(result.data);
      else setLoadError(result.error.message);
      setLoading(false);
    })();
  }, []);

  /* ---------------- 入力内容の復元 ----------------
     「戻る」操作や、うっかり画面を離れても入力が消えないようにします */
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<Draft>;
        setDraft({ ...EMPTY_DRAFT, ...parsed });
      }
    } catch {
      /* 保存領域が使えない環境でも動作を止めません */
    }
    setRestored(true);
  }, []);

  /* ---------------- 入力内容の自動保存 ---------------- */
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* 保存できなくても操作は続けられます */
    }
  }, [draft, restored]);

  /* ---------------- お名前の初期値 ----------------
     LINE の表示名を初期値に入れて、入力の手間を減らします */
  useEffect(() => {
    if (!restored) return;
    setDraft((d) => (d.customerName ? d : { ...d, customerName: session.name }));
  }, [restored, session.name]);

  /* ---------------- ステップ移動時に上へスクロール ---------------- */
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  /* ---------------- ブラウザの「戻る」で1ステップ戻す ---------------- */
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const target = (event.state as { step?: number } | null)?.step;
      if (typeof target === "number") setStep(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const goTo = useCallback((next: number) => {
    setStep(next);
    setSubmitError("");
    window.history.pushState({ step: next }, "");
  }, []);

  const goBack = useCallback(() => {
    setSubmitError("");
    window.history.back();
  }, []);

  const update = useCallback((patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  /* ---------------- 選択中の内容から金額・時間を計算 ---------------- */
  const selected = useMemo(() => {
    if (!config || !draft.menuId) return null;
    const menu = config.menus.find((m) => m.id === draft.menuId);
    if (!menu) return null;

    const options = config.options.filter((o) => draft.optionIds.includes(o.id));
    const optionPrice = options.reduce((sum, o) => sum + o.price, 0);
    const extra = options.reduce((sum, o) => sum + o.extraDurationMin, 0);

    return {
      menu,
      options,
      totalDurationMin: menu.durationMin + extra,
      totalPrice: menu.price + optionPrice,
    };
  }, [config, draft.menuId, draft.optionIds]);

  /* ---------------- 予約の確定 ---------------- */
  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError("");

    const result = await apiPost<{ reservation: { id: string } }>("/api/reservations", {
      customerName: draft.customerName,
      phone: draft.phone,
      menuId: draft.menuId,
      optionIds: draft.optionIds,
      date: draft.date,
      startTime: draft.startTime,
      note: draft.note,
    });

    if (!result.ok) {
      setSubmitError(result.error.message);
      setSubmitting(false);

      /*
        二重予約で失敗した場合は、時間の選び直しへ戻します。
        （同じ画面で「確定」を押し続けても状況は変わらないため）
      */
      if (result.error.code === "conflict" || result.error.code === "unavailable") {
        update({ startTime: null });
        goTo(4);
      }
      return;
    }

    /* 予約が取れたので、下書きを消してから完了画面へ移動します */
    try {
      sessionStorage.removeItem(DRAFT_KEY);
    } catch {
      /* 消せなくても支障はありません */
    }
    router.replace(`/reservation/complete?id=${result.data.reservation.id}`);
  }, [draft, router, goTo, update]);

  /* ---------------- 画面 ---------------- */

  if (loading) {
    return (
      <Screen>
        <Brand />
        <Content>
          <Loading />
        </Content>
      </Screen>
    );
  }

  if (loadError || !config) {
    return (
      <Screen>
        <Brand />
        <Content>
          <Notice tone="error">{loadError || "メニューを読み込めませんでした。"}</Notice>
        </Content>
      </Screen>
    );
  }

  /* 予約受付を停止している場合 */
  if (!config.booking.acceptingReservations) {
    return (
      <Screen>
        <Brand />
        <Content className="flex flex-col justify-center gap-6">
          <Notice tone="info">{config.booking.suspendedMessage}</Notice>
          <Button variant="outline" onClick={() => router.push("/")} block>
            トップへ戻る
          </Button>
        </Content>
      </Screen>
    );
  }

  /* 次へ進めるかどうか */
  const canProceed =
    (step === 1 && Boolean(draft.menuId)) ||
    step === 2 ||
    (step === 3 && Boolean(draft.date)) ||
    (step === 4 && Boolean(draft.startTime)) ||
    (step === 5 && draft.customerName.trim() !== "" && draft.phone.trim() !== "");

  const endTime =
    draft.startTime && selected
      ? minutesToTime(timeToMinutes(draft.startTime) + selected.totalDurationMin)
      : null;

  return (
    <Screen>
      <Brand />

      <div ref={topRef} className="border-b border-champagne-500/15 px-5 py-4">
        <StepIndicator current={STEP_TO_INDICATOR[step - 1]} />
      </div>

      <Content className="flex flex-col gap-6">
        {/* ============ STEP 1 メニュー ============ */}
        {step === 1 && (
          <Step title="メニューをお選びください" en="Menu">
            {(["course", "partial", "secret"] as const).map((category) => {
              const items = config.menus.filter((m) => m.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="flex flex-col gap-2.5">
                  <p className="text-[0.78rem] tracking-[0.2em] text-champagne-700">
                    {CATEGORY_LABELS[category]}
                  </p>
                  {items.map((menu) => (
                    <SelectableCard
                      key={menu.id}
                      selected={draft.menuId === menu.id}
                      onClick={() =>
                        update({ menuId: menu.id, startTime: null })
                      }
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[1.02rem] text-umber-800">{menu.name}</span>
                        <span className="shrink-0 text-[0.8rem] text-champagne-700">
                          {menu.durationMin}分
                        </span>
                      </div>
                      <p className="mt-1 text-[0.8rem] leading-relaxed text-umber-500">
                        {menu.description}
                      </p>
                      <p className="mt-2 text-[1rem] text-umber-800">
                        {formatPrice(menu.price)}
                      </p>
                    </SelectableCard>
                  ))}
                </div>
              );
            })}
          </Step>
        )}

        {/* ============ STEP 2 オプション ============ */}
        {step === 2 && (
          <Step title="オプションはいかがですか" en="Option">
            <p className="text-[0.85rem] leading-relaxed text-umber-500">
              追加しない場合は、そのまま次へお進みください。
            </p>
            {config.options.map((option) => {
              const checked = draft.optionIds.includes(option.id);
              return (
                <SelectableCard
                  key={option.id}
                  selected={checked}
                  onClick={() =>
                    update({
                      optionIds: checked
                        ? draft.optionIds.filter((id) => id !== option.id)
                        : [...draft.optionIds, option.id],
                      startTime: null,
                    })
                  }
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[1rem] text-umber-800">{option.name}</span>
                    <span className="shrink-0 text-[0.95rem] text-umber-700">
                      ＋{formatPrice(option.price)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.8rem] leading-relaxed text-umber-500">
                    {option.description}
                  </p>
                  {option.extraDurationMin > 0 && (
                    <p className="mt-1 text-[0.75rem] text-champagne-700">
                      施術時間が {option.extraDurationMin} 分長くなります
                    </p>
                  )}
                </SelectableCard>
              );
            })}
          </Step>
        )}

        {/* ============ STEP 3 日付 ============ */}
        {step === 3 && selected && (
          <Step title="ご希望の日を選んでください" en="Date">
            <SelectionSummary text={`${selected.menu.name}（${selected.totalDurationMin}分）`} />
            <DatePicker
              value={draft.date}
              onChange={(date) => update({ date, startTime: null })}
              menuId={selected.menu.id}
              optionIds={draft.optionIds}
              maxAdvanceDays={config.booking.maxAdvanceDays}
            />
          </Step>
        )}

        {/* ============ STEP 4 時間 ============ */}
        {step === 4 && selected && draft.date && (
          <Step title="ご希望の時間を選んでください" en="Time">
            <SelectionSummary text={formatDateJa(draft.date)} />
            <TimeSlots
              date={draft.date}
              menuId={selected.menu.id}
              optionIds={draft.optionIds}
              value={draft.startTime}
              onChange={(startTime) => update({ startTime })}
            />
          </Step>
        )}

        {/* ============ STEP 5 お客様情報 ============ */}
        {step === 5 && (
          <Step title="お客様情報をご入力ください" en="Information">
            <Field
              label="お名前"
              required
              value={draft.customerName}
              onChange={(v) => update({ customerName: v })}
              autoComplete="name"
              placeholder="山田 花子"
              maxLength={40}
            />
            <Field
              label="電話番号"
              required
              value={draft.phone}
              onChange={(v) => update({ phone: v })}
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="09012345678"
              maxLength={20}
              hint="ハイフンなしでご入力ください。当日の緊急連絡にのみ使用します。"
            />
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="note"
                className="text-[0.85rem] tracking-[0.08em] text-umber-700"
              >
                ご要望など
                <span className="ml-2 text-[0.72rem] text-umber-400">任意</span>
              </label>
              <textarea
                id="note"
                value={draft.note}
                onChange={(e) => update({ note: e.target.value })}
                rows={4}
                maxLength={500}
                placeholder="お身体で気になる部分、力加減のご希望など"
                className="rounded-xl border border-champagne-500/30 bg-white/80 px-4 py-3 leading-relaxed text-umber-800 placeholder:text-umber-200 focus:border-champagne-500 focus:outline-none"
              />
            </div>
          </Step>
        )}

        {/* ============ STEP 6 確認 ============ */}
        {step === 6 && selected && draft.date && draft.startTime && (
          <Step title="ご予約内容のご確認" en="Confirm">
            <Card className="flex flex-col gap-4">
              <Row label="日時">
                {formatDateJa(draft.date)}
                <br />
                {draft.startTime}
                {endTime ? `〜${endTime}` : "〜"}
              </Row>
              <Row label="メニュー">
                {selected.menu.name}
                <span className="ml-2 text-[0.82rem] text-umber-500">
                  {selected.menu.durationMin}分
                </span>
              </Row>
              {selected.options.length > 0 && (
                <Row label="オプション">
                  {selected.options.map((o) => o.name).join("・")}
                </Row>
              )}
              <Row label="お名前">{draft.customerName} 様</Row>
              <Row label="電話番号">{draft.phone}</Row>
              {draft.note && <Row label="ご要望">{draft.note}</Row>}

              <div className="gold-rule" aria-hidden="true" />

              <div className="flex items-baseline justify-between">
                <span className="text-[0.85rem] tracking-[0.1em] text-umber-500">
                  合計
                </span>
                <span className="text-[1.35rem] text-umber-800">
                  {formatPrice(selected.totalPrice)}
                </span>
              </div>
            </Card>

            <p className="text-[0.78rem] leading-relaxed text-umber-400">
              ご予約の変更・キャンセルは、施術開始の
              {config.booking.changeDeadlineHours}時間前まで
              「予約確認」画面から承ります。
            </p>

            {submitError && <Notice tone="error">{submitError}</Notice>}
          </Step>
        )}
      </Content>

      {/* ============ 画面下の操作 ============ */}
      <StickyFooter>
        <div className="flex flex-col gap-2 pb-2">
          {step < STEP_COUNT ? (
            <Button block disabled={!canProceed} onClick={() => goTo(step + 1)}>
              次へ進む
            </Button>
          ) : (
            <Button block loading={submitting} onClick={() => void submit()}>
              この内容で予約する
            </Button>
          )}

          {step > 1 ? (
            <Button variant="quiet" size="md" block onClick={goBack}>
              ひとつ前へ戻る
            </Button>
          ) : (
            <Button
              variant="quiet"
              size="md"
              block
              onClick={() => router.push("/")}
            >
              トップへ戻る
            </Button>
          )}
        </div>
      </StickyFooter>
    </Screen>
  );
}

/* ==================================================================
   小さな部品
   ================================================================== */

function Step({
  title,
  en,
  children,
}: {
  title: string;
  en: string;
  children: React.ReactNode;
}) {
  return (
    <section className="fade-up flex flex-col gap-4">
      <div>
        <p className="font-display text-[0.65rem] tracking-[0.4em] text-champagne-600 uppercase">
          {en}
        </p>
        <h1 className="mt-1.5 text-[1.15rem] tracking-[0.1em] text-umber-800">{title}</h1>
      </div>
      {children}
    </section>
  );
}

/** 選べるカード（メニュー・オプション用） */
function SelectableCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ${
        selected
          ? "border-champagne-500 bg-champagne-50 shadow-[0_4px_18px_-10px_rgba(168,130,63,0.8)]"
          : "border-champagne-500/25 bg-white/70 hover:border-champagne-500/60"
      }`}
    >
      {children}
    </button>
  );
}

/** いま選んでいる内容の帯 */
function SelectionSummary({ text }: { text: string }) {
  return (
    <p className="rounded-full bg-umber-50 px-4 py-2.5 text-center text-[0.85rem] tracking-[0.06em] text-umber-600">
      {text}
    </p>
  );
}

/** 入力欄 */
function Field({
  label,
  value,
  onChange,
  required = false,
  hint,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  const id = `field-${label}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.85rem] tracking-[0.08em] text-umber-700">
        {label}
        <span
          className={`ml-2 text-[0.72rem] ${
            required ? "text-clay" : "text-umber-400"
          }`}
        >
          {required ? "必須" : "任意"}
        </span>
      </label>
      <input
        id={id}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[52px] rounded-xl border border-champagne-500/30 bg-white/80 px-4 text-umber-800 placeholder:text-umber-200 focus:border-champagne-500 focus:outline-none"
        {...rest}
      />
      {hint && <p className="text-[0.75rem] leading-relaxed text-umber-400">{hint}</p>}
    </div>
  );
}

/** 確認画面の1行 */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.75rem] tracking-[0.16em] text-champagne-700">{label}</span>
      <span className="text-[1rem] leading-relaxed whitespace-pre-line text-umber-800">
        {children}
      </span>
    </div>
  );
}
