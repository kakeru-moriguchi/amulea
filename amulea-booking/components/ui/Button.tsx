/**
 * ボタン
 * ------------------------------------------------------------------
 * 既存ホームページの ButtonLink と同じ見た目に揃えています。
 *
 * ★ スマートフォン最優先の設計
 *   ・高さを 56px 以上にして、片手でも押しやすくしています
 *   ・文字は 15px 以上（小さくしすぎない）
 *   ・処理中は二重送信を防ぐため自動的に押せなくなります
 */

"use client";

import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "gold" | "umber" | "outline" | "quiet";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full text-center tracking-[0.12em] " +
  "whitespace-nowrap transition-all duration-300 ease-out disabled:cursor-not-allowed " +
  "disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none";

const sizes: Record<Size, string> = {
  md: "min-h-[48px] px-6 py-3 text-[0.9rem]",
  lg: "min-h-[56px] px-8 py-4 text-[0.98rem]",
};

const variants: Record<Variant, string> = {
  gold:
    "bg-champagne-500 text-umber-900 shadow-[0_6px_20px_-8px_rgba(168,130,63,0.7)] " +
    "hover:bg-champagne-400 hover:-translate-y-0.5",
  umber: "bg-umber-700 text-champagne-100 hover:bg-umber-600 hover:-translate-y-0.5",
  outline:
    "border border-champagne-500/60 text-umber-700 hover:border-champagne-500 " +
    "hover:bg-champagne-500/10",
  quiet: "text-umber-500 underline underline-offset-4 hover:text-umber-700",
};

type CommonProps = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  block?: boolean;
  className?: string;
};

export function Button({
  children,
  variant = "gold",
  size = "lg",
  block = false,
  className = "",
  type = "button",
  loading = false,
  disabled,
  ...rest
}: CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${base} ${sizes[size]} ${variants[variant]} ${
        block ? "w-full" : ""
      } ${className}`}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden="true"
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}

export function ButtonLink({
  children,
  href,
  variant = "gold",
  size = "lg",
  block = false,
  className = "",
  external = false,
}: CommonProps & { href: string; external?: boolean }) {
  const classes = `${base} ${sizes[size]} ${variants[variant]} ${
    block ? "w-full" : ""
  } ${className}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
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
