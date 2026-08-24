/**
 * 管理画面の枠組み
 * ==================================================================
 * ★ 管理画面のすべてのページをこの部品で包みます。
 *   ログインしていない場合は、中身を一切表示せずログイン画面へ送ります。
 *
 * ★ ただし「本当の防御」はこの画面ではなく、サーバー側の API です。
 *   画面を迂回して API を直接叩かれても、
 *   管理者セッションが無ければ 401 を返します。
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/client/api";
import { Loading } from "@/components/ui/Notice";

const NAV = [
  { href: "/admin", label: "ホーム" },
  { href: "/admin/reservations", label: "予約一覧" },
  { href: "/admin/calendar", label: "カレンダー" },
  { href: "/admin/settings", label: "設定" },
] as const;

export type Integrations = { googleCalendar: boolean; lineMessaging: boolean };

type SessionInfo = {
  loggedIn: boolean;
  mockMode: boolean;
  integrations: Integrations;
};

export default function AdminShell({
  title,
  children,
}: {
  title: string;
  children: (info: SessionInfo) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void (async () => {
      const result = await apiGet<SessionInfo>("/api/admin/session");
      if (!result.ok || !result.data.loggedIn) {
        router.replace("/admin/login");
        return;
      }
      setInfo(result.data);
      setChecking(false);
    })();
  }, [router]);

  const logout = useCallback(async () => {
    await apiPost("/api/admin/logout");
    router.replace("/admin/login");
  }, [router]);

  if (checking || !info) {
    return (
      <div className="min-h-dvh bg-ivory">
        <Loading label="確認しています" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ivory">
      {/* ヘッダー */}
      <header className="sticky top-0 z-40 border-b border-champagne-500/25 bg-ivory/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="flex flex-col leading-none">
            <span className="font-display text-[1.15rem] tracking-[0.28em] text-umber-700">
              Amulea
            </span>
            <span className="mt-1 text-[0.55rem] tracking-[0.3em] text-champagne-700">
              ADMIN
            </span>
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="min-h-[40px] rounded-full border border-umber-200 px-4 text-[0.78rem] text-umber-500"
          >
            ログアウト
          </button>
        </div>

        {/* ナビゲーション（横スクロールできます） */}
        <nav className="mx-auto max-w-3xl overflow-x-auto px-4 pb-2">
          <ul className="flex gap-2">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-[38px] items-center rounded-full px-4 text-[0.82rem] tracking-[0.08em] whitespace-nowrap transition-colors ${
                      active
                        ? "bg-umber-700 text-champagne-100"
                        : "border border-champagne-500/30 text-umber-600"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </header>

      {/* 連携状態のお知らせ */}
      {(info.mockMode || !info.integrations.googleCalendar) && (
        <div className="border-b border-champagne-500/25 bg-champagne-50 px-4 py-2.5">
          <p className="mx-auto max-w-3xl text-[0.76rem] leading-relaxed text-umber-600">
            {info.mockMode
              ? "開発モードで動作しています。予約データはサーバーの再起動で消え、Google・LINE への連携は行われません。"
              : !info.integrations.googleCalendar
                ? "Google カレンダー連携が未設定です。予約データのみで空き時間を判定しています。"
                : ""}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 py-6">
        <h1 className="mb-5 text-[1.15rem] tracking-[0.12em] text-umber-800">{title}</h1>
        {children(info)}
      </main>
    </div>
  );
}
