"use client";

import { useState, type FormEvent } from "react";
import { formConfig, formFields, type FormField } from "@/data/contact";

/**
 * お問い合わせフォーム
 * ------------------------------------------------------------------
 * 入力項目は data/contact.ts の formFields から組み立てています。
 * 項目の追加・並べ替え・表示切り替えは、同ファイルの編集だけで完結します。
 *
 * 送信先（data/contact.ts の formConfig.endpoint）が未設定のあいだは、
 * 入力内容をメール本文に整形してメールソフトを起動します。
 */

type Status = "idle" | "sending" | "success" | "error";

const activeFields = formFields.filter((f) => f.enabled);

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    /* 送信先が未設定の場合は、メールソフトを起動します */
    if (!formConfig.endpoint) {
      const body = activeFields
        .map((f) => `${f.label}：\n${String(data.get(f.name) ?? "")}\n`)
        .join("\n");
      window.location.href = `mailto:${formConfig.mailTo}?subject=${encodeURIComponent(
        formConfig.mailSubject,
      )}&body=${encodeURIComponent(body)}`;
      setStatus("success");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    try {
      const response = await fetch(formConfig.endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });

      if (!response.ok) throw new Error(`送信に失敗しました（${response.status}）`);

      form.reset();
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "送信に失敗しました。時間をおいて再度お試しください。",
      );
    }
  }

  /* 送信完了の表示 */
  if (status === "success") {
    return (
      <div
        role="status"
        className="border border-champagne-400/40 bg-champagne-50/60 px-7 py-12 text-center sm:px-10"
      >
        <div className="gold-rule mx-auto w-16" aria-hidden="true" />
        <p className="mt-8 text-[1.05rem] tracking-[0.14em] text-forest-800">
          送信いたしました
        </p>
        <p className="mx-auto mt-5 max-w-md text-[0.85rem] leading-[2.1] text-forest-700/80">
          {formConfig.successMessage}
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-9 rounded-full border border-champagne-500/60 px-7 py-3 text-[0.83rem] tracking-[0.16em] text-forest-700 transition-colors duration-300 hover:bg-champagne-500/10"
        >
          続けてお問い合わせする
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate={false} className="flex flex-col gap-7">
      <div className="grid gap-7 sm:grid-cols-2">
        {activeFields.map((field) => (
          <Field key={field.name} field={field} />
        ))}
      </div>

      {status === "error" && (
        <p role="alert" className="text-[0.83rem] leading-[1.9] text-red-700">
          {errorMessage}
        </p>
      )}

      <p className="text-[0.78rem] leading-[1.9] text-forest-700/60">
        ご入力いただいた個人情報は、ご返信およびご予約の確認以外の目的では使用いたしません。
      </p>

      <div className="pt-2">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex w-full items-center justify-center rounded-full bg-champagne-500 px-10 py-4 text-[0.9rem] tracking-[0.18em] text-forest-900 shadow-[0_6px_20px_-8px_rgba(168,130,63,0.7)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-champagne-400 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
        >
          {status === "sending" ? "送信中..." : "送信する"}
        </button>
      </div>
    </form>
  );
}

/** 入力項目ひとつ分 */
function Field({ field }: { field: FormField }) {
  const id = `field-${field.name}`;
  const hintId = field.hint ? `${id}-hint` : undefined;

  const baseInput =
    "w-full border-b border-champagne-400/40 bg-transparent px-1 py-3 text-[0.92rem] text-forest-800 transition-colors duration-300 placeholder:text-forest-700/35 focus:border-champagne-600 focus:outline-none";

  return (
    <div className={field.fullWidth || field.type === "textarea" ? "sm:col-span-2" : ""}>
      <label
        htmlFor={id}
        className="flex items-center gap-2.5 text-[0.82rem] tracking-[0.14em] text-forest-700"
      >
        {field.label}
        {field.required ? (
          <span className="rounded-full bg-champagne-500/20 px-2 py-0.5 text-[0.6rem] tracking-[0.12em] text-champagne-700">
            必須
          </span>
        ) : (
          <span className="rounded-full border border-forest-300/50 px-2 py-0.5 text-[0.6rem] tracking-[0.12em] text-forest-700/55">
            任意
          </span>
        )}
      </label>

      {field.hint && (
        <p id={hintId} className="mt-1.5 text-[0.74rem] text-forest-700/55">
          {field.hint}
        </p>
      )}

      <div className="mt-2">
        {field.type === "textarea" ? (
          <textarea
            id={id}
            name={field.name}
            required={field.required}
            placeholder={field.placeholder}
            aria-describedby={hintId}
            rows={6}
            className={`${baseInput} resize-y`}
          />
        ) : field.type === "select" ? (
          <select
            id={id}
            name={field.name}
            required={field.required}
            aria-describedby={hintId}
            defaultValue=""
            className={baseInput}
          >
            <option value="" disabled>
              選択してください
            </option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            id={id}
            name={field.name}
            type={field.type}
            required={field.required}
            placeholder={field.placeholder}
            aria-describedby={hintId}
            autoComplete={autoCompleteFor(field)}
            className={baseInput}
          />
        )}
      </div>
    </div>
  );
}

/** ブラウザの自動入力を効かせるための指定 */
function autoCompleteFor(field: FormField): string | undefined {
  switch (field.name) {
    case "name":
      return "name";
    case "email":
      return "email";
    case "tel":
      return "tel";
    default:
      return undefined;
  }
}
