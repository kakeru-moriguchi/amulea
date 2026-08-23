/**
 * 料金表ページ（/price）の内容
 * ==================================================================
 * サイト内の料金は、すべてこのファイルで一元管理しています。
 * 金額の改定・コースの追加は、このファイルの編集だけで完了します。
 *
 * 【コースを追加する】
 *   該当するグループの courses 配列に、同じ形のオブジェクトを追加します。
 *     { name: "コース名", duration: "60分", price: 9000, description: "説明" }
 *   price は数値で入力してください（表示時に「¥9,000」へ自動整形されます）。
 *   「＋3,000」のような表記にしたい場合は price を文字列にしても表示できます。
 *
 * 【グループを追加する】
 *   priceGroups 配列に新しいグループを追加してください。
 *
 * 【Secret Menu】
 *   secretMenu に定義しています。掲載を止めたい場合は
 *   secretMenu.visible を false にすると、ページから非表示になります。
 */

export type Course = {
  /** コース名 */
  name: string;
  /** コース名（英字・任意） */
  nameEn?: string;
  /** 施術時間 */
  duration: string;
  /** 料金。数値なら「¥9,000」に自動整形、文字列ならそのまま表示 */
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
  courses: Course[];
};

/** 通常メニューの料金 */
export const priceGroups: PriceGroup[] = [
  {
    id: "aroma",
    title: "Aroma Oil Treatment",
    titleJa: "アロマオイルトリートメント",
    note: "香りとともに全身をゆるめる、Amulea の基本の施術です。",
    courses: [
      {
        name: "お試しコース",
        duration: "40分",
        price: 6000,
        description: "背中と肩を中心に。はじめての方にもお受けいただきやすい短時間コースです。",
      },
      {
        name: "スタンダードコース",
        duration: "60分",
        price: 9000,
        description: "背中・脚・腕をひと通り。全身のバランスを整える、いちばん選ばれているコースです。",
        badge: "人気",
      },
      {
        name: "フルボディコース",
        duration: "90分",
        price: 13000,
        description: "デコルテまで含めた全身を、時間をかけて丁寧に。深い休息をお求めの方へ。",
      },
      {
        name: "ロングリラックスコース",
        duration: "120分",
        price: 17000,
        description: "時間を気にせず、心ゆくまで。気になる部分に十分な時間を配分できます。",
      },
    ],
  },
  {
    id: "deep",
    title: "Deep Relax",
    titleJa: "ディープリラックス",
    note: "深いこりに向き合う、しっかりめの圧のトリートメントです。",
    courses: [
      {
        name: "ポイントコース",
        duration: "45分",
        price: 7500,
        description: "肩まわり、腰まわりなど、気になる一箇所に集中して施術します。",
      },
      {
        name: "スタンダードコース",
        duration: "70分",
        price: 11500,
        description: "上半身または下半身をしっかりと。慢性的な重さが続いている方へ。",
      },
      {
        name: "フルコース",
        duration: "100分",
        price: 16000,
        description: "全身の深部まで時間をかけて。施術後の軽さが長く続きます。",
      },
    ],
  },
  {
    id: "head",
    title: "Head & Décolleté",
    titleJa: "ヘッド＆デコルテ",
    note: "頭・首・肩・鎖骨まわりに絞った、思考を休ませる施術です。",
    courses: [
      {
        name: "ショートコース",
        duration: "30分",
        price: 4500,
        description: "頭皮と首すじを中心に。お仕事の合間にもお受けいただけます。",
      },
      {
        name: "スタンダードコース",
        duration: "50分",
        price: 7500,
        description: "頭・首・肩・デコルテまでを一続きに。目の奥の重さが気になる方へ。",
      },
    ],
  },
  {
    id: "foot",
    title: "Foot Reflexology",
    titleJa: "フットリフレクソロジー",
    note: "足裏からふくらはぎへ、一日分の重さを流していきます。",
    courses: [
      {
        name: "ショートコース",
        duration: "30分",
        price: 4500,
        description: "足裏の反射区を中心に。むくみが気になる日に。",
      },
      {
        name: "スタンダードコース",
        duration: "50分",
        price: 7000,
        description: "足裏から膝裏まで。冷えやだるさが続いている方におすすめです。",
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
        name: "ヘッドスパ追加",
        duration: "20分",
        price: "＋3,000",
        description: "施術の仕上げに、頭皮をゆっくりとゆるめる時間を追加します。",
      },
      {
        name: "フット追加",
        duration: "20分",
        price: "＋3,000",
        description: "全身メニューのあとに。脚の軽さをより実感していただけます。",
      },
      {
        name: "延長",
        duration: "10分ごと",
        price: "＋1,500",
        description: "当日の延長も、空き状況により承ります。お気軽にお申しつけください。",
      },
    ],
  },
];

/**
 * Secret Menu（隠れメニュー）
 * ------------------------------------------------------------------
 * visible を false にすると、料金表ページから非表示になります。
 */
export const secretMenu = {
  visible: true,
  title: "Secret Menu",
  titleJa: "隠れメニュー",
  lead: "ご紹介・リピーターのお客様へ。",
  description:
    "通常メニューには掲載していない、時間をかけてお受けいただくためのコースです。ご予約時に「Secret Menu 希望」とお伝えください。空き状況により、ご希望に添えない場合がございます。",
  courses: [
    {
      name: "Amulea 特別コース",
      nameEn: "Signature",
      duration: "150分",
      price: 22000,
      description:
        "アロマオイル・ディープリラックス・ヘッド・フットを、その日の状態に合わせて自由に組み立てる特別コースです。",
    },
    {
      name: "夜のロングコース",
      nameEn: "Late Night",
      duration: "180分",
      price: 26000,
      description:
        "営業時間外の遅い時間帯に、時間を気にせずお過ごしいただくコース。一日の終わりに深い休息を。",
    },
    {
      name: "季節のトリートメント",
      nameEn: "Seasonal",
      duration: "100分",
      price: 16500,
      description:
        "季節に合わせた精油とオイルでご用意する、期間限定のトリートメントです。内容は公式LINEにてご案内します。",
    },
  ] as Course[],
};

/** 料金表ページに添える注意書き */
export const priceNotes = [
  "表示価格はすべて税込です。",
  "お支払いは現金・各種クレジットカード・QRコード決済をご利用いただけます。",
  "初回のお客様は、カウンセリングのお時間を10分ほど頂戴します（料金には含まれません）。",
  "ご予約の変更・キャンセルは、前日までに公式LINEよりご連絡ください。",
];

/** 数値の料金を「¥9,000」の形に整形します */
export function formatPrice(price: number | string): string {
  if (typeof price === "string") return price;
  return `¥${price.toLocaleString("ja-JP")}`;
}
