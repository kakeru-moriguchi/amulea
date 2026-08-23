import Link from "next/link";

/**
 * 「← ホームへ戻る」ボタン
 * ------------------------------------------------------------------
 * ホーム以外のすべてのページに設置します。
 * ユーザーが迷わないよう、2つの形で用意しています。
 *
 *  variant="inline"  … ページ上部（見出しのすぐ上）に置く控えめなリンク
 *  variant="button"  … ページ下部に置く、金の枠線のボタン
 *
 * tone="dark" を指定すると、濃い背景の上でも読みやすい配色になります。
 */

type Props = {
  variant?: "inline" | "button";
  tone?: "light" | "dark";
  className?: string;
};

function ArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 12H5" />
      <path d="m11 18-6-6 6-6" />
    </svg>
  );
}

export default function BackToHome({
  variant = "button",
  tone = "light",
  className = "",
}: Props) {
  const dark = tone === "dark";

  if (variant === "inline") {
    return (
      <Link
        href="/"
        className={`group inline-flex items-center gap-2 text-[0.78rem] tracking-[0.2em] transition-colors duration-300 ${
          dark
            ? "text-champagne-200/85 hover:text-champagne-300"
            : "text-forest-600/80 hover:text-champagne-600"
        } ${className}`}
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-1" />
        ホームへ戻る
      </Link>
    );
  }

  return (
    <Link
      href="/"
      className={`group inline-flex items-center justify-center gap-2.5 rounded-full border px-8 py-3.5 text-[0.9rem] tracking-[0.16em] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-champagne-500/10 ${
        dark
          ? "border-champagne-300/50 text-champagne-100 hover:border-champagne-300"
          : "border-champagne-500/60 text-forest-700 hover:border-champagne-500"
      } ${className}`}
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
      ホームへ戻る
    </Link>
  );
}
