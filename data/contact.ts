/**
 * ご予約・お問い合わせページ（/contact）の設定
 * ==================================================================
 * 予約方法の案内を管理しています。
 */

import { site } from "./site";

/* ------------------------------------------------------------------
   1. ご予約方法
   ------------------------------------------------------------------
   予約手段を増やしたい場合は、この配列に追加してください。
   ------------------------------------------------------------------ */
export type ReservationMethod = {
  id: "line" | "instagram" | "form" | string;
  /** 見出し（英字） */
  titleEn: string;
  /** 見出し（日本語） */
  title: string;
  /** 説明文 */
  description: string;
  /** ボタンの文言 */
  actionLabel: string;
  /** リンク先。ページ内リンクの場合は "#セクションのid" のように指定します */
  href: string;
  /** 外部サイトへのリンクかどうか */
  external: boolean;
  /** いちばん目立たせたい予約方法に true を指定します */
  primary?: boolean;
};

export const reservationMethods: ReservationMethod[] = [
  {
    id: "line",
    titleEn: "Official LINE",
    title: "公式LINE",
    description:
      "いちばんスムーズにご予約いただける方法です。友だち追加のうえ、ご希望のメニュー・日時をお送りください。空き状況を確認し、折り返しご連絡いたします。ご質問だけのご連絡も歓迎しております。",
    actionLabel: "公式LINEで予約する",
    href: site.links.line,
    external: true,
    primary: true,
  },
  {
    id: "instagram",
    titleEn: "Instagram",
    title: "Instagram DM",
    description:
      "Instagram のダイレクトメッセージからもご予約を承っております。サロンの雰囲気や施術の様子も投稿しておりますので、あわせてご覧ください。",
    actionLabel: "Instagramを見る",
    href: site.links.instagram,
    external: true,
  },
];
