import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Shippori_Mincho } from "next/font/google";
import "./globals.css";

/* 既存ホームページと同じ書体を使い、世界観を揃えています */
const shippori = Shippori_Mincho({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-shippori",
});

const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: {
    default: "Amulea｜ご予約",
    template: "%s｜Amulea ご予約",
  },
  description:
    "Amulea（アミュレア）のご予約ページです。ご希望のメニューとお日にちをお選びください。",
  /* 予約ページは検索結果に出す必要がないため、インデックスさせません */
  robots: { index: false, follow: false },
};

/**
 * すべてのページをリクエストのたびに生成します（先読みキャッシュをしない）。
 * ------------------------------------------------------------------
 * 理由は2つあります。
 *
 *  1. 個人情報の保護
 *     予約内容・お名前・電話番号を含む画面を、ビルド時に作り置きしたり
 *     CDN にキャッシュさせたりしないためです。
 *
 *  2. ビルドの安定性
 *     ビルド時にページを先読みレンダリングすると、その工程で
 *     ブラウザ専用の処理につまずいてデプロイが失敗することがあります。
 *     この予約システムは全画面がログイン前提で、先読みしても
 *     得られるものがないため、最初から無効にしています。
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#2d2318",
  /*
    スマートフォンでの操作を最優先にしています。
    ただしユーザーによる拡大は禁止しません（アクセシビリティのため）。
  */
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className={`${shippori.variable} ${cormorant.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-full focus:bg-umber-800 focus:px-5 focus:py-3 focus:text-sm focus:text-ivory"
        >
          本文へスキップ
        </a>
        {children}
      </body>
    </html>
  );
}
