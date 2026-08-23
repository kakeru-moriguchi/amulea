import type { ReactNode } from "react";

/**
 * 各ページ下部の導線エリア。
 * 「料金表を見る」「ご予約はこちら」「ホームへ戻る」などのボタンを
 * 中央に並べて表示します。
 */
export default function PageActions({
  children,
  note,
}: {
  children: ReactNode;
  /** ボタンの上に添える一言（任意） */
  note?: string;
}) {
  return (
    <section className="bg-ivory-deep/60 px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <div className="gold-rule mx-auto w-24" aria-hidden="true" />
        {note && (
          <p className="mt-8 text-[0.88rem] leading-[2] text-forest-700/80">
            {note}
          </p>
        )}
        <div className="mt-9 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:flex-wrap">
          {children}
        </div>
      </div>
    </section>
  );
}
