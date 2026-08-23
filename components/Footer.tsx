import Link from "next/link";
import { navigation, site } from "@/data/site";
import { InstagramIcon, LineIcon } from "./icons";

/** サイト共通フッター */
export default function Footer() {
  return (
    <footer className="bg-umber-800 text-ivory">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-12 md:grid-cols-[1.1fr_1fr_1fr]">
          {/* ロゴとサロン紹介 */}
          <div>
            <p className="font-display text-2xl tracking-[0.3em] text-ivory">
              {site.name}
            </p>
            <p className="mt-2 text-[0.6rem] tracking-[0.35em] text-champagne-300/80 uppercase">
              {site.tagline}
            </p>
            <p className="mt-6 max-w-xs text-[0.82rem] leading-[2] text-ivory/65">
              完全予約制のプライベートリラクゼーションサロン。
              静かな空間で、自分のためだけの時間をお過ごしください。
            </p>
            <div className="mt-7 flex gap-3">
              <a
                href={site.links.line}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="公式LINE"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-champagne-300/30 text-champagne-200 transition-colors duration-300 hover:border-champagne-300 hover:bg-champagne-500/15"
              >
                <LineIcon className="h-5 w-5" />
              </a>
              <a
                href={site.links.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-champagne-300/30 text-champagne-200 transition-colors duration-300 hover:border-champagne-300 hover:bg-champagne-500/15"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* サイトマップ */}
          <nav aria-label="サイトマップ">
            <p className="font-display text-[0.65rem] tracking-[0.35em] text-champagne-300 uppercase">
              Sitemap
            </p>
            <ul className="mt-6 flex flex-col gap-3.5">
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-[0.85rem] tracking-[0.1em] text-ivory/75 transition-colors duration-300 hover:text-champagne-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* 営業時間 */}
          <div>
            <p className="font-display text-[0.65rem] tracking-[0.35em] text-champagne-300 uppercase">
              Hours
            </p>
            <dl className="mt-6 flex flex-col gap-3.5">
              {site.hours.schedule.map((row) => (
                <div key={row.days} className="text-[0.85rem]">
                  <dt className="text-ivory/75 tracking-[0.1em]">{row.days}</dt>
                  <dd className="mt-0.5 text-ivory/55">{row.time}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-[0.78rem] leading-[1.9] text-ivory/50">
              {site.access.note}
            </p>
          </div>
        </div>

        <div className="gold-rule mt-14 opacity-40" aria-hidden="true" />
        <p className="mt-7 text-center text-[0.68rem] tracking-[0.22em] text-ivory/40">
          © {new Date().getFullYear()} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
