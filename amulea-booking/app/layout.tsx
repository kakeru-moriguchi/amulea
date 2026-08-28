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
