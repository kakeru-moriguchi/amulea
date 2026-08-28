/**
 * 管理者トップ（ダッシュボード）
 * ------------------------------------------------------------------
 * 出勤してまず知りたいことだけを、上から順に置いています。
 *   ・本日の予約数
 *   ・次のご予約
 *   ・本日の売上予定
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AdminShell from "@/components/admin/AdminShell";
import { ButtonLink } from "@/components/ui/Button";
import { Empty, Loading, Notice } from "@/components/ui/Notice";
import { apiGet, query } from "@/lib/client/api";
import {
  formatDateShortJa,
  formatPrice,
  nowMinutesJst,
  timeToMinutes,
  todayJst,
} from "@/lib/util/datetime";

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
};

function Dashboard() {
  const today = todayJst();
  const [todayList, setTodayList] = useState<Reservation[]>([]);
  const [upcoming, setUpcoming] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [todayResult, upcomingResult] = await Promise.all([
      apiGet<{ reservations: Reservation[] }>(
        `/api/admin/reservations${query({ date: today })}`,
      ),
      apiGet<{ reservations: Reservation[] }>("/api/admin/reservations"),
    ]);

    if (todayResult.ok) setTodayList(todayResult.data.reservations);
    else setMessage(todayResult.error.message);

    if (upcomingResult.ok) setUpcoming(upcomingResult.data.reservations);

    setLoading(false);
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading />;

  const nowMin = nowMinutesJst();

  /* 本日これから始まる予約のうち、いちばん早いもの */
  const next =
    todayList.find((r) => timeToMinutes(r.startTime) >= nowMin) ??
    upcoming.find((r) => r.date > today);

  const todayRevenue = todayList.reduce((sum, r) => sum + r.totalPrice, 0);

  return (
    <div className="flex flex-col gap-6">
      {message && <Notice tone="error">{message}</Notice>}

      {/* 本日のまとめ */}
      <section className="grid grid-cols-2 gap-3">
        <Stat label="本日の予約数" value={`${todayList.length}件`} />
        <Stat label="本日の売上予定" value={formatPrice(todayRevenue)} />
      </section>

      {/* 次の予約 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.78rem] tracking-[0.2em] text-champagne-700">
          次のご予約
        </h2>
        {next ? (
          <Link
            href={`/admin/reservations/${next.id}`}
            className="rounded-2xl border border-champagne-500/30 bg-white/70 p-5 transition-colors hover:border-champagne-500/60"
          >
            <p className="text-[0.85rem] text-umber-500">
              {next.date === today ? "本日" : formatDateShortJa(next.date)}
            </p>
            <p className="mt-1 text-[1.5rem] tracking-[0.05em] text-umber-800">
              {next.startTime}
              <span className="text-[0.95rem] text-umber-500">〜{next.endTime}</span>
            </p>
            <p className="mt-2 text-[1rem] text-umber-800">{next.customerName} 様</p>
            <p className="text-[0.86rem] text-umber-500">{next.menuName}</p>
          </Link>
        ) : (
          <Empty>これからのご予約はありません。</Empty>
        )}
      </section>

      {/* 本日の予約一覧 */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[0.78rem] tracking-[0.2em] text-champagne-700">
          本日のご予約
        </h2>
        {todayList.length === 0 ? (
          <Empty>本日のご予約はありません。</Empty>
        ) : (
          <ul className="flex flex-col gap-2">
            {todayList.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/reservations/${r.id}`}
                  className="flex items-center gap-4 rounded-xl border border-champagne-500/25 bg-white/70 p-4 transition-colors hover:border-champagne-500/60"
                >
                  <span className="text-[1.1rem] tracking-[0.04em] text-umber-800">
                    {r.startTime}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] text-umber-800">
                      {r.customerName} 様
                    </span>
                    <span className="block truncate text-[0.8rem] text-umber-500">
                      {r.menuName}
                    </span>
                  </span>
                  <span className="shrink-0 text-[0.88rem] text-umber-600">
                    {formatPrice(r.totalPrice)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-2.5">
        <ButtonLink href="/admin/reservations/new" block>
          電話・口頭の予約を登録する
        </ButtonLink>
        <ButtonLink href="/admin/reservations" variant="outline" block>
          すべての予約を見る
        </ButtonLink>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-champagne-500/25 bg-white/70 p-4">
      <p className="text-[0.72rem] tracking-[0.12em] text-champagne-700">{label}</p>
      <p className="mt-1.5 text-[1.4rem] text-umber-800">{value}</p>
    </div>
  );
}

export default function AdminHomePage() {
  return <AdminShell title="本日の状況">{() => <Dashboard />}</AdminShell>;
}
