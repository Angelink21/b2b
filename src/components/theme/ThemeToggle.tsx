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
      {label}
    </button>
  );
}
