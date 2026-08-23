import Link from "next/link";
import type { ReactNode } from "react";

/**
 * サイト共通のボタン。Amulea のシャンパンゴールドとフォレストグリーンを
 * 使った、世界観を壊さない上品な見た目に統一しています。
 *
 * 【variant】
 *   gold    … シャンパンゴールドの塗り（主要導線：ご予約など）
 *   forest  … フォレストグリーンの塗り（次点の導線：メニュー・料金表など）
 *   outline … 細い金の枠線（補助的な導線）
 *
 * 【tone】
 *   light … 明るい背景の上に置く場合（初期値）
 *   dark  … フォレストグリーンなど濃い背景の上に置く場合
 *           ※ outline は背景の明るさで文字色が変わるため、
 *             濃い背景の上では必ず tone="dark" を指定してください。
 */

type Variant = "gold" | "forest" | "outline";
type Tone = "light" | "dark";

type Props = {
  href: string;
  children: ReactNode;
  variant?: Variant;
  tone?: Tone;
  /** 外部リンク（LINE / Instagram など）の場合は true */
  external?: boolean;
  /** 横幅いっぱいに広げる */
  block?: boolean;
  className?: string;
};

const base =
  "group inline-flex items-center justify-center gap-2.5 rounded-full px-8 py-3.5 text-center text-[0.9rem] tracking-[0.16em] transition-all duration-300 ease-out";

/** variant と tone の組み合わせごとの見た目 */
const styles: Record<Variant, Record<Tone, string>> = {
  gold: {
    light:
      "bg-champagne-500 text-forest-900 shadow-[0_6px_20px_-8px_rgba(168,130,63,0.7)] hover:bg-champagne-400 hover:shadow-[0_10px_28px_-8px_rgba(168,130,63,0.8)] hover:-translate-y-0.5",
    dark: "bg-champagne-500 text-forest-900 shadow-[0_6px_20px_-8px_rgba(168,130,63,0.7)] hover:bg-champagne-400 hover:shadow-[0_10px_28px_-8px_rgba(168,130,63,0.8)] hover:-translate-y-0.5",
  },
  forest: {
    light:
      "bg-forest-700 text-champagne-100 hover:bg-forest-600 hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-10px_rgba(20,45,35,0.8)]",
    dark: "bg-forest-600 text-champagne-100 hover:bg-forest-500 hover:-translate-y-0.5",
  },
  outline: {
    light:
      "border border-champagne-500/60 text-forest-700 hover:border-champagne-500 hover:bg-champagne-500/10 hover:-translate-y-0.5",
    dark: "border border-champagne-300/50 text-champagne-100 hover:border-champagne-300 hover:bg-champagne-500/15 hover:-translate-y-0.5",
  },
};

export default function ButtonLink({
  href,
  children,
  variant = "gold",
  tone = "light",
  external = false,
  block = false,
  className = "",
}: Props) {
  const classes = `${base} ${styles[variant][tone]} ${block ? "w-full" : ""} ${className}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
