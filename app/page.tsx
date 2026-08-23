import Link from "next/link";
import ButtonLink from "@/components/ButtonLink";
import Photo from "@/components/Photo";
import Reveal from "@/components/Reveal";
import RichText from "@/components/RichText";
import SectionHeading from "@/components/SectionHeading";
import { ArrowRightIcon, ClockIcon, InstagramIcon, LineIcon } from "@/components/icons";
import { menuGroups } from "@/data/menu";
import { priceGroups, formatPrice } from "@/data/price";
import { site } from "@/data/site";
import { therapist } from "@/data/therapist";

/**
 * ホーム（/）
 * ------------------------------------------------------------------
 * メインビジュアル / キャッチコピー / Amulea の紹介 /
 * セラピスト・メニュー・料金表・ご予約への導線 /
 * Instagram・公式LINE / 営業時間 をまとめたトップページです。
 */

/**
 * トップページに並べるコースを、料金表データから取り出します。
 * data/price.ts で featured: true を付けたグループが表示されます。
 */
const featuredGroup =
  priceGroups.find((g) => g.featured) ?? priceGroups[0];

export default function HomePage() {
  return (
    <>
      {/* ============================================================
          メインビジュアル
          ============================================================ */}
      <section className="relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 -z-10">
          {/*
            メインビジュアルの写真を差し替えるときは、画像を
            public/images/ に置いて下の src に "/images/xxx.jpg" を指定します。
          */}
          <Photo
            src=""
            alt="Amulea のサロン空間"
            tone="umber"
            className="h-full w-full"
            sizes="100vw"
            priority
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(30,23,16,0.62),rgba(30,23,16,0.45)_40%,rgba(30,23,16,0.82))]"
          />
        </div>

        <div className="mx-auto max-w-3xl px-6 pt-24 pb-28 text-center sm:pt-28">
          {/* ロゴ・サロン名 */}
          <p className="font-display text-[2.9rem] leading-none tracking-[0.28em] text-ivory sm:text-[4.2rem]">
            {site.name}
          </p>
          <p className="mt-4 text-[0.62rem] tracking-[0.42em] text-champagne-300 uppercase sm:text-[0.7rem]">
            {site.tagline}
          </p>

          <div className="gold-rule mx-auto my-10 w-20" aria-hidden="true" />

          {/* キャッチコピー */}
          <h1 className="text-[1.5rem] leading-[1.9] tracking-[0.18em] text-ivory sm:text-[2.1rem]">
            {site.catchCopy.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>

          <p className="mt-8 text-[0.85rem] leading-[2.2] whitespace-pre-line text-ivory/75 sm:text-[0.95rem]">
            {site.catchLead}
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
            <ButtonLink href="/contact" variant="gold">
              ご予約はこちら
            </ButtonLink>
            <ButtonLink
              href="/menu"
              variant="outline"
              tone="dark"
            >
              メニューを見る
            </ButtonLink>
          </div>
        </div>

        {/* スクロールを促す表示 */}
        <div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3"
        >
          <span className="font-display text-[0.55rem] tracking-[0.35em] text-champagne-200/70 uppercase">
            Scroll
          </span>
          <span className="block h-12 w-px bg-[linear-gradient(to_bottom,var(--color-champagne-400),transparent)]" />
        </div>
      </section>

      {/* ============================================================
          Amulea の紹介
          ============================================================ */}
      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading
              en={site.about.heading}
              ja={site.about.headingJa}
            />
          </Reveal>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <div className="relative">
                {/* サロンの世界観が伝わる写真 */}
                <Photo
                  src=""
                  alt="Amulea の施術室"
                  tone="ivory"
                  className="aspect-[4/5] rounded-[2px]"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
                {/* 装飾の金枠 */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-3 -bottom-3 h-full w-full border border-champagne-400/40 sm:-right-5 sm:-bottom-5"
                />
              </div>
            </Reveal>

            <Reveal delay={0.15}>
              <div className="space-y-6">
                {site.about.paragraphs.map((p) => (
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
        </div>
      </section>

      {/* ============================================================
          セラピストへの導線
          ============================================================ */}
      <section className="relative overflow-hidden bg-umber-800 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[0.85fr_1fr] lg:gap-20">
          <Reveal>
            <Photo
              src={therapist.photo.src}
              alt={therapist.photo.alt}
              tone="champagne"
              className="aspect-[3/4] rounded-[2px]"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
          </Reveal>

          <Reveal delay={0.15}>
            <div>
              <SectionHeading
                en="Therapist"
                ja="セラピスト紹介"
                align="left"
                tone="dark"
              />
              <p className="mt-8 font-display text-3xl tracking-[0.2em] text-champagne-200">
                {therapist.name}
              </p>
              <p className="mt-2 text-[0.62rem] tracking-[0.35em] text-champagne-400/80 uppercase">
                {therapist.nameEn} / {therapist.role}
              </p>
              {/* 自己紹介の冒頭2段落を抜粋して掲載します */}
              <div className="mt-8 max-w-lg space-y-5">
                {therapist.introduction.paragraphs.slice(0, 2).map((p) => (
                  <RichText
                    key={p.slice(0, 14)}
                    text={p}
                    className="text-[0.88rem] leading-[2.3] text-ivory/75 sm:text-[0.95rem]"
                    emphasisClassName="text-champagne-300"
                  />
                ))}
              </div>
              <div className="mt-10">
                <ButtonLink href="/therapist" variant="outline" tone="dark">
                  セラピストについて
                  <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </ButtonLink>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          メニューへの導線
          ============================================================ */}
      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading en="Menu" ja="施術メニュー" />
            <p className="mx-auto mt-8 max-w-xl text-center text-[0.88rem] leading-[2.2] text-umber-700/80">
              その日の心と身体の状態にあわせて、
              <br className="hidden sm:block" />
              施術の内容と時間を組み立てていきます。
            </p>
          </Reveal>

          {/* メニューの種類ごとに、内容を一覧で紹介します */}
          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            {menuGroups.map((group, gi) => (
              <Reveal key={group.id} delay={gi * 0.1}>
                <Link
                  href={`/menu#${group.id}`}
                  className="group flex h-full flex-col border border-champagne-400/35 bg-ivory px-7 py-9 transition-colors duration-300 hover:border-champagne-500/60 sm:px-8"
                >
                  <p className="font-display text-[0.6rem] tracking-[0.3em] text-champagne-600 uppercase">
                    {group.title}
                  </p>
                  <h3 className="mt-2.5 text-[1.1rem] tracking-[0.12em] text-umber-800 transition-colors duration-300 group-hover:text-champagne-600">
                    {group.titleJa}
                  </h3>
                  <div className="gold-rule my-6 w-12" aria-hidden="true" />

                  <ul className="flex flex-1 flex-col gap-4">
                    {group.items.map((item) => (
                      <li key={item.id}>
                        <p className="text-[0.9rem] tracking-[0.08em] text-umber-800">
                          {item.name}
                        </p>
                        <p className="mt-1 text-[0.8rem] leading-[1.9] text-umber-700/70">
                          {item.lead}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <span className="mt-7 inline-flex items-center gap-2 text-[0.78rem] tracking-[0.16em] text-champagne-700">
                    詳しく見る
                    <ArrowRightIcon className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div className="mt-16 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <ButtonLink href="/menu" variant="umber">
                メニューを詳しく見る
              </ButtonLink>
              <ButtonLink href="/price" variant="outline">
                料金表を見る
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          料金表への導線
          ============================================================ */}
      <section className="bg-ivory-deep/60 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <SectionHeading en="Price" ja="料金のご案内" />
          </Reveal>

          <Reveal delay={0.1}>
            <ul className="mt-14 divide-y divide-champagne-400/25 border-y border-champagne-400/25">
              {featuredGroup.courses.map((course) => (
                <li
                  key={course.name}
                  className="flex flex-col gap-2 py-6 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8"
                >
                  <div>
                    <p className="text-[0.95rem] tracking-[0.1em] text-umber-800">
                      {course.name}
                    </p>
                    <p className="mt-1 text-[0.8rem] leading-[1.9] text-umber-700/65">
                      {course.description}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-[1.1rem] tracking-[0.08em] text-champagne-700">
                    {course.duration && (
                      <>
                        {course.duration}
                        <span className="mx-2.5 text-champagne-400">/</span>
                      </>
                    )}
                    {formatPrice(course.price)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-center text-[0.78rem] text-umber-700/60">
              部分コース・オプション・隠れメニューは、料金表でご確認いただけます。
            </p>
          </Reveal>

          <Reveal>
            <div className="mt-12 text-center">
              <ButtonLink href="/price" variant="umber">
                料金表を見る
                <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ============================================================
          営業時間 / Instagram / 公式LINE
          ============================================================ */}
      <section className="px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionHeading en="Information" ja="ご利用案内" />
          </Reveal>

          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            {/* 営業時間 */}
            <Reveal>
              <div className="h-full border border-champagne-400/30 bg-ivory px-7 py-9 sm:px-10 sm:py-11">
                <div className="flex items-center gap-3 text-champagne-600">
                  <ClockIcon className="h-5 w-5" />
                  <p className="font-display text-[0.65rem] tracking-[0.35em] uppercase">
                    Business Hours
                  </p>
                </div>
                <h3 className="mt-5 text-[1.1rem] tracking-[0.14em] text-umber-800">
                  営業時間
                </h3>

                <dl className="mt-7 flex flex-col gap-4">
                  {site.hours.schedule.map((row) => (
                    <div
                      key={row.days}
                      className="flex flex-col gap-1 border-b border-champagne-400/20 pb-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                    >
                      <dt className="text-[0.86rem] tracking-[0.1em] text-umber-700">
                        {row.days}
                      </dt>
                      <dd className="text-[0.86rem] text-umber-700/70">
                        {row.time}
                      </dd>
                    </div>
                  ))}
                </dl>

                <ul className="mt-6 flex flex-col gap-2">
                  {site.hours.notes.map((note) => (
                    <li
                      key={note}
                      className="text-[0.78rem] leading-[1.9] text-umber-700/60"
                    >
                      ※ {note}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            {/* Instagram / 公式LINE */}
            <Reveal delay={0.12}>
              <div className="flex h-full flex-col gap-6">
                <a
                  href={site.links.line}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-1 items-center gap-6 border border-champagne-400/30 bg-ivory px-7 py-8 transition-all duration-300 hover:border-champagne-500/60 hover:bg-champagne-50 sm:px-10"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-umber-700 text-champagne-200 transition-colors duration-300 group-hover:bg-umber-600">
                    <LineIcon className="h-7 w-7" />
                  </span>
                  <span className="flex-1">
                    <span className="font-display block text-[0.62rem] tracking-[0.3em] text-champagne-600 uppercase">
                      Official LINE
                    </span>
                    <span className="mt-1.5 block text-[1rem] tracking-[0.1em] text-umber-800">
                      公式LINE
                    </span>
                    <span className="mt-1.5 block text-[0.8rem] text-umber-700/65">
                      ご予約・ご相談はこちらから
                      {site.links.lineId && `　${site.links.lineId}`}
                    </span>
                  </span>
                  <ArrowRightIcon className="h-5 w-5 shrink-0 text-champagne-600 transition-transform duration-300 group-hover:translate-x-1" />
                </a>

                <a
                  href={site.links.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-1 items-center gap-6 border border-champagne-400/30 bg-ivory px-7 py-8 transition-all duration-300 hover:border-champagne-500/60 hover:bg-champagne-50 sm:px-10"
                >
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-umber-700 text-champagne-200 transition-colors duration-300 group-hover:bg-umber-600">
                    <InstagramIcon className="h-6 w-6" />
                  </span>
                  <span className="flex-1">
                    <span className="font-display block text-[0.62rem] tracking-[0.3em] text-champagne-600 uppercase">
                      Instagram
                    </span>
                    <span className="mt-1.5 block text-[1rem] tracking-[0.1em] text-umber-800">
                      サロンの日々
                    </span>
                    <span className="mt-1.5 block text-[0.8rem] text-umber-700/65">
                      施術の様子やお知らせを発信中　{site.links.instagramId}
                    </span>
                  </span>
                  <ArrowRightIcon className="h-5 w-5 shrink-0 text-champagne-600 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ============================================================
          ご予約への導線
          ============================================================ */}
      <section className="relative isolate overflow-hidden px-5 py-28 sm:px-8 sm:py-36">
        <div className="absolute inset-0 -z-10">
          <Photo
            src=""
            alt="Amulea のサロン空間"
            tone="umber"
            className="h-full w-full"
            sizes="100vw"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-umber-900/75"
          />
        </div>

        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionHeading en="Reservation" ja="ご予約" tone="dark" />
            <p className="mt-8 text-[0.9rem] leading-[2.2] text-ivory/80">
              Amulea は完全予約制です。
              <br />
              公式LINEより承っております。
              <br className="hidden sm:block" />
              はじめての方も、どうぞお気軽にご連絡ください。
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-3.5 sm:flex-row">
              <ButtonLink href="/contact" variant="gold">
                ご予約・お問い合わせ
              </ButtonLink>
              <ButtonLink
                href={site.links.line}
                variant="outline"
                tone="dark"
                external
              >
                <LineIcon className="h-4 w-4" />
                公式LINEで予約
              </ButtonLink>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
