import BackToHome from "./BackToHome";
import Photo, { type PhotoTone } from "./Photo";

/**
 * 下層ページ共通のページヘッダー。
 * ページ上部にも「← ホームへ戻る」を配置し、
 * ユーザーがページのどこにいてもホームへ戻れるようにしています。
 */
export default function PageHeader({
  en,
  ja,
  lead,
  photoSrc,
  tone = "umber",
}: {
  en: string;
  ja: string;
  lead?: string;
  photoSrc?: string;
  tone?: PhotoTone;
}) {
  return (
    <section className="relative isolate flex min-h-[52vh] items-end overflow-hidden pt-28 pb-14 sm:min-h-[58vh] sm:pt-32 sm:pb-16">
      {/* 背景写真 */}
      <div className="absolute inset-0 -z-10">
        <Photo
          src={photoSrc}
          alt={`${ja}のイメージ`}
          tone={tone}
          className="h-full w-full"
          sizes="100vw"
          priority
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(30,23,16,0.88),rgba(30,23,16,0.55)_55%,rgba(30,23,16,0.35))]"
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
        {/* ページ上部の「← ホームへ戻る」 */}
        <BackToHome variant="inline" tone="dark" className="mb-8" />

        <p className="font-display text-[0.7rem] tracking-[0.45em] text-champagne-300 uppercase">
          {en}
        </p>
        <div className="gold-rule my-5 w-16" aria-hidden="true" />
        <h1 className="text-[1.8rem] tracking-[0.18em] text-ivory sm:text-[2.4rem]">
          {ja}
        </h1>
        {lead && (
          <p className="mt-5 max-w-xl text-[0.9rem] leading-[2] text-ivory/80 sm:text-[0.95rem]">
            {lead}
          </p>
        )}
      </div>
    </section>
  );
}
