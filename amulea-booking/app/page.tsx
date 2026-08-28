/**
 * トップページ（公式LINEのリッチメニューから最初に開く画面）
 * ------------------------------------------------------------------
 * ここでは「予約する」か「予約を確認する」かだけを選んでいただきます。
 * 迷わせないよう、導線は2つに絞っています。
 */

import { ButtonLink } from "@/components/ui/Button";
import { Brand, Content, Screen, SectionHeading } from "@/components/ui/Layout";

export default function HomePage() {
  return (
    <Screen>
      <Brand />
      <Content className="flex flex-col justify-center gap-10">
        <div className="fade-up flex flex-col gap-5 text-center">
          <SectionHeading en="Reservation" ja="ご予約" />
          <p className="text-[0.92rem] leading-loose text-umber-600">
            日常を、そっとほどく時間へ。
            <br />
            ご希望のメニューとお日にちをお選びください。
          </p>
        </div>

        <div className="fade-up flex flex-col gap-3">
          <ButtonLink href="/booking" block>
            はじめてのご予約・新規予約
          </ButtonLink>
          <ButtonLink href="/my-reservations" variant="outline" block>
            ご予約の確認・変更・キャンセル
          </ButtonLink>
        </div>

        <div className="fade-up rounded-2xl border border-champagne-500/20 bg-white/60 p-5">
          <p className="text-[0.78rem] tracking-[0.2em] text-champagne-700">営業時間</p>
          <div className="mt-3 flex flex-col gap-1.5 text-[0.88rem] text-umber-600">
            <p className="flex justify-between">
              <span>月 - 金</span>
              <span>13:00 - 23:00</span>
            </p>
            <p className="flex justify-between">
              <span>土・日・祝</span>
              <span>12:00 - 23:00</span>
            </p>
            <p className="mt-2 text-[0.78rem] leading-relaxed text-umber-400">
              最終ご予約受付は20:00です。
              <br />
              不定休のため、ご予約可能な日はカレンダーをご確認ください。
            </p>
          </div>
        </div>
      </Content>
    </Screen>
  );
}
