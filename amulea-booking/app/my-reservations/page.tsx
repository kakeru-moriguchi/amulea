/**
 * マイ予約ページ
 * ==================================================================
 * ★ 表示されるのは「ログイン中のご本人の予約」だけです。
 *   サーバー側で
 *     ログイン中の LINE userId == 予約データの LINE userId
 *   を確認しており、他のお客様の予約は取得できません。
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SessionGate from "@/components/SessionGate";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Brand, Card, Content, Screen, SectionHeading } from "@/components/ui/Layout";
import { Empty, Loading, Notice } from "@/components/ui/Notice";
import { apiGet } from "@/lib/client/api";
import { formatDateJa, formatPrice, todayJst } from "@/lib/util/datetime";

type Reservation = {
  id: string;
  menuName: string;
  optionNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: "confirmed" | "cancelled";
};

function MyReservationsBody() {
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiGet<{ reservations: Reservation[] }>("/api/reservations");
    if (result.ok) setList(result.data.reservations);
    else setMessage(result.error.message);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const today = todayJst();
  const upcoming = list.filter((r) => r.status === "confirmed" && r.date >= today);
  const past = list.filter((r) => r.status !== "confirmed" || r.date < today);

  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col gap-8">
        <SectionHeading en="My Reservation" ja="ご予約の確認" />

        {message && <Notice tone="error">{message}</Notice>}

        {loading ? (
          <Loading />
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">
                これからのご予約
              </h2>

              {upcoming.length === 0 ? (
                <Empty>
                  ご予約はありません。
                  <br />
                  下のボタンから新しくご予約いただけます。
                </Empty>
              ) : (
                upcoming.map((r) => <ReservationCard key={r.id} reservation={r} />)
              )}
            </section>

            {past.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">
                  過去のご予約・キャンセル
                </h2>
                {past.slice(0, 20).map((r) => (
                  <ReservationCard key={r.id} reservation={r} past />
                ))}
              </section>
            )}

            <div className="flex flex-col gap-2.5">
              <ButtonLink href="/booking" block>
                新しく予約する
              </ButtonLink>
              <Button variant="quiet" size="md" block onClick={() => void load()}>
                表示を更新する
              </Button>
            </div>
          </>
        )}
      </Content>
    </Screen>
  );
}

function ReservationCard({
  reservation,
  past = false,
}: {
  reservation: Reservation;
  past?: boolean;
}) {
  const cancelled = reservation.status === "cancelled";

  return (
    <Card className={cancelled ? "opacity-60" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[1.02rem] text-umber-800">
            {formatDateJa(reservation.date)}
          </p>
          <p className="mt-0.5 text-[1.15rem] tracking-[0.06em] text-umber-800">
            {reservation.startTime}
            <span className="text-[0.9rem] text-umber-500">〜{reservation.endTime}</span>
          </p>
        </div>
        {cancelled && (
          <span className="shrink-0 rounded-full bg-umber-50 px-3 py-1 text-[0.72rem] text-umber-400">
            キャンセル済み
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-0.5">
        <p className="text-[0.92rem] text-umber-700">{reservation.menuName}</p>
        {reservation.optionNames.length > 0 && (
          <p className="text-[0.8rem] text-umber-500">
            {reservation.optionNames.join("・")}
          </p>
        )}
        <p className="mt-1 text-[0.95rem] text-umber-800">
          {formatPrice(reservation.totalPrice)}
        </p>
      </div>

      {!past && !cancelled && (
        <div className="mt-4 flex gap-2">
          <Link
            href={`/reservation/${reservation.id}/change`}
            className="flex min-h-[46px] flex-1 items-center justify-center rounded-full border border-champagne-500/50 text-[0.85rem] tracking-[0.1em] text-umber-700"
          >
            日時を変更
          </Link>
          <Link
            href={`/reservation/${reservation.id}/cancel`}
            className="flex min-h-[46px] flex-1 items-center justify-center rounded-full border border-umber-200 text-[0.85rem] tracking-[0.1em] text-umber-500"
          >
            キャンセル
          </Link>
        </div>
      )}
    </Card>
  );
}

export default function MyReservationsPage() {
  return <SessionGate>{() => <MyReservationsBody />}</SessionGate>;
}
