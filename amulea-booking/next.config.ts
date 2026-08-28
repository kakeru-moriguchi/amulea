import type { NextConfig } from "next";

/**
 * セキュリティ用の HTTP ヘッダー
 * ------------------------------------------------------------------
 * ブラウザ側で守ってもらう設定です。
 *
 * Content-Security-Policy（CSP）
 *   読み込んでよいスクリプト・画像などの出どころを限定します。
 *   万一 XSS の穴があっても、外部への情報送信を防ぎやすくなります。
 *
 *   'unsafe-inline'（script-src）について
 *     Next.js は画面の初期表示のためにインラインの <script> を出力します。
 *     これを許可しないとアプリが動かないため、やむを得ず許可しています。
 *     そのぶん、XSS そのものを起こさない対策を徹底しています。
 *       ・dangerouslySetInnerHTML を一切使わない
 *       ・保存前に制御文字を取り除く
 *       ・React の自動エスケープに任せる
 */
const CSP = [
  "default-src 'self'",
  // LIFF SDK は LINE の CDN から読み込みます
  "script-src 'self' 'unsafe-inline' https://static.line-scdn.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: https://profile.line-scdn.net",
  // LINE ログインの通信を許可します
  "connect-src 'self' https://api.line.me https://static.line-scdn.net",
  // 他サイトの iframe に埋め込ませません（クリックジャッキング対策）
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP },
  // 拡張子を偽装したファイルを別の種類として解釈させません
  { key: "X-Content-Type-Options", value: "nosniff" },
  // iframe への埋め込みを禁止します
  { key: "X-Frame-Options", value: "DENY" },
  /*
    ★ 予約 ID は URL に含まれるため、外部サイトへ Referer として
      漏れないように「同一オリジンのみ」に制限しています。
  */
  { key: "Referrer-Policy", value: "same-origin" },
  // 使わない機能は明示的に無効化します
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // 常に HTTPS で接続させます
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  /**
   * このフォルダを単独のプロジェクトとして扱わせます。
   * （親フォルダにも別プロジェクトの package-lock.json があるため、
   *   指定しないと Next.js がどちらを基準にするか警告を出します）
   */
  turbopack: { root: process.cwd() },

  /** サーバーの種類を外部へ知らせません */
  poweredByHeader: false,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        /* API の応答は絶対にキャッシュさせません（個人情報を含むため） */
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },
};

export default nextConfig;
