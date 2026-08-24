/**
 * 進行状況の表示
 * ------------------------------------------------------------------
 * 「あと何をすれば予約が終わるのか」がひと目で分かるようにします。
 * スマートフォンの狭い画面でも読めるよう、4段階にまとめています。
 */

"use client";

export const STEP_LABELS = ["メニュー", "日時", "お客様情報", "確認"] as const;

export default function StepIndicator({ current }: { current: number }) {
  return (
    <nav aria-label="ご予約の進行状況">
      <ol className="flex items-start">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const done = step < current;
          const active = step === current;

          return (
            <li key={label} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                {/* 左側の線 */}
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 ${
                    i === 0
                      ? "bg-transparent"
                      : done || active
                        ? "bg-champagne-500"
                        : "bg-champagne-500/25"
                  }`}
                />

                <span
                  aria-current={active ? "step" : undefined}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[0.75rem] transition-colors duration-300 ${
                    done
                      ? "border-champagne-500 bg-champagne-500 text-umber-900"
                      : active
                        ? "border-champagne-500 bg-ivory text-champagne-700"
                        : "border-champagne-500/30 bg-ivory text-umber-300"
                  }`}
                >
                  {done ? "✓" : step}
                </span>

                {/* 右側の線 */}
                <span
                  aria-hidden="true"
                  className={`h-px flex-1 ${
                    i === STEP_LABELS.length - 1
                      ? "bg-transparent"
                      : done
                        ? "bg-champagne-500"
                        : "bg-champagne-500/25"
                  }`}
                />
              </div>

              <span
                className={`mt-1.5 text-[0.68rem] tracking-[0.05em] ${
                  active ? "text-umber-800" : "text-umber-400"
                }`}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
