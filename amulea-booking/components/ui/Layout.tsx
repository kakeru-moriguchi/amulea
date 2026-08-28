/**
 * 画面の骨格
 * ------------------------------------------------------------------
 * ヘッダー・本文の幅・区切り線など、全ページ共通の見た目です。
 */

import type { ReactNode } from "react";

/** ページ全体の枠（スマートフォンでちょうど良い幅に収めます） */
export function Screen({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-ivory">
      {children}
    </div>
  );
}

/** 画面上部のロゴ帯 */
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <header className="border-b border-champagne-500/20 bg-ivory/95 px-5 py-4 backdrop-blur-md">
      <a href={href} className="flex flex-col items-center leading-none">
        <span className="font-display text-[1.6rem] tracking-[0.3em] text-umber-700">
          Amulea
        </span>
        <span className="mt-1.5 text-[0.55rem] tracking-[0.35em] text-champagne-700">
          PRIVATE RELAXATION SALON
        </span>
      </a>
    </header>
  );
}

/** 本文の余白 */
export function Content({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main id="main" className={`flex-1 px-5 py-7 ${className}`}>{children}</main>;
}

/** セクション見出し（英字 + 金の線 + 日本語） */
export function SectionHeading({
  en,
  ja,
  align = "center",
}: {
  en: string;
  ja?: string;
  align?: "center" | "left";
}) {
  const isCenter = align === "center";
  return (
    <div className={isCenter ? "text-center" : "text-left"}>
      <p className="font-display text-[0.66rem] tracking-[0.4em] text-champagne-600 uppercase">
        {en}
      </p>
      <div
        className={`gold-rule my-4 h-px w-14 ${isCenter ? "mx-auto" : ""}`}
        aria-hidden="true"
      />
      {ja && (
        <h1 className="text-[1.25rem] tracking-[0.14em] text-umber-800">{ja}</h1>
      )}
    </div>
  );
}

/** 白いカード */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-champagne-500/20 bg-white/70 p-5 ${className}`}
    >
      {children}
    </div>
  );
}

/** 画面下に固定する操作エリア（片手で押しやすい位置） */
export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-30 mt-auto border-t border-champagne-500/20 bg-ivory/95 px-5 pt-4 backdrop-blur-md safe-bottom">
      {children}
    </div>
  );
}
