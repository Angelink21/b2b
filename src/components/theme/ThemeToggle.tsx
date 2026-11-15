"use client";

import { useTranslations } from "next-intl";
import { useEffect, useSyncExternalStore } from "react";
import {
  applyTheme,
  cycleThemePreference,
  getServerThemePreference,
  getThemePreference,
  subscribeTheme,
} from "@/lib/theme/store";
import type { ThemePreference } from "@/lib/theme/storage";

function ThemeIcon({ preference }: { preference: ThemePreference }) {
  if (preference === "dark") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M16 3.5A8.5 8.5 0 1 0 20.5 16 6.5 6.5 0 0 1 16 3.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  if (preference === "system") {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const t = useTranslations("theme");
  const tNav = useTranslations("nav");
  const preference = useSyncExternalStore(
    subscribeTheme,
    getThemePreference,
    getServerThemePreference,
  );

  useEffect(() => {
    applyTheme(preference);

    if (preference !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  const label = t(preference);

  return (
    <button
      type="button"
      className="header-tool"
      onClick={() => {
        cycleThemePreference();
      }}
      aria-label={`${tNav("theme")}: ${label}`}
    >
      <ThemeIcon preference={preference} />
    </button>
  );
}
