/**
 * ブラウザから API を呼び出すための共通処理
 * ------------------------------------------------------------------
 * ・必ず同一オリジンへのリクエストにします（credentials: same-origin）
 * ・エラーは例外にせず、扱いやすい形で返します
 * ・サーバーから返ってきた日本語のメッセージをそのまま画面に出せます
 */

export type ApiError = { code: string; message: string };

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

const NETWORK_ERROR: ApiError = {
  code: "network",
  message:
    "通信に失敗しました。電波の良い場所で、もう一度お試しください。",
};

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      /* Cookie（セッション）を送るために必要です */
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  const body = payload as
    | { ok: true; data: T }
    | { ok: false; error: ApiError }
    | undefined;

  if (body && body.ok === true) return { ok: true, data: body.data };
  if (body && body.ok === false && body.error) {
    return { ok: false, error: body.error };
  }

  return {
    ok: false,
    error: { code: "unknown", message: "処理中に問題が発生しました。" },
  };
}

export function apiGet<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body ?? {}),
  });
}

export function apiPut<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<ApiResult<T>> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<ApiResult<T>> {
  return request<T>(path, { method: "DELETE" });
}

/** クエリ文字列を組み立てます（空の値は付けません） */
export function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
