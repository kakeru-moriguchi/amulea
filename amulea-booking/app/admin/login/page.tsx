/**
 * 管理者ログイン
 * ------------------------------------------------------------------
 * ★ ID とパスワードのどちらが違うかは表示しません（総当たり対策）。
 * ★ パスワードはサーバー側でハッシュと比較されます。
 */

"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Notice";

export default function AdminLoginPage() {
  const router = useRouter();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setWorking(true);
      setMessage("");

      const result = await apiPost("/api/admin/login", { id, password });
      if (!result.ok) {
        setMessage(result.error.message);
        setWorking(false);
        return;
      }
      router.replace("/admin");
    },
    [id, password, router],
  );

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory px-5">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl border border-champagne-500/25 bg-white/70 p-7"
      >
        <div className="text-center">
          <p className="font-display text-[1.4rem] tracking-[0.28em] text-umber-700">
            Amulea
          </p>
          <p className="mt-1 text-[0.6rem] tracking-[0.3em] text-champagne-700">
            ADMIN LOGIN
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-id" className="text-[0.82rem] text-umber-700">
            管理者ID
          </label>
          <input
            id="admin-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            autoComplete="username"
            required
            className="min-h-[50px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800 focus:border-champagne-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="admin-password" className="text-[0.82rem] text-umber-700">
            パスワード
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="min-h-[50px] rounded-xl border border-champagne-500/30 bg-white px-4 text-umber-800 focus:border-champagne-500 focus:outline-none"
          />
        </div>

        {message && <Notice tone="error">{message}</Notice>}

        <Button type="submit" block loading={working}>
          ログイン
        </Button>
      </form>
    </div>
  );
}
