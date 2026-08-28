/**
 * カレンダー（管理画面）
 * ==================================================================
 * 日付を選ぶと、その日の状況をまとめて確認できます。
 *
 *   ・予約（この予約システムで入ったもの）
 *   ・Google カレンダーの予定（管理者の私用など）
 *   ・休業・受付停止の理由
 *
 * 「なぜこの時間が埋まっているのか」がひと目で分かるようにしています。
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/Button";
import { Empty, Loading, Notice } from "@/components/ui/Notice";
import { apiGet, query } from "@/lib/client/api";
import {
  addDays,
  formatDateJa,
  formatPrice,
  minutesToTime,
  todayJst,
} from "@/lib/util/datetime";

type Reservation = {
  id: string;
  customerName: string;
  menuName: string;
  optionNames: string[];
  startTime: string;
  endTime: string;
  blockStartTime: string;
  blockEndTime: string;
  totalPrice: number;
  status: "confirmed" | "cancelled";
  source: "customer" | "admin";
};

type Interval = {
  startMin: number;
  endMin: number;
  source: "reservation" | "calendar" | "blocked";
  label?: string;
  eventId?: string;
};

type DayData = {
  date: string;
  open: boolean;
  closedReason: string | null;
  holidayName: string | null;
  hours: { open: string; lastStart: string; close: string } | null;
  reservations: Reservation[];
  calendar: { allDayBlocked: string | null; intervals: Interval[] };
};

function CalendarView({ googleEnabled }: { googleEnabled: boolean }) {
  const [date, setDate] = useState(todayJst());
  const [data, setData] = useState<DayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");
    const result = await apiGet<DayData>(`/api/admin/day${query({ date })}`);
    if (result.ok) setData(result.data);
    else setMessage(result.error.message);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  const active = data?.reservations.filter((r) => r.status === "confirmed") ?? [];
  const revenue = active.reduce((sum, r) => sum + r.totalPrice, 0);

  /* 予約システム以外の予定（管理者の私用など）だけを抜き出します */
  const personal = (data?.calendar.intervals ?? []).filter(
    (i) => i.label !== "予約",
  );

  return (
    <div className="flex flex-col gap-5">
      {/* 日付の移動 */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDate(addDays(date, -1))}
          aria-label="前の日"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-champagne-500/30 text-umber-600"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          aria-label="日付"
          className="min-h-[44px] flex-1 rounded-xl border border-champagne-500/30 bg-white px-4 text-center text-umber-800 focus:border-champagne-500 focus:outline-none"
        />

        <button
          type="button"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="次の日"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-champagne-500/30 text-umber-600"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[1rem] text-umber-800">{formatDateJa(date)}</p>
        <Button variant="quiet" size="md" onClick={() => setDate(todayJst())}>
          本日へ
        </Button>
      </div>

      {message && <Notice tone="error">{message}</Notice>}

      {loading ? (
        <Loading />
      ) : !data ? null : (
        <>
          {/* その日の状態 */}
          {!data.open ? (
            <Notice tone="info">
              {data.closedReason ?? "この日は予約を受け付けていません。"}
            </Notice>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-champagne-500/25 bg-white/70 px-4 py-3 text-[0.85rem] text-umber-600">
              <span>
                営業 {data.hours?.open}〜{data.hours?.close}
              </span>
              <span>最終受付 {data.hours?.lastStart}</span>
              {data.holidayName && (
                <span className="text-clay">{data.holidayName}</span>
              )}
            </div>
          )}

          {data.calendar.allDayBlocked && (
            <Notice tone="info">
              {`Google カレンダーに終日予定「${data.calendar.allDayBlocked}」が入っているため、この日は予約を受け付けていません。`}
            </Notice>
          )}

          {/* まとめ */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="予約件数" value={`${active.length}件`} />
            <Stat label="売上予定" value={formatPrice(revenue)} />
          </div>

          {/* 予約一覧 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[0.78rem] tracking-[0.2em] text-champagne-700">
              ご予約
            </h2>
            {active.length === 0 ? (
              <Empty>ご予約はありません。</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {active.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className="flex items-center gap-3 rounded-xl border border-champagne-500/25 bg-white/70 p-4 transition-colors hover:border-champagne-500/60"
                    >
                      <span className="w-[5.6rem] shrink-0 text-[0.92rem] text-umber-800">
                        {r.startTime}
                        <span className="text-umber-400">〜{r.endTime}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.95rem] text-umber-800">
                          {r.customerName} 様
                        </span>
                        <span className="block truncate text-[0.8rem] text-umber-500">
                          {r.menuName}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Google カレンダーの個人予定 */}
          <section className="flex flex-col gap-2">
            <h2 className="text-[0.78rem] tracking-[0.2em] text-champagne-700">
              その他の予定（Google カレンダー）
            </h2>
            {!googleEnabled ? (
              <Empty>Google カレンダー連携が未設定です。</Empty>
            ) : personal.length === 0 ? (
              <Empty>他の予定はありません。</Empty>
            ) : (
              <ul className="flex flex-col gap-2">
                {personal.map((i, index) => (
                  <li
                    key={`${i.eventId ?? "x"}-${index}`}
                    className="flex items-center gap-3 rounded-xl border border-umber-100 bg-umber-50/60 p-4"
                  >
                    <span className="w-[5.6rem] shrink-0 text-[0.9rem] text-umber-600">
                      {minutesToTime(i.startMin)}
                      <span className="text-umber-300">〜{minutesToTime(i.endMin)}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[0.9rem] text-umber-600">
                      {i.label ?? "予定あり"}
                    </span>
                    <span className="shrink-0 text-[0.7rem] text-umber-400">予約不可</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[0.75rem] leading-relaxed text-umber-400">
              Google カレンダーに予定を入れると、その時間は自動的に予約できなくなります。
              終日予定を入れると、その日は丸ごと休業になります。
            </p>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-champagne-500/25 bg-white/70 p-4">
      <p className="text-[0.72rem] tracking-[0.12em] text-champagne-700">{label}</p>
      <p className="mt-1.5 text-[1.3rem] text-umber-800">{value}</p>
    </div>
  );
}

export default function AdminCalendarPage() {
  return (
    <AdminShell title="カレンダー">
      {(info) => <CalendarView googleEnabled={info.integrations.googleCalendar} />}
    </AdminShell>
  );
}
