"use client";

import { useRouter } from "@/i18n/navigation";

type HistoryBackLinkProps = {
  label: string;
  /** Locale-free fallback path when history cannot go back. */
  fallbackHref?: string;
  className?: string;
};

/**
 * Browser back control: history.back(), else navigate to fallback (default /catalog).
 */
export function HistoryBackLink({
  label,
  fallbackHref = "/catalog",
  className = "btn btn-link btn-sm",
}: HistoryBackLinkProps) {
  const router = useRouter();

  return (
    <p className="page-back-link mt-4">
      <button
        type="button"
        className={className}
        onClick={() => {
          if (typeof window === "undefined") return;
          if (window.history.length > 1) {
            window.history.back();
            return;
          }
          router.push(fallbackHref);
        }}
      >
        {label}
      </button>
    </p>
  );
}
