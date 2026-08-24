/**
 * 予約キャンセルページ
 * ==================================================================
 * ★ 誤操作を防ぐため、必ず確認画面を挟みます。
 *   予約内容を表示したうえで、はっきりと意思表示していただきます。
 *
 * キャンセルが確定すると、サーバー側で次を実行します。
 *   ・予約ステータスの変更（データは消さず履歴として残します）
 *   ・Google カレンダーからの削除（＝空き枠の復活）
 *   ・お客様・管理者への LINE 通知
 */

"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionGate from "@/components/SessionGate";
import { Button } from "@/components/ui/Button";
import { Brand, Card, Content, Screen, SectionHeading } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";
import { apiGet, apiPost } from "@/lib/client/api";
import { formatDateJa, formatPrice } from "@/lib/util/datetime";

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

function CancelBody({ id }: { id: string }) {
  const router = useRouter();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [working, setWorking] = useState(false);
  const [workError, setWorkError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    void (async () => {
      const result = await apiGet<{ reservation: Reservation }>(
        `/api/reservations/${encodeURIComponent(id)}`,
      );
      if (!result.ok) setLoadError(result.error.message);
      else if (result.data.reservation.status === "cancelled") {
        setLoadError("この予約はすでにキャンセルされています。");
      } else setReservation(result.data.reservation);
      setLoading(false);
    })();
  }, [id]);

  const cancel = useCallback(async () => {
    setWorking(true);
    setWorkError("");

    const result = await apiPost(`/api/reservations/${encodeURIComponent(id)}/cancel`);
    if (!result.ok) {
      setWorkError(result.error.message);
      setWorking(false);
      return;
    }
    setDone(true);
    setWorking(false);
  }, [id]);

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

  /* ---- キャンセル完了 ---- */
  if (done) {
    return (
      <Screen>
        <Brand />
        <Content className="flex flex-col justify-center gap-7 text-center">
          <div className="fade-up flex flex-col items-center gap-4">
            <span
              aria-hidden="true"
              className="flex h-16 w-16 items-center justify-center rounded-full border border-champagne-500/40 text-[1.4rem] text-champagne-600"
            >
              ✓
            </span>
            <h1 className="text-[1.2rem] tracking-[0.12em] text-umber-800">
              キャンセルを承りました
            </h1>
            <p className="text-[0.88rem] leading-loose text-umber-500">
              またのご予約を
              <br />
              心よりお待ちしております。
            </p>
          </div>
          <Button block onClick={() => router.replace("/my-reservations")}>
            予約一覧へ戻る
          </Button>
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
          <Button variant="outline" block onClick={() => router.push("/my-reservations")}>
            予約一覧へ戻る
          </Button>
        </Content>
      </Screen>
    );
  }

  /* ---- 確認画面 ---- */
  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col gap-7">
        <SectionHeading en="Cancel" ja="ご予約のキャンセル" />

        <Notice tone="error">この予約をキャンセルしますか？</Notice>

        <Card className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[0.75rem] tracking-[0.16em] text-champagne-700">
              日時
            </span>
            <span className="text-[1.05rem] text-umber-800">
              {formatDateJa(reservation.date)}
              <br />
              {reservation.startTime}〜{reservation.endTime}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[0.75rem] tracking-[0.16em] text-champagne-700">
              メニュー
            </span>
            <span className="text-[0.98rem] text-umber-800">
              {reservation.menuName}
              {reservation.optionNames.length > 0 &&
                `（${reservation.optionNames.join("・")}）`}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[0.75rem] tracking-[0.16em] text-champagne-700">
              料金
            </span>
            <span className="text-[0.98rem] text-umber-800">
              {formatPrice(reservation.totalPrice)}
            </span>
          </div>
        </Card>

        <p className="text-[0.8rem] leading-relaxed text-umber-400">
          キャンセル後に同じお時間へ戻すことはできません。
          <br />
          お日にちの変更をご希望の場合は「日時を変更」をご利用ください。
        </p>

        {workError && <Notice tone="error">{workError}</Notice>}

        <div className="flex flex-col gap-2.5">
          {/* 目立たせすぎず、しかし押し間違えない配置にしています */}
          <Button variant="outline" block onClick={() => router.push("/my-reservations")}>
            キャンセルしない（戻る）
          </Button>
          <Button variant="umber" block loading={working} onClick={() => void cancel()}>
            この予約をキャンセルする
          </Button>
        </div>
      </Content>
    </Screen>
  );
}

export default function CancelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <SessionGate>{() => <CancelBody id={id} />}</SessionGate>;
}
