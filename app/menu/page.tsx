import type { Metadata } from "next";
import BackToHome from "@/components/BackToHome";
import ButtonLink from "@/components/ButtonLink";
import PageActions from "@/components/PageActions";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/Reveal";
import SectionHeading from "@/components/SectionHeading";
import { ArrowRightIcon } from "@/components/icons";
import { menuGroups, menuPolicies, type MenuGroup, type MenuItem } from "@/data/menu";

/**
 * メニュー（/menu）
 * ------------------------------------------------------------------
 * 「どんな施術が受けられるのか」を伝えるページです。
 * 料金は掲載せず、「料金表を見る」ボタンから /price へ誘導します。
 * 掲載内容は data/menu.ts で管理しています。
 */

export const metadata: Metadata = {
  title: "メニュー",
  description:
    "Amulea で受けられる施術のご紹介。全身のアロマリンパトリートメント、部分コース、オプションの内容をご覧いただけます。",
};

/** グループの列数に対応するレイアウト */
const columnClass: Record<MenuGroup["columns"], string> = {
  1: "grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
};

export default function MenuPage() {
  return (
    <>
      <PageHeader
        en="Menu"
        ja="メニュー"
        lead="Amulea で受けられる施術をご紹介します。どのメニューも、その日の心と身体の状態にあわせて内容を調整いたします。"
        tone="ivory"
      />

      {/* ============================================================
          グループ一覧（ページ内リンク）
          ============================================================ */}
      <section className="px-5 pt-16 sm:px-8 sm:pt-20">
        <nav aria-label="メニューの種類" className="mx-auto max-w-4xl">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {menuGroups.map((group) => (
              <li key={group.id}>
                <a
                  href={`#${group.id}`}
                  className="group flex flex-col items-center gap-1.5 text-center"
                >
                  <span className="text-[0.85rem] tracking-[0.12em] text-umber-700 transition-colors duration-300 group-hover:text-champagne-600">
                    {group.titleJa}
                  </span>
                  <span className="block h-px w-0 bg-champagne-500 transition-all duration-300 group-hover:w-full" />
                </a>
              </li>
            ))}
          </ul>
          <div className="gold-rule mt-10" aria-hidden="true" />
        </nav>
      </section>

      {/* ============================================================
          各グループのメニュー
          ============================================================ */}
      <div className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-5xl flex-col gap-24 sm:gap-28">
          {menuGroups.map((group) => (
            <section
              key={group.id}
              id={group.id}
              aria-labelledby={`${group.id}-title`}
              className="scroll-mt-28"
            >
              <Reveal>
                <header className="text-center">
                  <p className="font-display text-[0.65rem] tracking-[0.38em] text-champagne-600 uppercase">
                    {group.title}
                  </p>
                  <h2
                    id={`${group.id}-title`}
                    className="mt-4 text-[1.35rem] tracking-[0.16em] text-umber-800 sm:text-[1.6rem]"
                  >
                    {group.titleJa}
                  </h2>
                  {group.note && (
                    <p className="mx-auto mt-5 max-w-md text-[0.85rem] leading-[2] text-umber-700/75">
                      {group.note}
                    </p>
                  )}
                  <div
                    className="gold-rule mx-auto mt-7 w-16"
                    aria-hidden="true"
                  />
                </header>
              </Reveal>

              <ul
                className={`mt-12 grid gap-6 ${columnClass[group.columns]}`}
              >
                {group.items.map((item, i) => (
                  <li key={item.id} className="h-full">
                    <Reveal delay={i * 0.08} className="h-full">
                      <MenuCard item={item} wide={group.columns === 1} />
                    </Reveal>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      {/* ============================================================
          施術に共通する考え方
          ============================================================ */}
      <section className="bg-ivory-deep/60 px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionHeading en="About the treatment" ja="施術について" />
          </Reveal>
          <dl className="mt-14 grid gap-8 sm:grid-cols-3">
            {menuPolicies.map((policy, i) => (
              <Reveal key={policy.title} delay={i * 0.08}>
                <div>
                  <dt className="flex items-baseline gap-2.5 text-[0.9rem] tracking-[0.1em] text-champagne-700">
                    <span
                      aria-hidden="true"
                      className="block h-1.5 w-1.5 shrink-0 rotate-45 border border-champagne-600"
                    />
                    {policy.title}
                  </dt>
                  <dd className="mt-3.5 pl-[1.1rem] text-[0.83rem] leading-[2.1] text-umber-700/80">
                    {policy.body}
                  </dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ============================================================
          ページ下部の導線
          ============================================================ */}
      <PageActions note="コースの時間と料金は、料金表ページでご確認いただけます。">
        <ButtonLink href="/price" variant="umber">
          料金表を見る
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
 * メニュー1件分のカード。
 * wide=true（1列表示）のときは、説明とおすすめを横に並べます。
 */
function MenuCard({ item, wide }: { item: MenuItem; wide: boolean }) {
  return (
    <article className="flex h-full flex-col border border-champagne-400/35 bg-ivory px-7 py-8 sm:px-9 sm:py-10">
      <p className="text-[0.82rem] tracking-[0.14em] text-champagne-700">
        {item.lead}
      </p>
      <h3 className="mt-3 text-[1.15rem] tracking-[0.12em] text-umber-800 sm:text-[1.3rem]">
        {item.name}
      </h3>
      <div className="gold-rule my-6 w-12" aria-hidden="true" />

      <div
        className={
          wide ? "grid gap-8 sm:grid-cols-[1.5fr_1fr] sm:gap-12" : "flex flex-1 flex-col"
        }
      >
        {/* 施術内容 */}
        <div className="space-y-4">
          {item.description.map((p) => (
            <p
              key={p.slice(0, 12)}
              className="text-[0.85rem] leading-[2.2] text-umber-700/90"
            >
              {p}
            </p>
          ))}
        </div>

        {/* こんな方におすすめ */}
        <div className={wide ? "" : "mt-6 flex-1"}>
          <h4 className="font-display text-[0.6rem] tracking-[0.3em] text-champagne-600 uppercase">
            Recommended
          </h4>
          <p className="mt-2 text-[0.8rem] tracking-[0.1em] text-umber-800">
            こんな方におすすめ
          </p>
          <ul className="mt-4 flex flex-col gap-2.5">
            {item.recommendedFor.map((r) => (
              <li
                key={r}
                className="flex items-start gap-2.5 text-[0.82rem] leading-[1.9] text-umber-700/85"
              >
                <span
                  aria-hidden="true"
                  className="mt-[0.7em] block h-1 w-1 shrink-0 rotate-45 bg-champagne-600"
                />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 料金表への導線 */}
      <div className="mt-8">
        <ButtonLink href="/price" variant="outline">
          料金表を見る
          <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </ButtonLink>
      </div>
    </article>
  );
}
