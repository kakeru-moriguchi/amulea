/**
 * お知らせ・エラー表示
 * ------------------------------------------------------------------
 * ★ エラー文はサーバーから受け取った日本語をそのまま表示します。
 *   React が自動でエスケープするため、XSS は発生しません。
 */

import type { ReactNode } from "react";

type Tone = "info" | "error" | "success";

const tones: Record<Tone, string> = {
  info: "border-champagne-500/30 bg-champagne-50 text-umber-700",
  error: "border-clay/30 bg-clay-light text-clay",
  success: "border-forest/30 bg-forest-light text-forest",
};

export function Notice({
  tone = "info",
  children,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : undefined}
      className={`rounded-xl border px-4 py-3 text-[0.88rem] leading-relaxed whitespace-pre-line ${tones[tone]} ${className}`}
    >
      {children}
    </p>
  );
}

/** 読み込み中の表示 */
export function Loading({ label = "読み込んでいます" }: { label?: string }) {
  return (
    <p className="soft-pulse py-10 text-center text-[0.9rem] tracking-[0.2em] text-umber-400">
      {label}
    </p>
  );
}

/** 何も無いときの表示 */
export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="py-10 text-center text-[0.9rem] leading-relaxed text-umber-400">
      {children}
    </p>
  );
}
