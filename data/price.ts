/**
 * 料金表ページ（/price）の内容
 * ==================================================================
 * サイト内の料金は、すべてこのファイルで一元管理しています。
 * 金額の改定・コースの追加は、このファイルの編集だけで完了します。
 *
 * 【コースを追加する】
 *   該当するグループの courses 配列に、同じ形のオブジェクトを追加します。
 *     { name: "コース名", duration: "60分", price: 7000, description: "説明" }
 *   price は数値で入力してください（表示時に「¥7,000」へ自動整形されます）。
 *   「＋1,000」のような表記にしたい場合は price を文字列にしても表示できます。
 *   duration を省略すると、時間の表示なしで料金だけが表示されます。
 *
 * 【グループを追加する】
 *   priceGroups 配列に新しいグループを追加してください。
 *   featured: true を付けたグループは、トップページの
 *   「料金のご案内」にも表示されます（1つだけ指定してください）。
 *
 * 【隠れメニュー】
 *   secretMenu に定義しています。掲載を止めたい場合は
 *   secretMenu.visible を false にすると、ページから非表示になります。
 */

export type Course = {
  /** コース名 */
  name: string;
  /** コース名（英字・任意） */
  nameEn?: string;
  /** 施術時間。省略すると時間は表示されません */
  duration?: string;
  /** 料金。数値なら「¥7,000」に自動整形、文字列ならそのまま表示 */
  price: number | string;
  /** 簡単な説明 */
  description: string;
  /** 「人気」などのラベルを付けたいとき（任意） */
  badge?: string;
};

export type PriceGroup = {
  id: string;
  /** グループ名（英字） */
  title: string;
  /** グループ名（日本語） */
  titleJa: string;
  /** グループの説明（任意） */
  note?: string;
  /** トップページの「料金のご案内」に表示するグループ（1つだけ） */
  featured?: boolean;
  courses: Course[];
};

/** 通常メニューの料金 */
export const priceGroups: PriceGroup[] = [
  {
    id: "course",
    title: "Course",
    titleJa: "コース",
    featured: true,
    courses: [
      {
        name: "お試しクイックコース",
        duration: "60分",
        price: 7000,
        description:
          "香りに癒やされ、巡り整う。全身かるくなるアロマリンパトリートメント。",
      },
      {
        name: "極上リンパアロマトリートメント",
        duration: "90分",
        price: 10000,
        description:
          "五感が潤う、極上の巡り。心身をゼロにリセットする全身アロマリンパトリートメント。",
      },
      {
        name: "極上ご褒美フルコース",
        duration: "120分",
        price: 13000,
        description:
          "アロマオイルで足先から指先・デコルテまで丁寧にトリートメント。最後に頭をほぐすことで、極上のリラックス状態へ導きます。",
      },
    ],
  },
  {
    id: "partial",
    title: "Partial Course",
    titleJa: "部分コース",
    courses: [
      {
        name: "下半身",
        duration: "30分",
        price: 4000,
        description:
          "立ち仕事の味方。足の限界を解きほぐすアロマリンパトリートメント。",
      },
      {
        name: "背中・お腹",
        duration: "30分",
        price: 4000,
        description:
          "背中のハリと腹部の緊張をほぐす、身体の巡り徹底改善コース。",
      },
      {
        name: "デコルテ・肩・ヘッド",
        duration: "30分",
        price: 4000,
        description: "首・肩・頭を丸ごとほぐし、最高峰の休息タイム。",
      },
    ],
  },
  {
    id: "option",
    title: "Option",
    titleJa: "オプション",
    note: "各コースに追加してお受けいただけます。",
    courses: [
      {
        name: "ホットストーン",
        price: 1000,
        description: "ストーンの遠赤外線効果で巡り力アップ。",
      },
    ],
  },
];

/**
 * 隠れメニュー
 * ------------------------------------------------------------------
 * visible を false にすると、料金表ページから非表示になります。
 * lead / description / note は空文字 "" にすると表示されません。
 */
export const secretMenu = {
  visible: true,
  title: "Secret Menu",
  titleJa: "隠れメニュー",
  /** 見出しの下に添える一言 */
  lead: "",
  /** 隠れメニュー全体の説明 */
  description: "",
  /** 一覧の下に添える注意書き */
  note: "",
  courses: [
    {
      name: "占い",
      duration: "10分毎",
      price: 1000,
      description: "あなたの心にそっと寄り添います。",
    },
  ] as Course[],
};

/** 料金表ページに添える注意書き */
export const priceNotes = [
  "表示価格はすべて税込です。",
  "初回のお客様は、カウンセリングのお時間を10分ほど頂戴します（料金には含まれません）。",
  "ご予約の変更・キャンセルは、前日までに公式LINEよりご連絡ください。",
];

/** 数値の料金を「¥7,000」の形に整形します */
export function formatPrice(price: number | string): string {
  if (typeof price === "string") return price;
  return `¥${price.toLocaleString("ja-JP")}`;
}
