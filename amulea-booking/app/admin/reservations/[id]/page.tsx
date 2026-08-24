/**
 * 予約詳細（管理画面）
 * ------------------------------------------------------------------
 * 管理者はここで、電話番号や自由記載を含む全項目を確認できます。
 * ★ これらの情報は LINE 通知には載せていません。
 *   必要なときにこの画面で確認する運用です。
 *
 * この画面から日時の変更・キャンセルも行えます。
 */

"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import DatePicker from "@/components/booking/DatePicker";
import TimeSlots from "@/components/booking/TimeSlots";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";
import { apiDelete, apiGet, apiPatch } from "@/lib/client/api";
import { formatDateJa, formatPrice } from "@/lib/util/datetime";

type Reservation = {
  id: string;
  customerName: string;
  phone: string;
  menuId: string;
  menuName: string;
  optionIds: string[];
  optionNames: string[];
  totalDurationMin: number;
  totalPrice: number;
  date: string;
  startTime: string;
  endTime: string;
  blockStartTime: string;
  blockEndTime: string;
  note: string;
  status: "confirmed" | "cancelled";
  source: "customer" | "admin";
  hasLineUser: boolean;
  linkedToCalendar: boolean;
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
};

function Detail({ id }: { id: string }) {
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [workMessage, setWorkMessage] = useState("");
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await apiGet<{ reservation: Reservation }>(
      `/api/admin/reservations/${encodeURIComponent(id)}`,
    );
    if (result.ok) {
      setReservation(result.data.reservation);
      setDate(result.data.reservation.date);
    } else setMessage(result.error.message);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async () => {
    if (!date || !startTime) return;
    setWorking(true);
    setWorkMessage("");

    const result = await apiPatch<{ reservation: Reservation }>(
      `/api/admin/reservations/${encodeURIComponent(id)}`,
      { date, startTime },
    );

    if (!result.ok) {
      setWorkMessage(result.error.message);
      setWorking(false);
      if (result.error.code === "conflict") setStartTime(null);
      return;
    }

    setReservation(result.data.reservation);
    setEditing(false);
    setStartTime(null);
    setWorking(false);
  }, [date, startTime, id]);

  const cancel = useCallback(async () => {
    setWorking(true);
    setWorkMessage("");
    const result = await apiDelete<{ reservation: Reservation }>(
      `/api/admin/reservations/${encodeURIComponent(id)}`,
    );
    if (!result.ok) {
      setWorkMessage(result.error.message);
      setWorking(false);
      return;
    }
    setReservation(result.data.reservation);
    setConfirmingCancel(false);
    setWorking(false);
  }, [id]);

  if (loading) return <Loading />;
  if (message || !reservation) {
    return <Notice tone="error">{message || "予約が見つかりませんでした。"}</Notice>;
  }

  const cancelled = reservation.status === "cancelled";

  return (
    <div className="flex flex-col gap-5">
      {cancelled && <Notice tone="info">この予約はキャンセル済みです。</Notice>}

      <Card className="flex flex-col gap-4">
        <Row label="日時">
          {formatDateJa(reservation.date)}
          <br />
          {reservation.startTime}〜{reservation.endTime}
          <span className="ml-2 text-[0.8rem] text-umber-500">
            （{reservation.totalDurationMin}分）
          </span>
        </Row>

        {/* 準備時間が設定されている場合のみ、実際に押さえている枠を表示します */}
        {(reservation.blockStartTime !== reservation.startTime ||
          reservation.blockEndTime !== reservation.endTime) && (
          <Row label="確保している枠">
            {reservation.blockStartTime}〜{reservation.blockEndTime}
            <span className="ml-2 text-[0.78rem] text-umber-400">（準備時間を含む）</span>
          </Row>
        )}

        <Row label="お名前">{reservation.customerName} 様</Row>
        <Row label="電話番号">
          <a href={`tel:${reservation.phone}`} className="underline underline-offset-4">
            {reservation.phone}
          </a>
        </Row>
        <Row label="メニュー">{reservation.menuName}</Row>
        {reservation.optionNames.length > 0 && (
          <Row label="オプション">{reservation.optionNames.join("・")}</Row>
        )}
        <Row label="料金">{formatPrice(reservation.totalPrice)}</Row>
        <Row label="ご要望">{reservation.note || "（記載なし）"}</Row>

        <div className="gold-rule" aria-hidden="true" />

        <div className="flex flex-wrap gap-2 text-[0.72rem] text-umber-400">
          <Tag>{reservation.source === "admin" ? "手動登録" : "お客様による予約"}</Tag>
          <Tag>{reservation.hasLineUser ? "LINE連携あり" : "LINE通知なし"}</Tag>
          <Tag>
            {reservation.linkedToCalendar ? "カレンダー登録済み" : "カレンダー未登録"}
          </Tag>
        </div>
      </Card>

      {workMessage && <Notice tone="error">{workMessage}</Notice>}

      {/* ---- 日時の変更 ---- */}
      {!cancelled && (
        <>
          {editing ? (
            <div className="flex flex-col gap-5 rounded-2xl border border-champagne-500/25 bg-white/50 p-4">
              <h2 className="text-[0.85rem] tracking-[0.16em] text-champagne-700">
                新しい日時を選ぶ
              </h2>

              <DatePicker
                value={date}
                onChange={(next) => {
                  setDate(next);
                  setStartTime(null);
                }}
                menuId={reservation.menuId}
                optionIds={reservation.optionIds}
                maxAdvanceDays={365}
                admin
              />

              {date && (
                <TimeSlots
                  date={date}
                  menuId={reservation.menuId}
                  optionIds={reservation.optionIds}
                  value={startTime}
                  onChange={setStartTime}
                  excludeReservationId={reservation.id}
                  admin
                  showUnavailable
                />
              )}

              <div className="flex flex-col gap-2">
                <Button
                  block
                  loading={working}
                  disabled={!date || !startTime}
                  onClick={() => void save()}
                >
                  この日時に変更する
                </Button>
                <Button
                  variant="quiet"
                  size="md"
                  block
                  onClick={() => {
                    setEditing(false);
                    setStartTime(null);
                    setDate(reservation.date);
                  }}
                >
                  変更をやめる
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              <Button variant="outline" block onClick={() => setEditing(true)}>
                日時を変更する
              </Button>

              {confirmingCancel ? (
                <div className="flex flex-col gap-2 rounded-2xl border border-clay/30 bg-clay-light p-4">
                  <p className="text-[0.88rem] text-clay">
                    この予約をキャンセルしますか？
                    <br />
                    お客様へキャンセルのLINE通知が送信されます。
                  </p>
                  <Button variant="umber" block loading={working} onClick={() => void cancel()}>
                    キャンセルを確定する
                  </Button>
                  <Button
                    variant="quiet"
                    size="md"
                    block
                    onClick={() => setConfirmingCancel(false)}
                  >
                    やめる
                  </Button>
                </div>
              ) : (
                <Button variant="quiet" size="md" block onClick={() => setConfirmingCancel(true)}>
                  この予約をキャンセルする
                </Button>
              )}
            </div>
          )}
        </>
      )}

      <Button variant="quiet" size="md" block onClick={() => router.push("/admin/reservations")}>
        予約一覧へ戻る
      </Button>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.73rem] tracking-[0.16em] text-champagne-700">{label}</span>
      <span className="text-[1rem] leading-relaxed whitespace-pre-line text-umber-800">
        {children}
      </span>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-champagne-500/30 px-2.5 py-1">
      {children}
    </span>
  );
}

export default function AdminReservationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <AdminShell title="予約の詳細">{() => <Detail id={id} />}</AdminShell>;
}
