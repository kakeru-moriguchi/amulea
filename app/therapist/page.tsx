import type { Metadata } from "next";
import BackToHome from "@/components/BackToHome";
import ButtonLink from "@/components/ButtonLink";
import PageActions from "@/components/PageActions";
import PageHeader from "@/components/PageHeader";
import Photo from "@/components/Photo";
import Reveal from "@/components/Reveal";
import RichText from "@/components/RichText";
import SectionHeading from "@/components/SectionHeading";
import { therapist } from "@/data/therapist";

/**
 * セラピスト（/therapist）
 * ------------------------------------------------------------------
 * 写真・文章はすべて data/therapist.ts から読み込んでいます。
 * 内容の変更は同ファイルの編集のみで完結します。
 */

export const metadata: Metadata = {
  title: "セラピスト",
  description: `Amulea のセラピスト「${therapist.name}」のご紹介。サロンを始めた想いと、施術で大切にしていること。`,
};

export default function TherapistPage() {
  return (
    <>
      <PageHeader
        en="Therapist"
        ja="セラピスト"
        lead="Amulea でお客様をお迎えするセラピストをご紹介します。"
        tone="champagne"
      />

      {/* ============================================================
          プロフィール（写真・名前）
          ============================================================ */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.9fr_1fr] lg:gap-20">
          <Reveal>
            <div className="relative">
              <Photo
                src={therapist.photo.src}
                alt={therapist.photo.alt}
                tone="champagne"
                className="aspect-[3/4] rounded-[2px]"
                sizes="(max-width: 1024px) 100vw, 45vw"
                priority
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-3 -left-3 h-full w-full border border-champagne-400/40 sm:-bottom-5 sm:-left-5"
              />
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <div>
              <p className="font-display text-[0.68rem] tracking-[0.4em] text-champagne-600 uppercase">
                {therapist.role}
              </p>
              <div className="gold-rule my-6 w-16" aria-hidden="true" />
              <h2 className="text-[2.2rem] tracking-[0.22em] text-umber-800 sm:text-[2.8rem]">
                {therapist.name}
              </h2>
              <p className="font-display mt-3 text-[0.7rem] tracking-[0.35em] text-champagne-600/80 uppercase">
                {therapist.nameEn}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          自己紹介
          ============================================================ */}
      <section className="bg-ivory-deep/60 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl">
          <Reveal>
            <SectionHeading
              en={therapist.introduction.heading}
              ja={therapist.introduction.headingJa}
            />
          </Reveal>

          <Reveal delay={0.1}>
            <div className="mt-14 space-y-8">
              {therapist.introduction.paragraphs.map((p) => (
                <RichText
                  key={p.slice(0, 14)}
                  text={p}
                  className="text-[0.9rem] leading-[2.4] text-umber-700/90 sm:text-[0.95rem]"
                />
              ))}
            </div>

            {/* 署名 */}
            <div className="mt-14">
              <div className="gold-rule w-16" aria-hidden="true" />
              <p className="mt-6 text-[0.92rem] tracking-[0.16em] text-umber-800">
                {therapist.signature}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          ページ下部の導線
          ============================================================ */}
      <PageActions note="施術の内容は、メニューページでご覧いただけます。">
        <ButtonLink href="/menu" variant="umber">
          メニューを見る
        </ButtonLink>
        <ButtonLink href="/contact" variant="gold">
          ご予約はこちら
        </ButtonLink>
        <BackToHome />
      </PageActions>
    </>
  );
}
