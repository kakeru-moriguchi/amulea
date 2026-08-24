/**
 * 予約完了ページ
 * ------------------------------------------------------------------
 * ★ URL には予約 ID しか載せません（お名前・電話番号は載せません）。
 *   内容はサーバーから取り直して表示します。
 *   その際も「ログイン中のご本人の予約か」を必ず確認しています。
 */

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import SessionGate from "@/components/SessionGate";
import { ButtonLink } from "@/components/ui/Button";
import { Brand, Card, Content, Screen } from "@/components/ui/Layout";
import { Loading, Notice } from "@/components/ui/Notice";
import { apiGet } from "@/lib/client/api";
import { formatDateJa, formatPrice } from "@/lib/util/datetime";

type Reservation = {
  id: string;
  menuName: string;
  optionNames: string[];
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  customerName: string;
};

function CompleteBody() {
  const params = useSearchParams();
  const id = params.get("id") ?? "";

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      if (!id) {
        setMessage("予約が見つかりませんでした。");
        setLoading(false);
        return;
      }
      const result = await apiGet<{ reservation: Reservation }>(
        `/api/reservations/${encodeURIComponent(id)}`,
      );
      if (result.ok) setReservation(result.data.reservation);
      else setMessage(result.error.message);
      setLoading(false);
    })();
  }, [id]);

  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col gap-7">
        {loading ? (
          <Loading />
        ) : message || !reservation ? (
          <>
            <Notice tone="error">{message || "予約が見つかりませんでした。"}</Notice>
            <ButtonLink href="/" variant="outline" block>
              トップへ戻る
            </ButtonLink>
          </>
        ) : (
          <>
            <div className="fade-up flex flex-col items-center gap-4 pt-6 text-center">
              <span
                aria-hidden="true"
                className="flex h-16 w-16 items-center justify-center rounded-full border border-champagne-500/50 text-[1.6rem] text-champagne-600"
              >
                ✓
              </span>
              <div>
                <p className="font-display text-[0.66rem] tracking-[0.4em] text-champagne-600 uppercase">
                  Reserved
                </p>
                <h1 className="mt-2 text-[1.25rem] tracking-[0.12em] text-umber-800">
                  ご予約ありがとうございます
                </h1>
              </div>
              <p className="text-[0.88rem] leading-loose text-umber-500">
                ご予約が確定しました。
                <br />
                確認のメッセージを公式LINEへお送りしています。
              </p>
            </div>

            <Card className="fade-up flex flex-col gap-4">
              <Row label="日時">
                {formatDateJa(reservation.date)}
                <br />
                {reservation.startTime}〜{reservation.endTime}
              </Row>
              <Row label="メニュー">{reservation.menuName}</Row>
              {reservation.optionNames.length > 0 && (
                <Row label="オプション">{reservation.optionNames.join("・")}</Row>
              )}
              <Row label="お名前">{reservation.customerName} 様</Row>
              <div className="gold-rule" aria-hidden="true" />
              <div className="flex items-baseline justify-between">
                <span className="text-[0.85rem] tracking-[0.1em] text-umber-500">
                  合計
                </span>
                <span className="text-[1.3rem] text-umber-800">
                  {formatPrice(reservation.totalPrice)}
                </span>
              </div>
            </Card>

            <p className="text-center text-[0.82rem] leading-loose text-umber-500">
              ご来店を心よりお待ちしております。
            </p>

            <div className="flex flex-col gap-2.5">
              <ButtonLink href="/my-reservations" block>
                予約を確認する
              </ButtonLink>
              <ButtonLink href="/" variant="outline" block>
                トップへ戻る
              </ButtonLink>
            </div>
          </>
        )}
      </Content>
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[0.75rem] tracking-[0.16em] text-champagne-700">{label}</span>
      <span className="text-[1rem] leading-relaxed text-umber-800">{children}</span>
    </div>
  );
}

export default function CompletePage() {
  return (
    <SessionGate>
      {() => (
        <Suspense fallback={<Loading />}>
          <CompleteBody />
        </Suspense>
      )}
    </SessionGate>
  );
}
