/**
 * 予約一覧（管理画面）
 * ------------------------------------------------------------------
 * 日付・キャンセル済みの表示を切り替えられます。
 * 1件をタップすると詳細画面へ移動します。
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Empty, Loading, Notice } from "@/components/ui/Notice";
import { apiGet, query } from "@/lib/client/api";
import { addDays, formatDateShortJa, formatPrice, todayJst } from "@/lib/util/datetime";

type Reservation = {
  id: string;
  customerName: string;
  menuName: string;
  optionNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "confirmed" | "cancelled";
  source: "customer" | "admin";
  hasLineUser: boolean;
};

type Range = "upcoming" | "today" | "week" | "all";

function ReservationList() {
  const today = todayJst();
  const [range, setRange] = useState<Range>("upcoming");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const params: Record<string, string | undefined> = {
      includeCancelled: includeCancelled ? "1" : undefined,
    };

    if (range === "today") params.date = today;
    else if (range === "week") {
      params.from = today;
      params.to = addDays(today, 6);
    } else if (range === "all") {
      params.from = addDays(today, -180);
      params.to = addDays(today, 180);
    } else {
      params.from = today;
      params.to = addDays(today, 90);
    }

    const result = await apiGet<{ reservations: Reservation[] }>(
      `/api/admin/reservations${query(params)}`,
    );
    if (result.ok) setList(result.data.reservations);
    else setMessage(result.error.message);
    setLoading(false);
  }, [range, includeCancelled, today]);

  useEffect(() => {
    void load();
  }, [load]);

  /* 日付ごとにまとめます */
  const grouped = list.reduce<Record<string, Reservation[]>>((acc, r) => {
    (acc[r.date] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* 絞り込み */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            ["upcoming", "これから"],
            ["today", "本日"],
            ["week", "今週"],
            ["all", "すべて"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={`min-h-[40px] rounded-full px-4 text-[0.82rem] transition-colors ${
              range === value
                ? "bg-umber-700 text-champagne-100"
                : "border border-champagne-500/30 text-umber-600"
            }`}
          >
            {label}
          </button>
        ))}

        <label className="ml-auto flex min-h-[40px] cursor-pointer items-center gap-2 text-[0.8rem] text-umber-600">
          <input
            type="checkbox"
            checked={includeCancelled}
            onChange={(e) => setIncludeCancelled(e.target.checked)}
            className="h-4 w-4 accent-[#bc9a57]"
          />
          キャンセル済みも表示
        </label>
      </div>

      {message && <Notice tone="error">{message}</Notice>}

      {loading ? (
        <Loading />
      ) : list.length === 0 ? (
        <Empty>該当するご予約はありません。</Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(grouped).map(([date, items]) => (
            <section key={date} className="flex flex-col gap-2">
              <h2 className="flex items-baseline gap-3 border-b border-champagne-500/20 pb-1.5">
                <span className="text-[0.95rem] text-umber-800">
                  {formatDateShortJa(date)}
                </span>
                <span className="text-[0.75rem] text-umber-400">{items.length}件</span>
                {date === today && (
                  <span className="rounded-full bg-champagne-500 px-2.5 py-0.5 text-[0.68rem] text-umber-900">
                    本日
                  </span>
                )}
              </h2>

              <ul className="flex flex-col gap-2">
                {items.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className={`flex items-center gap-3 rounded-xl border p-4 transition-colors ${
                        r.status === "cancelled"
                          ? "border-umber-100 bg-umber-50/50 opacity-60"
                          : "border-champagne-500/25 bg-white/70 hover:border-champagne-500/60"
                      }`}
                    >
                      <span className="w-[3.6rem] shrink-0 text-[1.02rem] text-umber-800">
                        {r.startTime}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[0.95rem] text-umber-800">
                            {r.customerName} 様
                          </span>
                          {r.source === "admin" && (
                            <span className="shrink-0 rounded-full border border-champagne-500/40 px-2 py-0.5 text-[0.62rem] text-champagne-700">
                              手動
                            </span>
                          )}
                          {r.status === "cancelled" && (
                            <span className="shrink-0 rounded-full bg-umber-100 px-2 py-0.5 text-[0.62rem] text-umber-500">
                              キャンセル
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[0.8rem] text-umber-500">
                          {r.menuName}
                          {r.optionNames.length > 0 &&
                            `（${r.optionNames.join("・")}）`}
                        </span>
                      </span>
                      <span className="shrink-0 text-[0.86rem] text-umber-600">
                        {formatPrice(r.totalPrice)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        <ButtonLink href="/admin/reservations/new" block>
          電話・口頭の予約を登録する
        </ButtonLink>
        <Button variant="quiet" size="md" block onClick={() => void load()}>
          表示を更新する
        </Button>
      </div>
    </div>
  );
}

export default function AdminReservationsPage() {
  return <AdminShell title="予約一覧">{() => <ReservationList />}</AdminShell>;
}
