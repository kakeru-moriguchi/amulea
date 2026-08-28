/**
 * レート制限
 * ==================================================================
 * 予約 API・ログイン API への総当たりや連打を防ぎます。
 *
 * 【この実装について】
 *   サーバーのメモリ上でカウントしています。
 *   Vercel のサーバーレスは複数のインスタンスに分かれることがあるため
 *   「厳密な」上限にはなりませんが、素朴な連打や簡易な攻撃は防げます。
 *
 *   より強固にしたい場合は Vercel KV / Upstash Redis へ
 *   差し替えられるよう、この1ファイルに閉じ込めています。
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** 古いエントリを掃除します（メモリが際限なく増えないように） */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** 次に試せるようになるまでの秒数 */
  retryAfterSec: number;
};

/**
 * @param key       識別子（例: "reserve:1.2.3.4"）
 * @param max       windowSec 秒あたりの上限回数
 * @param windowSec 集計する時間の幅（秒）
 */
export function rateLimit(key: string, max: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { allowed: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * リクエスト元の識別子。
 * Vercel は x-forwarded-for に実際のクライアント IP を入れます。
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
