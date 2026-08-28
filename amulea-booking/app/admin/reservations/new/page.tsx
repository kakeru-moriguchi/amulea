/**
 * 手動予約の登録（管理画面）
 * ==================================================================
 * 電話や口頭で受けたご予約を、管理者が代わりに登録します。
 *
 * ★ 手動予約も通常の予約とまったく同じ扱いです。
 *   ・Google カレンダーへ登録されます
 *   ・スプレッドシートへ保存されます
 *   ・空き時間の判定に反映されます
 *
 * ★ ただしお客様への LINE 通知は行いません。
 *   LINE userId が分からないためです。
 *   名前や電話番号から通知先を推測することは、誤送信につながるため
 *   絶対に行いません。
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import DatePicker from "@/components/booking/DatePicker";
import TimeSlots from "@/components/booking/TimeSlots";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";
import { apiGet, apiPost } from "@/lib/client/api";
import { formatDateJa, formatPrice, todayJst } from "@/lib/util/datetime";

type Menu = {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  visible: boolean;
};

type Option = {
  id: string;
  name: string;
  price: number;
  extraDurationMin: number;
  visible: boolean;
};

function NewReservationForm() {
  const router = useRouter();

  const [menus, setMenus] = useState<Menu[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);

  const [menuId, setMenuId] = useState("");
  const [optionIds, setOptionIds] = useState<string[]>([]);
  const [date, setDate] = useState<string | null>(todayJst());
  const [startTime, setStartTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const [menuResult, optionResult] = await Promise.all([
        apiGet<{ menus: Menu[] }>("/api/admin/menus"),
        apiGet<{ options: Option[] }>("/api/admin/options"),
      ]);
      if (menuResult.ok) {
        setMenus(menuResult.data.menus);
        setMenuId(menuResult.data.menus[0]?.id ?? "");
      }
      if (optionResult.ok) setOptions(optionResult.data.options);
      setLoading(false);
    })();
  }, []);

  const summary = useMemo(() => {
    const menu = menus.find((m) => m.id === menuId);
    if (!menu) return null;
    const chosen = options.filter((o) => optionIds.includes(o.id));
    return {
      menu,
      totalPrice: menu.price + chosen.reduce((s, o) => s + o.price, 0),
      totalDurationMin:
        menu.durationMin + chosen.reduce((s, o) => s + o.extraDurationMin, 0),
    };
  }, [menus, options, menuId, optionIds]);

  const submit = useCallback(async () => {
    setWorking(true);
    setMessage("");

    const result = await apiPost<{ reservation: { id: string } }>(
      "/api/admin/reservations",
      { customerName, phone, menuId, optionIds, date, startTime, note },
    );

    if (!result.ok) {
      setMessage(result.error.message);
      setWorking(false);
      if (result.error.code === "conflict") setStartTime(null);
      return;
    }

    router.replace(`/admin/reservations/${result.data.reservation.id}`);
  }, [customerName, phone, menuId, optionIds, date, startTime, note, router]);

  if (loading) return <Loading />;

  const ready = Boolean(menuId && date && startTime && customerName.trim() && phone.trim());

  return (
    <div className="flex flex-col gap-6">
      <Notice tone="info">
        {"手動で登録した予約は、Google カレンダーとスプレッドシートに反映され、\n空き時間の判定にも使われます。\nお客様へのLINE通知は送信されません（LINEの宛先が分からないため）。"}
      </Notice>

      {/* メニュー */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">メニュー</h2>
        <select
          value={menuId}
          onChange={(e) => {
            setMenuId(e.target.value);
            setStartTime(null);
          }}
          className="min-h-[52px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800 focus:border-champagne-500 focus:outline-none"
        >
          {menus.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}（{m.durationMin}分 / {formatPrice(m.price)}）
              {m.visible ? "" : " ※非表示"}
            </option>
          ))}
        </select>
      </section>

      {/* オプション */}
      {options.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">オプション</h2>
          <div className="flex flex-col gap-1.5">
            {options.map((o) => (
              <label
                key={o.id}
                className="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-champagne-500/25 bg-white/70 px-4"
              >
                <input
                  type="checkbox"
                  checked={optionIds.includes(o.id)}
                  onChange={(e) => {
                    setOptionIds((ids) =>
                      e.target.checked ? [...ids, o.id] : ids.filter((x) => x !== o.id),
                    );
                    setStartTime(null);
                  }}
                  className="h-4 w-4 accent-[#bc9a57]"
                />
                <span className="flex-1 text-[0.92rem] text-umber-800">{o.name}</span>
                <span className="text-[0.88rem] text-umber-600">
                  ＋{formatPrice(o.price)}
                </span>
              </label>
            ))}
          </div>
        </section>
      )}

      {/* 日付 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">日付</h2>
        {menuId && (
          <DatePicker
            value={date}
            onChange={(next) => {
              setDate(next);
              setStartTime(null);
            }}
            menuId={menuId}
            optionIds={optionIds}
            maxAdvanceDays={365}
            admin
          />
        )}
      </section>

      {/* 時間 */}
      {date && menuId && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">時間</h2>
          <TimeSlots
            date={date}
            menuId={menuId}
            optionIds={optionIds}
            value={startTime}
            onChange={setStartTime}
            admin
            showUnavailable
          />
        </section>
      )}

      {/* お客様情報 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">お客様情報</h2>
        <Input label="お名前" value={customerName} onChange={setCustomerName} required />
        <Input
          label="電話番号"
          value={phone}
          onChange={setPhone}
          required
          type="tel"
          inputMode="numeric"
          placeholder="09012345678"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-note" className="text-[0.82rem] text-umber-700">
            メモ・ご要望
          </label>
          <textarea
            id="admin-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            className="rounded-xl border border-champagne-500/30 bg-white px-4 py-3 text-umber-800 focus:border-champagne-500 focus:outline-none"
          />
        </div>
      </section>

      {/* 確認 */}
      {summary && date && startTime && (
        <Card className="flex flex-col gap-2">
          <p className="text-[0.75rem] tracking-[0.16em] text-champagne-700">登録内容</p>
          <p className="text-[1rem] text-umber-800">
            {formatDateJa(date)} {startTime}〜
          </p>
          <p className="text-[0.9rem] text-umber-600">
            {summary.menu.name}（{summary.totalDurationMin}分）
          </p>
          <p className="text-[1.05rem] text-umber-800">
            {formatPrice(summary.totalPrice)}
          </p>
        </Card>
      )}

      {message && <Notice tone="error">{message}</Notice>}

      <div className="flex flex-col gap-2.5">
        <Button block loading={working} disabled={!ready} onClick={() => void submit()}>
          この内容で予約を登録する
        </Button>
        <Button variant="quiet" size="md" block onClick={() => router.back()}>
          戻る
        </Button>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const id = `admin-${label}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[0.82rem] text-umber-700">
        {label}
        {required && <span className="ml-2 text-[0.72rem] text-clay">必須</span>}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[52px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800 focus:border-champagne-500 focus:outline-none"
        {...rest}
      />
    </div>
  );
}

export default function AdminNewReservationPage() {
  return <AdminShell title="手動で予約を登録">{() => <NewReservationForm />}</AdminShell>;
}
