import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Shippori_Mincho } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { site } from "@/data/site";
import "./globals.css";

/* 日本語の本文・見出し用の明朝体 */
const shippori = Shippori_Mincho({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-shippori",
});

/* 英字の装飾見出し用のセリフ体 */
const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
});

export const metadata: Metadata = {
  title: {
    default: `${site.name}｜${site.tagline}`,
    template: `%s｜${site.name}`,
  },
  description:
    "Amulea（アミュレア）は完全予約制のプライベートリラクゼーションサロンです。静かな空間で、その日のあなたに合わせた施術をご提供します。",
  openGraph: {
    title: `${site.name}｜${site.tagline}`,
    description:
      "完全予約制のプライベートリラクゼーションサロン Amulea。静かな空間で、自分のためだけの時間を。",
    type: "website",
    locale: "ja_JP",
    siteName: site.name,
  },
};

export const viewport: Viewport = {
  themeColor: "#2d2318",
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
        <Header />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
