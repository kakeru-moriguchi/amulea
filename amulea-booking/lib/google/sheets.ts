/**
 * Google スプレッドシート API の薄いラッパー
 * ==================================================================
 * 「行を読む・追記する・書き換える」だけの最小限の機能を提供します。
 * 実際の予約データの読み書きは lib/store/sheets.ts が行います。
 */

import { env } from "../config/env";
import { googleFetch } from "./auth";

const API = "https://sheets.googleapis.com/v4/spreadsheets";

function sheetUrl(path: string): string {
  return `${API}/${encodeURIComponent(env.google.spreadsheetId)}${path}`;
}

/** 範囲を指定して値を読み取ります（空のセルは "" で埋めて返します） */
export async function readRange(range: string): Promise<string[][]> {
  const data = (await googleFetch(
    sheetUrl(`/values/${encodeURIComponent(range)}?majorDimension=ROWS`),
    { method: "GET", label: "values.get" },
  )) as { values?: string[][] } | null;
  return data?.values ?? [];
}

/** 末尾へ1行以上を追記します */
export async function appendRows(range: string, rows: string[][]): Promise<void> {
  await googleFetch(
    sheetUrl(
      `/values/${encodeURIComponent(range)}:append` +
        `?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    ),
    { method: "POST", body: JSON.stringify({ values: rows }), label: "values.append" },
  );
}

/** 範囲を指定して上書きします */
export async function writeRange(range: string, rows: string[][]): Promise<void> {
  await googleFetch(
    sheetUrl(`/values/${encodeURIComponent(range)}?valueInputOption=RAW`),
    { method: "PUT", body: JSON.stringify({ values: rows }), label: "values.update" },
  );
}

/** シートの一覧（タブ名）を取得します */
export async function listSheetTitles(): Promise<string[]> {
  const data = (await googleFetch(sheetUrl("?fields=sheets.properties.title"), {
    method: "GET",
    label: "spreadsheets.get",
  })) as { sheets?: Array<{ properties?: { title?: string } }> } | null;
  return (data?.sheets ?? [])
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t));
}

/** シート（タブ）が無ければ作成します */
export async function ensureSheet(title: string): Promise<void> {
  const titles = await listSheetTitles();
  if (titles.includes(title)) return;
  await googleFetch(sheetUrl(":batchUpdate"), {
    method: "POST",
    body: JSON.stringify({
      requests: [{ addSheet: { properties: { title } } }],
    }),
    label: "spreadsheets.batchUpdate(addSheet)",
  });
}

/** A1 表記の列名（1 → "A", 27 → "AA"） */
export function columnName(index: number): string {
  let n = index;
  let name = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}
