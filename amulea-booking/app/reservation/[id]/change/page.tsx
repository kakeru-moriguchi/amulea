/**
 * 予約変更ページ
 * ==================================================================
 * 日付と時間を選び直していただきます。
 *
 * ★ 変更時もサーバー側で次をすべて実行します。
 *   1. 本人確認（他人の予約は変更できません）
 *   2. 新しい日時の空き確認
 *   3. 二重予約チェック
 *   4. Google カレンダーのイベント更新
 *   5. スプレッドシート更新
 *   6. お客様・管理者への LINE 通知
 */

"use client";

import { use, useCallback, useEffect, useState } from "react";
import { goTo, replaceTo } from "@/lib/client/navigate";
import SessionGate from "@/components/SessionGate";
import DatePicker from "@/components/booking/DatePicker";
import TimeSlots from "@/components/booking/TimeSlots";
import { Button } from "@/components/ui/Button";
import { Brand, Card, Content, Screen, SectionHeading, StickyFooter } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";
import { apiGet, apiPatch } from "@/lib/client/api";
import { formatDateJa } from "@/lib/util/datetime";

type Reservation = {
  id: string;
  menuId: string;
  menuName: string;
  optionIds: string[];
  optionNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  status: "confirmed" | "cancelled";
};

type BookingConfig = {
  maxAdvanceDays: number;
  changeDeadlineHours: number;
};

function ChangeBody({ id }: { id: string }) {

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [config, setConfig] = useState<BookingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [date, setDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    void (async () => {
      const [one, menus] = await Promise.all([
        apiGet<{ reservation: Reservation }>(
          `/api/reservations/${encodeURIComponent(id)}`,
        ),
        apiGet<{ booking: BookingConfig }>("/api/menus"),
      ]);

      if (!one.ok) {
        setLoadError(one.error.message);
        setLoading(false);
        return;
      }
      if (one.data.reservation.status === "cancelled") {
        setLoadError("キャンセル済みの予約は変更できません。");
        setLoading(false);
        return;
      }

      setReservation(one.data.reservation);
      setDate(one.data.reservation.date);
      if (menus.ok) setConfig(menus.data.booking);
      setLoading(false);
    })();
  }, [id]);

  const save = useCallback(async () => {
    if (!date || !startTime) return;
    setSaving(true);
    setSaveError("");

    const result = await apiPatch<{ reservation: Reservation }>(
      `/api/reservations/${encodeURIComponent(id)}`,
      { date, startTime },
    );

    if (!result.ok) {
      setSaveError(result.error.message);
      setSaving(false);
      /* 二重予約なら時間を選び直していただきます */
      if (result.error.code === "conflict") setStartTime(null);
      return;
    }

    replaceTo("/my-reservations?changed=1");
  }, [date, startTime, id]);

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

  if (loadError || !reservation) {
    return (
      <Screen>
        <Brand />
        <Content className="flex flex-col gap-5">
          <Notice tone="error">{loadError || "予約が見つかりませんでした。"}</Notice>
          <Button variant="outline" block onClick={() => goTo("/my-reservations")}>
            予約一覧へ戻る
          </Button>
        </Content>
      </Screen>
    );
  }

  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col gap-7">
        <SectionHeading en="Change" ja="ご予約の変更" />

        {/* 現在のご予約 */}
        <Card className="flex flex-col gap-1.5">
          <p className="text-[0.75rem] tracking-[0.16em] text-champagne-700">
            現在のご予約
          </p>
          <p className="text-[1rem] text-umber-800">
            {formatDateJa(reservation.date)} {reservation.startTime}〜
            {reservation.endTime}
          </p>
          <p className="text-[0.88rem] text-umber-600">
            {reservation.menuName}
            {reservation.optionNames.length > 0 &&
              `（${reservation.optionNames.join("・")}）`}
          </p>
        </Card>

        <div className="flex flex-col gap-4">
          <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">
            新しい日を選んでください
          </h2>
          <DatePicker
            value={date}
            onChange={(next) => {
              setDate(next);
              setStartTime(null);
              setSaveError("");
            }}
            menuId={reservation.menuId}
            optionIds={reservation.optionIds}
            maxAdvanceDays={config?.maxAdvanceDays ?? 60}
          />
        </div>

        {date && (
          <div className="flex flex-col gap-4">
            <h2 className="text-[0.8rem] tracking-[0.2em] text-champagne-700">
              新しい時間を選んでください
            </h2>
            <TimeSlots
              date={date}
              menuId={reservation.menuId}
              optionIds={reservation.optionIds}
              value={startTime}
              onChange={(next) => {
                setStartTime(next);
                setSaveError("");
              }}
              /* ★ 自分自身の枠は「空き」として扱われます */
              excludeReservationId={reservation.id}
            />
          </div>
        )}

        {saveError && <Notice tone="error">{saveError}</Notice>}
      </Content>

      <StickyFooter>
        <div className="flex flex-col gap-2 pb-2">
          <Button
            block
            loading={saving}
            disabled={!date || !startTime}
            onClick={() => void save()}
          >
            {date && startTime
              ? `${formatDateJa(date)} ${startTime}〜 に変更する`
              : "新しい日時をお選びください"}
          </Button>
          <Button
            variant="quiet"
            size="md"
            block
            onClick={() => goTo("/my-reservations")}
          >
            変更せずに戻る
          </Button>
        </div>
      </StickyFooter>
    </Screen>
  );
}

export default function ChangePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SessionGate>{() => <ChangeBody id={id} />}</SessionGate>;
}
