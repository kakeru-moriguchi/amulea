/**
 * セクション見出し。英字の小見出し + 日本語の見出し + 金の細い線。
 */
export default function SectionHeading({
  en,
  ja,
  align = "center",
  tone = "light",
}: {
  en: string;
  ja?: string;
  align?: "center" | "left";
  /** light … 明るい背景用 / dark … 濃い背景用 */
  tone?: "light" | "dark";
}) {
  const isCenter = align === "center";
  return (
    <div className={isCenter ? "text-center" : "text-left"}>
      <p
        className={`font-display text-[0.68rem] tracking-[0.4em] uppercase ${
          tone === "dark" ? "text-champagne-300" : "text-champagne-600"
        }`}
      >
        {en}
      </p>
      <div
        className={`gold-rule my-5 h-px w-16 ${isCenter ? "mx-auto" : ""}`}
        aria-hidden="true"
      />
      {ja && (
        <h2
          className={`text-[1.35rem] tracking-[0.16em] sm:text-[1.6rem] ${
            tone === "dark" ? "text-ivory" : "text-umber-800"
          }`}
        >
          {ja}
        </h2>
      )}
    </div>
  );
}
