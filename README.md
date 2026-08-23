# Amulea ホームページ

プライベートリラクゼーションサロン **Amulea** の公式サイトです。
Next.js（App Router）+ TypeScript + Tailwind CSS で制作しています。

---

## ページ構成

サイトは以下の 5 ページ構成です。

```text
Amulea
│
├── ホーム                 /
├── セラピスト             /therapist
├── メニュー               /menu
├── 料金表                 /price
└── ご予約・問い合わせ     /contact
```

ホーム以外の 4 ページには、**ページ上部**（見出しの上）と
**ページ下部**（ボタン）の 2 か所に「← ホームへ戻る」を設置しています。
あわせてヘッダーのロゴ・ナビゲーション・フッターのサイトマップからも
ホームへ戻れます。

---

## 起動方法

```bash
npm install     # 初回のみ
npm run dev     # 開発サーバー  http://localhost:3000
npm run build   # 本番用ビルド
npm run start   # 本番用サーバー
```

---

## 内容の変更方法

文章・写真・料金は、すべて `data/` フォルダの中で管理しています。
**画面のコードを触らずに、このフォルダの編集だけで内容を変更できます。**

| ファイル | 変更できる内容 |
| --- | --- |
| `data/site.ts` | サロン名・キャッチコピー・Amulea の紹介文・営業時間・公式LINE / Instagram のURL・ヘッダーのメニュー |
| `data/therapist.ts` | セラピストの写真・名前・自己紹介・サロンを始めた想い・お客様へのメッセージ |
| `data/menu.ts` | 各メニューの写真・メニュー名・施術内容・こんな方におすすめ・施術の特徴 |
| `data/price.ts` | **すべての料金**（通常メニュー・オプション・Secret Menu）・注意書き |
| `data/contact.ts` | ご予約方法の案内・お問い合わせフォームの入力項目・送信先 |

各ファイルの先頭に、編集方法のコメントを日本語で記載しています。

### 料金を変更する

`data/price.ts` を開き、該当する金額を書き換えます。

```ts
{
  name: "スタンダードコース",
  duration: "60分",
  price: 9000,        // ← ここを書き換えるだけ（¥9,000 と自動整形されます）
  description: "背中・脚・腕をひと通り。...",
},
```

コースを増やしたいときは、同じ形のかたまりを配列に追加します。
料金表ページとトップページの両方に自動で反映されます。

### Secret Menu（隠れメニュー）

`data/price.ts` の `secretMenu` で管理しています。
掲載を止めたいときは `visible` を `false` にしてください。

```ts
export const secretMenu = {
  visible: true,   // ← false にすると料金表ページから消えます
  ...
};
```

### 写真を差し替える

1. 画像ファイルを `public/images/` に置きます
2. `data/` の該当ファイルの `src` を `"/images/ファイル名.jpg"` に書き換えます

`src` が空文字 `""` のあいだは、ブランドカラーのプレースホルダーが
表示されます（レイアウトは崩れません）。
詳しくは `public/images/README.md` をご覧ください。

### ご予約用の入力項目を追加する

お問い合わせフォームには「希望メニュー」「希望日」「希望時間」を
あらかじめ用意してあります。はじめは非表示です。
`data/contact.ts` の `enabled` を `true` に変えるだけで表示されます。

```ts
{
  name: "menu",
  label: "希望メニュー",
  type: "select",
  required: false,
  enabled: false,   // ← true にするとフォームに追加されます
  ...
},
```

### お問い合わせフォームの送信先

`data/contact.ts` の `formConfig.endpoint` が空文字 `""` のあいだは、
入力内容をメール本文に整形して**メールソフトを起動**します
（サーバーの用意なしで動作します）。

Formspree や Google フォームなどの送信先 URL を `endpoint` に設定すると、
そちらへ直接送信されるようになります。

```ts
export const formConfig = {
  endpoint: "https://formspree.io/f/xxxxxxxx",  // ← 設定するとフォーム送信に切り替わります
  ...
};
```

---

## 公開前のチェックリスト

`data/site.ts` の以下の項目は**仮の値**です。公開前に必ず差し替えてください。

- [ ] `links.line` … 公式LINE の友だち追加 URL
- [ ] `links.lineId` … 画面に表示する LINE ID
- [ ] `links.instagram` … Instagram のプロフィール URL
- [ ] `links.instagramId` … 画面に表示するアカウント名
- [ ] `links.email` … お問い合わせ用メールアドレス
- [ ] `hours.schedule` … 実際の営業時間
- [ ] `access.note` … 所在地のご案内文
- [ ] `data/price.ts` の全料金
- [ ] `public/images/` への写真の配置

---

## 色とフォント

Amulea のブランドカラーは `app/globals.css` の `@theme` で管理しています。
色を調整したい場合は、この値を書き換えるとサイト全体に反映されます。

| 色 | 用途 |
| --- | --- |
| フォレストグリーン `--color-forest-*` | 背景・文字・塗りボタン |
| シャンパンゴールド `--color-champagne-*` | 主要ボタン・見出しの装飾・区切り線 |
| アイボリー `--color-ivory` | ページ全体の背景 |

フォントは和文が Shippori Mincho、欧文が Cormorant Garamond です。

---

## フォルダ構成

```text
app/
├── layout.tsx          共通レイアウト（ヘッダー・フッター・フォント）
├── globals.css         ブランドカラーと共通スタイル
├── page.tsx            ホーム
├── therapist/page.tsx  セラピスト
├── menu/page.tsx       メニュー
├── price/page.tsx      料金表
└── contact/page.tsx    ご予約・お問い合わせ

components/             画面部品（ヘッダー・ボタン・写真枠など）
data/                   ★ 文章・写真・料金の設定ファイル
public/images/          写真の置き場所
```
