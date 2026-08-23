import type { ReactNode } from "react";

/**
 * 文章を表示するための小さな部品。
 * ------------------------------------------------------------------
 *  ・文中の \n は、書いた位置でそのまま改行されます。
 *  ・**文字** のように ** で囲んだ部分は、強調表示されます。
 *
 * data/ 配下のファイルに文章を書くときに使えます。
 */
export default function RichText({
  text,
  className = "",
  emphasisClassName = "text-champagne-700",
}: {
  text: string;
  className?: string;
  /** 強調部分の色。濃い背景の上では "text-champagne-300" などを指定します */
  emphasisClassName?: string;
}) {
  return (
    <p className={`whitespace-pre-line ${className}`}>
      {renderEmphasis(text, emphasisClassName)}
    </p>
  );
}

/** **文字** を強調表示に変換します */
function renderEmphasis(text: string, emphasisClassName: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className={`font-medium ${emphasisClassName}`}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}
