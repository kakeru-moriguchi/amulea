"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navigation, site } from "@/data/site";

/**
 * サイト共通ヘッダー
 * ------------------------------------------------------------------
 * PC          … 5つのメニューを横並びで表示
 * スマートフォン … 同じ5項目をハンバーガーメニュー内に表示
 *
 * トップページでは、メインビジュアルに重なるよう透過して表示し、
 * スクロールすると背景が現れます。
 */
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = pathname === "/";

  /**
   * ヘッダーの背景を透過させる条件。
   *  - トップページの最上部（メインビジュアルに重ねるため）
   *  - スマートフォンのメニューを開いているとき
   */
  const transparent = open || (isHome && !scrolled);

  /**
   * 文字を白系にする条件。
   * メニューを開いているときだけです。トップページのメインビジュアルは
   * 明るい写真のため、透過していても文字は濃い茶色のままにします。
   */
  const lightText = open;

  /* スクロール量に応じて背景を切り替える */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* ページを移動したらメニューを閉じる */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* メニューを開いているあいだは背面のスクロールを止める */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        transparent
          ? "bg-transparent py-5"
          : "bg-ivory/92 py-3 shadow-[0_1px_0_0_rgba(189,154,88,0.22)] backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 sm:px-8">
        {/* ロゴ */}
        <Link
          href="/"
          aria-label={`${site.name} ホームへ`}
          className="group flex flex-col leading-none"
        >
          <span
            className={`font-display text-2xl tracking-[0.3em] transition-colors duration-500 sm:text-[1.7rem] ${
              lightText ? "text-ivory" : "text-umber-700"
            }`}
          >
            {site.name}
          </span>
          <span
            className={`mt-1.5 text-[0.55rem] tracking-[0.35em] transition-colors duration-500 ${
              lightText ? "text-champagne-200/80" : "text-champagne-700"
            }`}
          >
            {site.tagline.toUpperCase()}
          </span>
        </Link>

        {/* PC 用ナビゲーション */}
        <nav aria-label="メインメニュー" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {navigation.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex flex-col items-center gap-1 transition-colors duration-300 ${
                      lightText
                        ? "text-ivory/90 hover:text-champagne-200"
                        : "text-umber-700 hover:text-champagne-600"
                    }`}
                  >
                    <span className="text-[0.82rem] tracking-[0.14em]">
                      {item.label}
                    </span>
                    <span
                      className={`block h-px w-full origin-center bg-champagne-500 transition-transform duration-300 ${
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ハンバーガーボタン（スマートフォン・タブレット） */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "メニューを閉じる" : "メニューを開く"}
          className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-[6px] lg:hidden"
        >
          <span
            className={`block h-px w-6 transition-all duration-300 ${
              open
                ? "translate-y-[7px] rotate-45 bg-champagne-500"
                : lightText
                  ? "bg-ivory"
                  : "bg-umber-700"
            }`}
          />
          <span
            className={`block h-px w-6 transition-all duration-300 ${
              open ? "opacity-0" : lightText ? "bg-ivory" : "bg-umber-700"
            }`}
          />
          <span
            className={`block h-px w-6 transition-all duration-300 ${
              open
                ? "-translate-y-[7px] -rotate-45 bg-champagne-500"
                : lightText
                  ? "bg-ivory"
                  : "bg-umber-700"
            }`}
          />
        </button>
      </div>

      </header>

      {/*
        スマートフォン用メニュー
        --------------------------------------------------------------
        <header> は backdrop-blur を使用しており、backdrop-filter が
        指定された要素は position: fixed の子要素の基準（包含ブロック）に
        なります。ヘッダーの内側に置くとメニューがヘッダーの高さに
        収まってしまうため、<header> の外側に配置しています。
      */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-0 z-40 bg-umber-800 lg:hidden"
      >
        <div className="flex h-full flex-col justify-center px-8 pb-16">
          <nav aria-label="メインメニュー（モバイル）">
            <ul className="flex flex-col gap-1">
              {navigation.map((item, i) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="flex items-baseline gap-4 border-b border-champagne-300/15 py-5"
                    >
                      <span className="font-display text-[0.7rem] tracking-[0.2em] text-champagne-500">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span
                          className={`text-lg tracking-[0.12em] ${
                            active ? "text-champagne-300" : "text-ivory"
                          }`}
                        >
                          {item.label}
                        </span>
                        <span className="font-display text-[0.6rem] tracking-[0.3em] text-champagne-200/50 uppercase">
                          {item.labelEn}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* SNS への導線 */}
          <div className="mt-10 flex flex-col gap-3">
            <a
              href={site.links.line}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-champagne-500 px-6 py-3.5 text-center text-[0.85rem] tracking-[0.16em] text-umber-900"
            >
              公式LINEでご予約
            </a>
            <a
              href={site.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-champagne-300/40 px-6 py-3.5 text-center text-[0.85rem] tracking-[0.16em] text-champagne-100"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
