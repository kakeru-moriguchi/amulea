/**
 * 日付選択カレンダー
 * ==================================================================
 * ★ スマートフォンで押しやすいことを最優先にしています。
 *   ・1日のマスを 44px 以上にしています（指で押せる最小サイズ）
 *   ・予約できない日は押せません（見た目でも分かるようにしています）
 *   ・日曜は赤、土曜と祝日は青系で表示します
 *
 * 空きがあるかどうかはサーバーで計算しています。
 * 画面側では判定しません。
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiGet, query } from "@/lib/client/api";
import {
  addDays,
  diffDays,
  parseDate,
  todayJst,
  weekdayOf,
} from "@/lib/util/datetime";
import { Loading, Notice } from "@/components/ui/Notice";

type DayInfo = { open: boolean; hasSlot: boolean; holiday: string | null };

type Props = {
  value: string | null;
  onChange: (date: string) => void;
  menuId: string;
  optionIds: string[];
  /** 何日先まで選べるか */
  maxAdvanceDays: number;
  /** 管理画面から使う場合は true（受付期間の制限を外して表示します） */
  admin?: boolean;
};

const WEEK_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

/** その月の1日 */
function firstOfMonth(date: string): string {
  const { year, month } = parseDate(date);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** その月の日数 */
function daysInMonth(date: string): number {
  const { year, month } = parseDate(date);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 1か月ずらします */
function shiftMonth(date: string, delta: number): string {
  const { year, month } = parseDate(date);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export default function DatePicker({
  value,
  onChange,
  menuId,
  optionIds,
  maxAdvanceDays,
  admin = false,
}: Props) {
  const today = useMemo(() => todayJst(), []);
  const [monthStart, setMonthStart] = useState(() => firstOfMonth(value ?? today));
  const [days, setDays] = useState<Record<string, DayInfo>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  /** 表示している月の予約可否をまとめて取得します */
  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const from = monthStart;
    const to = addDays(monthStart, daysInMonth(monthStart) - 1);

    const result = await apiGet<{ days: Record<string, DayInfo> }>(
      `/api/availability/month${query({
        from,
        to,
        menuId,
        options: optionIds.join(",") || undefined,
        admin: admin ? "1" : undefined,
      })}`,
    );

    if (result.ok) setDays(result.data.days);
    else setMessage(result.error.message);

    setLoading(false);
  }, [monthStart, menuId, optionIds, admin]);

  useEffect(() => {
    void load();
  }, [load]);

  const { year, month } = parseDate(monthStart);
  const total = daysInMonth(monthStart);
  const leading = weekdayOf(monthStart);

  /* 前の月・次の月へ移動できるか */
  const lastSelectable = admin ? addDays(today, 365) : addDays(today, maxAdvanceDays);
  const canGoPrev = shiftMonth(monthStart, -1) >= firstOfMonth(today);
  const canGoNext = shiftMonth(monthStart, 1) <= lastSelectable;

  return (
    <div>
      {/* 月の切り替え */}
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonthStart(shiftMonth(monthStart, -1))}
          disabled={!canGoPrev}
          aria-label="前の月"
          className="flex h-11 w-11 items-center justify-center rounded-full text-umber-600 transition-colors disabled:opacity-25 enabled:hover:bg-champagne-500/10"
        >
          <span aria-hidden="true">‹</span>
        </button>

        <p className="text-[1.05rem] tracking-[0.16em] text-umber-800">
          {year}年{month}月
        </p>

        <button
          type="button"
          onClick={() => setMonthStart(shiftMonth(monthStart, 1))}
          disabled={!canGoNext}
          aria-label="次の月"
          className="flex h-11 w-11 items-center justify-center rounded-full text-umber-600 transition-colors disabled:opacity-25 enabled:hover:bg-champagne-500/10"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {/* 曜日の見出し */}
      <div className="grid grid-cols-7 gap-1 border-b border-champagne-500/20 pb-2">
        {WEEK_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-[0.72rem] tracking-[0.1em] ${
              i === 0 ? "text-clay/80" : i === 6 ? "text-forest/80" : "text-umber-400"
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {message && (
        <Notice tone="error" className="mt-4">
          {message}
        </Notice>
      )}

      {loading ? (
        <Loading label="空き状況を確認しています" />
      ) : (
        <div className="mt-2 grid grid-cols-7 gap-1">
          {/* 月初までの空きマス */}
          {Array.from({ length: leading }, (_, i) => (
            <div key={`pad-${i}`} aria-hidden="true" />
          ))}

          {Array.from({ length: total }, (_, i) => {
            const date = addDays(monthStart, i);
            const info = days[date];
            const weekday = weekdayOf(date);
            const isPast = diffDays(today, date) < 0;
            const tooFar = date > lastSelectable;
            const selectable = Boolean(info?.open && info.hasSlot) && !isPast && !tooFar;
            const selected = value === date;

            const weekdayColor =
              weekday === 0 || info?.holiday
                ? "text-clay"
                : weekday === 6
                  ? "text-forest"
                  : "text-umber-700";

            return (
              <button
                key={date}
                type="button"
                disabled={!selectable}
                aria-pressed={selected}
                aria-label={`${month}月${i + 1}日${
                  selectable ? "、予約できます" : "、予約できません"
                }`}
                onClick={() => onChange(date)}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border transition-all duration-200 ${
                  selected
                    ? "border-champagne-500 bg-champagne-500 text-umber-900 shadow-[0_4px_14px_-6px_rgba(168,130,63,0.8)]"
                    : selectable
                      ? `border-champagne-500/25 bg-white/70 ${weekdayColor} hover:border-champagne-500/60`
                      : "border-transparent bg-transparent text-umber-200"
                }`}
              >
                <span className="text-[0.95rem] leading-none">{i + 1}</span>
                {/* 空きの有無を丸印で示します（色だけに頼らない配慮） */}
                <span className="text-[0.6rem] leading-none" aria-hidden="true">
                  {selected ? "●" : selectable ? "○" : "−"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-[0.75rem] leading-relaxed text-umber-400">
        ○ … ご予約いただけます　／　− … 満席・休業日
      </p>
    </div>
  );
}
