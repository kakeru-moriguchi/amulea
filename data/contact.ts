/**
 * ご予約・お問い合わせページ（/contact）の設定
 * ==================================================================
 * 予約方法の案内と、お問い合わせフォームの入力項目を管理しています。
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
  /** リンク先。ページ内リンクの場合は "#contact-form" のように指定します */
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
    actionLabel: "Instagram を見る",
    href: site.links.instagram,
    external: true,
  },
  {
    id: "form",
    titleEn: "Contact Form",
    title: "お問い合わせフォーム",
    description:
      "SNS をご利用でない方は、下のフォームからもご連絡いただけます。2営業日以内にご返信いたします。",
    actionLabel: "フォームへ移動",
    href: "#contact-form",
    external: false,
  },
];

/* ------------------------------------------------------------------
   2. お問い合わせフォームの入力項目
   ------------------------------------------------------------------
   【項目を追加で表示する】
     enabled を true にするだけで、フォームに項目が追加されます。
     ご予約用の「希望メニュー」「希望日」「希望時間」は、
     はじめは enabled: false（非表示）にしてあります。

   【新しい項目を作る】
     この配列に同じ形のオブジェクトを追加してください。
     type は "text" / "email" / "tel" / "textarea" / "select" / "date" / "time"
     が使用できます。
   ------------------------------------------------------------------ */
export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "select"
  | "date"
  | "time";

export type FormField = {
  /** 送信時のキーになる名前（半角英数字） */
  name: string;
  /** 画面に表示するラベル */
  label: string;
  type: FieldType;
  /** 必須項目かどうか */
  required: boolean;
  /** フォームに表示するかどうか */
  enabled: boolean;
  /** 入力欄に薄く表示される例文 */
  placeholder?: string;
  /** ラベルの下に添える補足 */
  hint?: string;
  /** type が "select" のときの選択肢 */
  options?: string[];
  /** 2列レイアウトのときに1行いっぱいに広げる */
  fullWidth?: boolean;
};

export const formFields: FormField[] = [
  {
    name: "name",
    label: "お名前",
    type: "text",
    required: true,
    enabled: true,
    placeholder: "山田 花子",
  },
  {
    name: "email",
    label: "メールアドレス",
    type: "email",
    required: true,
    enabled: true,
    placeholder: "example@amulea.jp",
  },
  {
    name: "tel",
    label: "電話番号",
    type: "tel",
    required: false,
    enabled: true,
    placeholder: "090-1234-5678",
    hint: "ご連絡がつきやすい番号をご記入ください。",
  },

  /* --- ここから下はご予約用の項目です ---------------------------------
     enabled を true に変更すると、フォームに表示されます。 */
  {
    name: "menu",
    label: "希望メニュー",
    type: "select",
    required: false,
    enabled: false,
    hint: "お決まりでない場合は「相談したい」をお選びください。",
    options: [
      "アロマオイルトリートメント",
      "ディープリラックス",
      "ヘッド＆デコルテ",
      "フットリフレクソロジー",
      "Secret Menu",
      "相談したい",
    ],
  },
  {
    name: "date",
    label: "希望日",
    type: "date",
    required: false,
    enabled: false,
  },
  {
    name: "time",
    label: "希望時間",
    type: "time",
    required: false,
    enabled: false,
  },
  /* --- ご予約用の項目はここまで -------------------------------------- */

  {
    name: "message",
    label: "お問い合わせ内容",
    type: "textarea",
    required: true,
    enabled: true,
    fullWidth: true,
    placeholder:
      "ご希望の内容やご不安な点など、お気軽にご記入ください。",
  },
];

/* ------------------------------------------------------------------
   3. フォームの送信先
   ------------------------------------------------------------------
   endpoint が空文字 "" のあいだは、入力内容をメール本文に整形して
   メールソフトを起動します（サーバーなしでも動作します）。

   Formspree・Google フォームなどの送信先 URL を endpoint に設定すると、
   そちらへ直接送信されるようになります。
   ------------------------------------------------------------------ */
export const formConfig = {
  endpoint: "",
  /** メールソフトを起動するときの宛先 */
  mailTo: site.links.email,
  /** メールの件名 */
  mailSubject: "【Amulea】お問い合わせ",
  /** フォームの上に表示する説明文 */
  lead: "いただいたお問い合わせには、2営業日以内にご返信いたします。返信が届かない場合は、迷惑メールフォルダをご確認のうえ、公式LINEよりご連絡ください。",
  /** 送信完了後に表示するメッセージ */
  successMessage:
    "お問い合わせありがとうございます。内容を確認のうえ、2営業日以内にご返信いたします。",
};
