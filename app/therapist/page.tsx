import type { Metadata } from "next";
import BackToHome from "@/components/BackToHome";
import ButtonLink from "@/components/ButtonLink";
import PageActions from "@/components/PageActions";
import PageHeader from "@/components/PageHeader";
import Photo from "@/components/Photo";
import Reveal from "@/components/Reveal";
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
  description: `Amulea のセラピスト「${therapist.name}」のご紹介。サロンを始めた想いと、お客様へのメッセージ。`,
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
              <p className="mt-9 text-[0.95rem] leading-[2.2] text-umber-700">
                {therapist.lead}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          自己紹介
          ============================================================ */}
      <section className="bg-ivory-deep/60 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <SectionHeading
              en={therapist.introduction.heading}
              ja={therapist.introduction.headingJa}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-12 space-y-6">
              {therapist.introduction.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 12)}
                  className="text-[0.88rem] leading-[2.3] text-umber-700/90 sm:text-[0.95rem]"
                >
                  {p}
                </p>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          サロンを始めた想い
          ============================================================ */}
      <section className="relative overflow-hidden bg-umber-800 px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-20">
          <Reveal>
            <div>
              <SectionHeading
                en={therapist.philosophy.heading}
                ja={therapist.philosophy.headingJa}
                align="left"
                tone="dark"
              />
              <div className="mt-10 space-y-6">
                {therapist.philosophy.paragraphs.map((p) => (
                  <p
                    key={p.slice(0, 12)}
                    className="text-[0.88rem] leading-[2.3] text-ivory/75 sm:text-[0.95rem]"
                  >
                    {p}
                  </p>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            {/*
              サロンの世界観が伝わる写真。
              data/therapist.ts とは別に、ここで直接パスを指定できます。
            */}
            <Photo
              src=""
              alt="Amulea の施術室"
              tone="umber"
              className="aspect-[4/5] rounded-[2px]"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          お客様へのメッセージ
          ============================================================ */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <SectionHeading
              en={therapist.message.heading}
              ja={therapist.message.headingJa}
            />
          </Reveal>

          <Reveal delay={0.1}>
            <blockquote className="mt-14 text-center">
              <p className="text-[1.15rem] leading-[2.1] tracking-[0.1em] text-champagne-700 sm:text-[1.4rem]">
                「{therapist.message.highlight}」
              </p>
            </blockquote>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="mt-12 space-y-6">
              {therapist.message.paragraphs.map((p) => (
                <p
                  key={p.slice(0, 12)}
                  className="text-[0.88rem] leading-[2.3] text-umber-700/90 sm:text-[0.95rem]"
                >
                  {p}
                </p>
              ))}
            </div>
            <p className="mt-10 text-right text-[0.9rem] tracking-[0.16em] text-umber-800">
              Amulea　{therapist.name}
            </p>
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
