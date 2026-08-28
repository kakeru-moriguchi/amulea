/**
 * 新規予約ページ
 * ------------------------------------------------------------------
 * SessionGate で包むことで、必ずログイン済みの状態から始まります。
 */

"use client";

import SessionGate from "@/components/SessionGate";
import BookingWizard from "@/components/booking/BookingWizard";

export default function BookingPage() {
  return (
    <SessionGate>
      {(session) => <BookingWizard session={session} />}
    </SessionGate>
  );
}
