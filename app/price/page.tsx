import type { Metadata } from "next";
import BackToHome from "@/components/BackToHome";
import ButtonLink from "@/components/ButtonLink";
import PageActions from "@/components/PageActions";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import {
  formatPrice,
  priceGroups,
  priceNotes,
  secretMenu,
  type Course,
} from "@/data/price";

/**
 * 料金表（/price）
 * ------------------------------------------------------------------
 * 料金は data/price.ts で一元管理しています。
 * 金額・コースの追加や変更は、同ファイルの編集のみで完結します。
 */

export const metadata: Metadata = {
  title: "料金表",
  description:
    "Amulea の料金一覧。アロマオイルトリートメント、ディープリラックス、ヘッド＆デコルテ、フットリフレクソロジー各コースの時間と料金をご確認いただけます。",
};

export default function PricePage() {
  return (
    <>
      <PageHeader
        en="Price"
        ja="料金表"
        lead="すべて税込価格です。コースの組み合わせやご延長のご相談も承っております。"
        tone="umber"
      />

      {/* ============================================================
          通常メニューの料金
          ============================================================ */}
      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto flex max-w-4xl flex-col gap-20 sm:gap-24">
          {priceGroups.map((group, i) => (
            <Reveal key={group.id} delay={i * 0.05}>
              <section aria-labelledby={`${group.id}-heading`}>
                {/* グループ見出し */}
                <header className="text-center">
                  <p className="font-display text-[0.65rem] tracking-[0.38em] text-champagne-600 uppercase">
                    {group.title}
                  </p>
                  <h2
                    id={`${group.id}-heading`}
                    className="mt-4 text-[1.25rem] tracking-[0.16em] text-umber-800 sm:text-[1.45rem]"
                  >
                    {group.titleJa}
                  </h2>
                  {group.note && (
                    <p className="mx-auto mt-4 max-w-md text-[0.83rem] leading-[2] text-umber-700/70">
                      {group.note}
                    </p>
                  )}
                  <div className="gold-rule mx-auto mt-7 w-16" aria-hidden="true" />
                </header>

                {/* コース一覧 */}
                <ul className="mt-9 divide-y divide-champagne-400/25 border-y border-champagne-400/25">
                  {group.courses.map((course) => (
                    <CourseRow key={course.name} course={course} />
                  ))}
                </ul>
              </section>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================================================
          Secret Menu（隠れメニュー）
          ============================================================ */}
      {secretMenu.visible && (
        <section
          aria-labelledby="secret-heading"
          className="relative overflow-hidden bg-umber-800 px-5 py-20 sm:px-8 sm:py-28"
        >
          {/* 背景の装飾 */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(189,154,88,0.16),transparent_60%)]"
          />

          <div className="relative mx-auto max-w-4xl">
            <Reveal>
              <header className="text-center">
                <p className="font-display text-[0.65rem] tracking-[0.4em] text-champagne-400 uppercase">
                  {secretMenu.title}
                </p>
                <div className="gold-rule mx-auto my-6 w-16" aria-hidden="true" />
                <h2
                  id="secret-heading"
                  className="text-[1.3rem] tracking-[0.18em] text-ivory sm:text-[1.6rem]"
                >
                  {secretMenu.titleJa}
                </h2>
                <p className="mt-5 text-[0.85rem] tracking-[0.14em] text-champagne-300">
                  {secretMenu.lead}
                </p>
                <p className="mx-auto mt-6 max-w-lg text-[0.85rem] leading-[2.2] text-ivory/70">
                  {secretMenu.description}
                </p>
              </header>
            </Reveal>

            <Reveal delay={0.1}>
              <ul className="mt-12 divide-y divide-champagne-300/20 border-y border-champagne-300/20">
                {secretMenu.courses.map((course) => (
                  <CourseRow key={course.name} course={course} tone="dark" />
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.15}>
              <p className="mt-9 text-center text-[0.78rem] leading-[1.9] text-ivory/50">
                ※ Secret Menu は予約枠に限りがございます。ご希望の際は、
                お早めに公式LINEよりご相談ください。
              </p>
            </Reveal>
          </div>
        </section>
      )}

      {/* ============================================================
          ご注意事項
          ============================================================ */}
      <section className="px-5 py-16 sm:px-8 sm:py-20">
        <Reveal>
          <div className="mx-auto max-w-3xl border border-champagne-400/30 bg-ivory px-7 py-9 sm:px-10 sm:py-11">
            <h2 className="font-display text-[0.65rem] tracking-[0.35em] text-champagne-600 uppercase">
              Notes
            </h2>
            <p className="mt-4 text-[1rem] tracking-[0.14em] text-umber-800">
              ご利用にあたって
            </p>
            <ul className="mt-7 flex flex-col gap-3.5">
              {priceNotes.map((note) => (
                <li
                  key={note}
                  className="flex items-start gap-3 text-[0.84rem] leading-[2] text-umber-700/80"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[0.75em] block h-1 w-1 shrink-0 rotate-45 bg-champagne-600"
                  />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </section>

      {/* ============================================================
          ページ下部の導線
          ============================================================ */}
      <PageActions note="施術の内容は、メニューページで写真とあわせてご覧いただけます。">
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

/**
 * 料金表の1行。コース名・時間・料金・説明を表示します。
 */
function CourseRow({
  course,
  tone = "light",
}: {
  course: Course;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <li className="flex flex-col gap-3 py-7 sm:flex-row sm:items-baseline sm:justify-between sm:gap-10">
      <div className="sm:flex-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <h3
            className={`text-[1rem] tracking-[0.12em] ${
              dark ? "text-ivory" : "text-umber-800"
            }`}
          >
            {course.name}
          </h3>
          {course.nameEn && (
            <span
              className={`font-display text-[0.58rem] tracking-[0.28em] uppercase ${
                dark ? "text-champagne-400/80" : "text-champagne-600/80"
              }`}
            >
              {course.nameEn}
            </span>
          )}
          {course.badge && (
            <span className="rounded-full border border-champagne-500/60 px-2.5 py-0.5 text-[0.62rem] tracking-[0.18em] text-champagne-600">
              {course.badge}
            </span>
          )}
        </div>
        <p
          className={`mt-2.5 max-w-lg text-[0.82rem] leading-[2] ${
            dark ? "text-ivory/60" : "text-umber-700/70"
          }`}
        >
          {course.description}
        </p>
      </div>

      {/* 時間と料金 */}
      <p className="flex shrink-0 items-baseline gap-3 sm:justify-end">
        <span
          className={`text-[0.82rem] tracking-[0.1em] ${
            dark ? "text-champagne-300/80" : "text-umber-700/70"
          }`}
        >
          {course.duration}
        </span>
        <span
          aria-hidden="true"
          className={dark ? "text-champagne-400/50" : "text-champagne-400"}
        >
          /
        </span>
        <span
          className={`font-display text-[1.2rem] tracking-[0.06em] ${
            dark ? "text-champagne-200" : "text-champagne-700"
          }`}
        >
          {formatPrice(course.price)}
        </span>
      </p>
    </li>
  );
}
