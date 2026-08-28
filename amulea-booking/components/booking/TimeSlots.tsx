/**
 * 時間の選択
 * ==================================================================
 * 選んだ日の「予約できる時間」だけをボタンで並べます。
 *
 * ★ 予約済み・予定ありの枠は、原則として表示しません。
 *   （お客様に「埋まっている時間」を見せない設計です）
 *   管理画面では showUnavailable を true にして、
 *   埋まっている枠も薄く表示します。
 *
 * ★ 判定はすべてサーバー側で行われています。
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, query } from "@/lib/client/api";
import { Loading, Notice } from "@/components/ui/Notice";
import { formatDateJa } from "@/lib/util/datetime";

type Slot = { time: string; available: boolean };

type Availability = {
  date: string;
  open: boolean;
  closedReason: string | null;
  holidayName: string | null;
  hours: { open: string; lastStart: string; close: string } | null;
  slots: Slot[];
  totalDurationMin: number;
  totalPrice: number;
};

type Props = {
  date: string;
  menuId: string;
  optionIds: string[];
  value: string | null;
  onChange: (time: string) => void;
  /** 予約変更のとき、自分自身の枠を空きとして扱うための予約 ID */
  excludeReservationId?: string;
  /** 管理画面から使う場合 */
  admin?: boolean;
  /** 埋まっている枠も薄く表示する（管理画面向け） */
  showUnavailable?: boolean;
};

export default function TimeSlots({
  date,
  menuId,
  optionIds,
  value,
  onChange,
  excludeReservationId,
  admin = false,
  showUnavailable = false,
}: Props) {
  const [data, setData] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const endpoint = admin ? "/api/admin/availability" : "/api/availability";
    const result = await apiGet<Availability>(
      `${endpoint}${query({
        date,
        menuId,
        options: optionIds.join(",") || undefined,
        reservationId: excludeReservationId,
      })}`,
    );

    if (result.ok) {
      setData(result.data);
    } else {
      setMessage(result.error.message);
      setData(null);
    }
    setLoading(false);
  }, [date, menuId, optionIds, excludeReservationId, admin]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <Loading label="空き時間を確認しています" />;
  if (message) return <Notice tone="error">{message}</Notice>;
  if (!data) return null;

  if (!data.open) {
    return (
      <Notice tone="info">
        {data.closedReason ?? "この日はご予約を承っておりません。"}
      </Notice>
    );
  }

  const visible = showUnavailable ? data.slots : data.slots.filter((s) => s.available);
  const hasAvailable = data.slots.some((s) => s.available);

  /* お客様の画面では、空きが無いときは枠を並べずご案内だけを出します */
  if (!hasAvailable && !showUnavailable) {
    return (
      <Notice tone="info">
        {`${formatDateJa(data.date)}は、このメニューでご予約いただける時間が\n埋まってしまいました。別の日をお選びください。`}
      </Notice>
    );
  }

  return (
    <div>
      {/* 管理画面では、埋まっている枠も含めて状況が分かるようにします */}
      {!hasAvailable && (
        <Notice tone="info" className="mb-3">
          この日に空いている枠はありません。
        </Notice>
      )}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {visible.map((slot) => {
          const selected = value === slot.time;
          return (
            <button
              key={slot.time}
              type="button"
              disabled={!slot.available}
              aria-pressed={selected}
              onClick={() => onChange(slot.time)}
              className={`min-h-[52px] rounded-xl border text-[1rem] tracking-[0.08em] transition-all duration-200 ${
                selected
                  ? "border-champagne-500 bg-champagne-500 text-umber-900 shadow-[0_4px_14px_-6px_rgba(168,130,63,0.8)]"
                  : slot.available
                    ? "border-champagne-500/30 bg-white/70 text-umber-700 hover:border-champagne-500/70"
                    : "border-transparent bg-umber-50 text-umber-200 line-through"
              }`}
            >
              {slot.time}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-[0.78rem] leading-relaxed text-umber-400">
        表示されている時間は、施術時間（{data.totalDurationMin}分）が
        すべて確保できる時間です。
      </p>
    </div>
  );
}
