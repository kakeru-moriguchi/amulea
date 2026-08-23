import type { Metadata } from "next";
import BackToHome from "@/components/BackToHome";
import ButtonLink from "@/components/ButtonLink";
import PageActions from "@/components/PageActions";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { ArrowRightIcon, ClockIcon, InstagramIcon, LineIcon } from "@/components/icons";
import { reservationMethods, type ReservationMethod } from "@/data/contact";
import { site } from "@/data/site";

/**
 * ご予約・お問い合わせ（/contact）
 * ------------------------------------------------------------------
 * ご予約・お問い合わせの窓口（公式LINE / Instagram）をご案内し、
 * 営業時間、そしてページ下部の導線を配置しています。
 * 掲載内容は data/contact.ts と data/site.ts で管理しています。
 */

export const metadata: Metadata = {
  title: "ご予約・お問い合わせ",
  description:
    "Amulea のご予約・お問い合わせページ。公式LINE・Instagram からご予約とお問い合わせを承っております。",
};

/** 英字ラベルを表示するか（見出しと同じ言葉なら表示しない） */
function showTitleEn(method: ReservationMethod): boolean {
  return method.titleEn.toLowerCase() !== method.title.toLowerCase();
}

/** 予約方法ごとのアイコン */
function MethodIcon({ id, className }: { id: string; className?: string }) {
  if (id === "line") return <LineIcon className={className} />;
  if (id === "instagram") return <InstagramIcon className={className} />;
  return <ArrowRightIcon className={className} />;
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        en="Reservation & Contact"
        ja="ご予約・お問い合わせ"
        lead="Amulea は完全予約制です。ご予約・ご相談は、公式LINE より承っております。"
        tone="umber"
      />

      {/* ============================================================
          ご予約
          ============================================================ */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading en="Reservation" ja="ご予約" />
            <p className="mx-auto mt-8 max-w-xl text-center text-[0.88rem] leading-[2.2] text-umber-700/80">
              ご希望のメニューと日時をお知らせください。
              <br className="hidden sm:block" />
              お決まりでない場合も、ご相談いただきながらお選びいただけます。
            </p>
          </Reveal>

          <div className="mt-16 flex flex-col gap-6">
            {reservationMethods.map((method, i) => (
              <Reveal key={method.id} delay={i * 0.08}>
                <div
                  className={`flex flex-col gap-7 border px-7 py-9 sm:px-10 sm:py-11 md:flex-row md:items-center md:gap-10 ${
                    method.primary
                      ? "border-champagne-500/50 bg-champagne-50/70"
                      : "border-champagne-400/30 bg-ivory"
                  }`}
                >
                  {/* アイコン */}
                  <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
                      method.primary
                        ? "bg-umber-700 text-champagne-200"
                        : "border border-champagne-500/40 text-champagne-600"
                    }`}
                  >
                    <MethodIcon id={method.id} className="h-6 w-6" />
                  </span>

                  {/* 見出しと説明 */}
                  <div className="md:flex-1">
                    {/*
                      英字ラベル（titleEn）が見出し（title）と同じ文字列のときは、
                      同じ言葉が二段に重なってしまうため表示しません。
                    */}
                    {(showTitleEn(method) || method.primary) && (
                      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        {showTitleEn(method) && (
                          <p className="font-display text-[0.6rem] tracking-[0.32em] text-champagne-600 uppercase">
                            {method.titleEn}
                          </p>
                        )}
                        {method.primary && (
                          <span className="rounded-full bg-champagne-500/20 px-3 py-0.5 text-[0.62rem] tracking-[0.16em] text-champagne-700">
                            おすすめ
                          </span>
                        )}
                      </div>
                    )}
                    <h3 className="text-[1.1rem] tracking-[0.14em] text-umber-800">
                      {method.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-[0.85rem] leading-[2.1] text-umber-700/80">
                      {method.description}
                    </p>
                  </div>

                  <div className="md:w-64 md:shrink-0">
                    <ButtonLink
                      href={method.href}
                      external={method.external}
                      variant={method.primary ? "gold" : "outline"}
                      block
                    >
                      {method.actionLabel}
                      <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </ButtonLink>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* 営業時間の再掲（予約前に確認いただけるように） */}
          <Reveal>
            <div className="mt-12 border border-champagne-400/30 px-7 py-8 sm:px-10">
              <div className="flex items-center gap-3 text-champagne-600">
                <ClockIcon className="h-5 w-5" />
                <h3 className="font-display text-[0.62rem] tracking-[0.32em] uppercase">
                  Business Hours
                </h3>
              </div>
              <dl className="mt-6 grid gap-x-10 gap-y-4 sm:grid-cols-3">
                {site.hours.schedule.map((row) => (
                  <div key={row.days}>
                    <dt className="text-[0.83rem] tracking-[0.1em] text-umber-700">
                      {row.days}
                    </dt>
                    <dd className="mt-1 text-[0.83rem] text-umber-700/65">
                      {row.time}
                    </dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-6 flex flex-col gap-2">
                {site.hours.notes.map((note) => (
                  <li
                    key={note}
                    className="text-[0.77rem] leading-[1.9] text-umber-700/60"
                  >
                    ※ {note}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          ページ下部の導線（営業時間のすぐ下）
          ============================================================ */}
      <PageActions note="お気軽にご連絡ください。お会いできる日を楽しみにしております。">
        <ButtonLink href={site.links.line} variant="gold" external>
          <LineIcon className="h-4 w-4" />
          公式LINEで予約
        </ButtonLink>
        <BackToHome />
      </PageActions>
    </>
  );
}
