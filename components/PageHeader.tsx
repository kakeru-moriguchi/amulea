import BackToHome from "./BackToHome";
import Photo, { type PhotoTone } from "./Photo";
import { pageHeader } from "@/data/site";

/**
 * 下層ページ共通のページヘッダー。
 * ページ上部にも「← ホームへ戻る」を配置し、
 * ユーザーがページのどこにいてもホームへ戻れるようにしています。
 *
 * 背景写真と、その上に重ねる色は data/site.ts の pageHeader で
 * 一括管理しています（4ページすべてに同じ設定が反映されます）。
 */
export default function PageHeader({
  en,
  ja,
  lead,
  photoSrc,
  tone = "ivory",
}: {
  en: string;
  ja: string;
  lead?: string;
  /** このページだけ別の写真にしたいときに指定します */
  photoSrc?: string;
  tone?: PhotoTone;
}) {
  const src = photoSrc ?? pageHeader.image;
  const isLight = pageHeader.overlay === "light";

  /* 写真の上に重ねる色。明るい写真にはクリーム、暗い写真には濃い茶色。 */
  const overlay = isLight
    ? "bg-[linear-gradient(to_top,rgba(247,241,231,0.94),rgba(247,241,231,0.72)_55%,rgba(247,241,231,0.5))]"
    : "bg-[linear-gradient(to_top,rgba(30,23,16,0.88),rgba(30,23,16,0.55)_55%,rgba(30,23,16,0.35))]";

  return (
    <section className="relative isolate flex min-h-[52vh] items-end overflow-hidden pt-28 pb-14 sm:min-h-[58vh] sm:pt-32 sm:pb-16">
      {/* 背景写真 */}
      <div className="absolute inset-0 -z-10">
        <Photo
          src={src}
          alt={`${ja}のイメージ`}
          tone={tone}
          className="h-full w-full"
          sizes="100vw"
          priority
        />
        <div aria-hidden="true" className={`absolute inset-0 ${overlay}`} />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ページ上部の「← ホームへ戻る」 */}
        <BackToHome
          variant="inline"
          tone={isLight ? "light" : "dark"}
          className="mb-8"
        />

        <p
          className={`font-display text-[0.7rem] tracking-[0.45em] uppercase ${
            isLight ? "text-champagne-700" : "text-champagne-300"
          }`}
        >
          {en}
        </p>
        <div className="gold-rule my-5 w-16" aria-hidden="true" />
        <h1
          className={`text-[1.8rem] tracking-[0.18em] sm:text-[2.4rem] ${
            isLight ? "text-umber-800" : "text-ivory"
          }`}
        >
          {ja}
        </h1>
        {lead && (
          <p
            className={`mt-5 max-w-xl text-[0.9rem] leading-[2] sm:text-[0.95rem] ${
              isLight ? "text-umber-700/85" : "text-ivory/80"
            }`}
          >
            {lead}
          </p>
        )}
      </div>
    </section>
  );
}
