import type { Metadata } from "next";
import BackToHome from "@/components/BackToHome";
import ButtonLink from "@/components/ButtonLink";
import PageActions from "@/components/PageActions";
import PageHeader from "@/components/PageHeader";
import Photo from "@/components/Photo";
import Reveal from "@/components/Reveal";
import { ArrowRightIcon } from "@/components/icons";
import { menuItems } from "@/data/menu";

/**
 * メニュー（/menu）
 * ------------------------------------------------------------------
 * 「どんな施術が受けられるのか」を写真と説明で伝えるページです。
 * 料金は掲載せず、「料金表を見る」ボタンから /price へ誘導します。
 * 掲載内容は data/menu.ts で管理しています。
 */

export const metadata: Metadata = {
  title: "メニュー",
  description:
    "Amulea で受けられる施術のご紹介。アロマオイルトリートメント、ディープリラックス、ヘッド＆デコルテ、フットリフレクソロジーの内容と特徴をご覧いただけます。",
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
          メニュー一覧（ページ内リンク）
          ============================================================ */}
      <section className="px-5 pt-16 sm:px-8 sm:pt-20">
        <nav aria-label="メニュー一覧" className="mx-auto max-w-4xl">
          <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {menuItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="group flex flex-col items-center gap-1.5 text-center"
                >
                  <span className="text-[0.85rem] tracking-[0.12em] text-forest-700 transition-colors duration-300 group-hover:text-champagne-600">
                    {item.name}
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
          各メニューの詳細
          ============================================================ */}
      <div className="px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-6xl flex-col gap-24 sm:gap-32">
          {menuItems.map((item, i) => {
            /* 交互に写真の左右を入れ替えます */
            const reversed = i % 2 === 1;
            return (
              <section
                key={item.id}
                id={item.id}
                aria-labelledby={`${item.id}-title`}
                className="scroll-mt-28"
              >
                <div className="grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
                  {/* 写真 */}
                  <Reveal className={reversed ? "lg:order-2" : ""}>
                    <div className="relative lg:sticky lg:top-28">
                      <Photo
                        src={item.photo.src}
                        alt={item.photo.alt}
                        tone={i % 2 === 0 ? "ivory" : "champagne"}
                        className="aspect-[4/5] rounded-[2px]"
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        priority={i === 0}
                      />
                      <div
                        aria-hidden="true"
                        className={`pointer-events-none absolute -bottom-3 h-full w-full border border-champagne-400/40 sm:-bottom-5 ${
                          reversed
                            ? "-right-3 sm:-right-5"
                            : "-left-3 sm:-left-5"
                        }`}
                      />
                    </div>
                  </Reveal>

                  {/* 説明 */}
                  <Reveal delay={0.1} className={reversed ? "lg:order-1" : ""}>
                    <div>
                      <p className="font-display text-[0.62rem] tracking-[0.35em] text-champagne-600 uppercase">
                        {String(i + 1).padStart(2, "0")} ／ {item.nameEn}
                      </p>
                      <h2
                        id={`${item.id}-title`}
                        className="mt-4 text-[1.45rem] tracking-[0.14em] text-forest-800 sm:text-[1.8rem]"
                      >
                        {item.name}
                      </h2>
                      <div className="gold-rule my-7 w-16" aria-hidden="true" />

                      {/* 施術内容 */}
                      <div className="space-y-5">
                        {item.description.map((p) => (
                          <p
                            key={p.slice(0, 12)}
                            className="text-[0.88rem] leading-[2.3] text-forest-700/90 sm:text-[0.92rem]"
                          >
                            {p}
                          </p>
                        ))}
                      </div>

                      {/* こんな方におすすめ */}
                      <div className="mt-10 border border-champagne-400/35 bg-champagne-50/50 px-6 py-7 sm:px-8">
                        <h3 className="text-[0.92rem] tracking-[0.14em] text-forest-800">
                          こんな方におすすめ
                        </h3>
                        <ul className="mt-5 flex flex-col gap-3">
                          {item.recommendedFor.map((r) => (
                            <li
                              key={r}
                              className="flex items-start gap-3 text-[0.85rem] leading-[1.95] text-forest-700/85"
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

                      {/* 施術の特徴 */}
                      <div className="mt-10">
                        <h3 className="text-[0.92rem] tracking-[0.14em] text-forest-800">
                          施術の特徴
                        </h3>
                        <dl className="mt-6 flex flex-col divide-y divide-champagne-400/25 border-t border-champagne-400/25">
                          {item.features.map((f) => (
                            <div key={f.title} className="py-5">
                              <dt className="flex items-baseline gap-2.5 text-[0.86rem] tracking-[0.1em] text-champagne-700">
                                <span
                                  aria-hidden="true"
                                  className="block h-1.5 w-1.5 shrink-0 rotate-45 border border-champagne-600"
                                />
                                {f.title}
                              </dt>
                              <dd className="mt-2.5 pl-[1.1rem] text-[0.84rem] leading-[2.1] text-forest-700/80">
                                {f.body}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {/* 料金表への導線 */}
                      <div className="mt-9">
                        <ButtonLink href="/price" variant="outline">
                          料金表を見る
                          <ArrowRightIcon className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                        </ButtonLink>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          ページ下部の導線
          ============================================================ */}
      <PageActions note="コースの時間と料金は、料金表ページでご確認いただけます。">
        <ButtonLink href="/price" variant="forest">
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
