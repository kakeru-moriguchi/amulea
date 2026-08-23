/** サイト内で使用するアイコン */

export function LineIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2.5c-5.52 0-10 3.63-10 8.11 0 4.01 3.55 7.37 8.35 8.01.32.07.77.21.88.49.1.25.07.64.03.89l-.14.85c-.04.25-.2.98.86.53s5.7-3.36 7.78-5.75c1.43-1.57 2.24-3.42 2.24-5.02C22 6.13 17.52 2.5 12 2.5ZM8.08 13.4a.2.2 0 0 1-.2.2H5.07a.2.2 0 0 1-.2-.2V9.06c0-.11.09-.2.2-.2h.7c.11 0 .2.09.2.2v3.43h1.91c.11 0 .2.09.2.2v.71Zm1.72 0a.2.2 0 0 1-.2.2h-.7a.2.2 0 0 1-.2-.2V9.06c0-.11.09-.2.2-.2h.7c.11 0 .2.09.2.2v4.34Zm4.8 0a.2.2 0 0 1-.2.2h-.7a.2.2 0 0 1-.16-.08l-1.99-2.69v2.57a.2.2 0 0 1-.2.2h-.7a.2.2 0 0 1-.2-.2V9.06c0-.11.09-.2.2-.2h.71l.05.02.05.05 1.98 2.68V9.06c0-.11.09-.2.2-.2h.7c.11 0 .2.09.2.2v4.34Zm3.85-3.63a.2.2 0 0 1-.2.2h-1.9v.73h1.9c.11 0 .2.09.2.2v.71a.2.2 0 0 1-.2.2h-1.9v.73h1.9c.11 0 .2.09.2.2v.71a.2.2 0 0 1-.2.2h-2.81a.2.2 0 0 1-.2-.2V9.06c0-.11.09-.2.2-.2h2.81c.11 0 .2.09.2.2v.71Z" />
    </svg>
  );
}

export function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function ClockIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
