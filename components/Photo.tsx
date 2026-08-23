import Image from "next/image";

/**
 * 写真表示コンポーネント
 * ------------------------------------------------------------------
 * src に画像パスを渡すと写真を、空文字 "" のあいだは
 * ブランドカラーのプレースホルダーを表示します。
 *
 * 写真を差し替えるときは、画像を public/images/ に置いて
 * data/ 配下のファイルの src を "/images/xxx.jpg" に変更するだけです。
 */

export type PhotoTone = "umber" | "champagne" | "ivory";

type Props = {
  src?: string;
  alt: string;
  /** プレースホルダーの色味 */
  tone?: PhotoTone;
  /** 縦横比（Tailwind の aspect-* クラス） */
  className?: string;
  /** 一覧の先頭など、最初に見える写真には true を指定します */
  priority?: boolean;
  /** レスポンシブ表示幅のヒント */
  sizes?: string;
  /** 写真のどの部分を見せるか（Tailwind の object-position クラス） */
  objectPosition?: string;
};

const toneStyles: Record<PhotoTone, { bg: string; motif: string; label: string }> = {
  umber: {
    bg: "bg-[linear-gradient(150deg,var(--color-umber-700),var(--color-umber-900))]",
    motif: "text-champagne-300/40",
    label: "text-champagne-200/70",
  },
  champagne: {
    bg: "bg-[linear-gradient(150deg,var(--color-champagne-200),var(--color-champagne-400))]",
    motif: "text-umber-800/25",
    label: "text-umber-800/60",
  },
  ivory: {
    bg: "bg-[linear-gradient(150deg,var(--color-ivory),var(--color-ivory-deep))]",
    motif: "text-champagne-500/35",
    label: "text-umber-700/50",
  },
};

export default function Photo({
  src,
  alt,
  tone = "umber",
  className = "aspect-[4/5]",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
  objectPosition = "object-center",
}: Props) {
  const hasPhoto = Boolean(src && src.trim() !== "");

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {hasPhoto ? (
        <Image
          src={src as string}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={`object-cover ${objectPosition}`}
        />
      ) : (
        <Placeholder tone={tone} alt={alt} />
      )}
    </div>
  );
}

/**
 * 写真が未設定のあいだに表示される、ブランドカラーのプレースホルダー。
 * 実際の写真を設定すると自動的に置き換わります。
 */
function Placeholder({ tone, alt }: { tone: PhotoTone; alt: string }) {
  const s = toneStyles[tone];
  return (
    <div
      role="img"
      aria-label={`${alt}（写真は準備中です）`}
      className={`absolute inset-0 flex items-center justify-center ${s.bg}`}
    >
      {/* 装飾用の植物のライン */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 260"
        className={`absolute inset-0 h-full w-full ${s.motif}`}
        preserveAspectRatio="xMidYMid slice"
      >
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
        >
          <path d="M100 250 C100 180 100 120 100 40" />
          <path d="M100 200 C70 190 55 165 58 138 C88 142 100 168 100 200 Z" />
          <path d="M100 168 C130 158 145 133 142 106 C112 110 100 136 100 168 Z" />
          <path d="M100 136 C70 126 55 101 58 74 C88 78 100 104 100 136 Z" />
          <path d="M100 104 C130 94 145 69 142 42 C112 46 100 72 100 104 Z" />
          <circle cx="100" cy="34" r="6" />
        </g>
      </svg>
      <span
        className={`font-display relative text-[0.65rem] tracking-[0.45em] uppercase ${s.label}`}
      >
        Amulea
      </span>
    </div>
  );
}
