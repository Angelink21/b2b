"use client";

import { useTranslations } from "next-intl";

import { trackEvent } from "@/lib/analytics/track";

import { useCompareSelection } from "./useCompareSelection";

type CompareToggleProps = {
  slug: string;
  className?: string;
  size?: "md" | "sm";
};

export function CompareToggle({
  slug,
  className = "",
  size = "sm",
}: CompareToggleProps) {
  const t = useTranslations("compare");
  const { isSelected, toggle, isFull, showLimitHint } = useCompareSelection();
  const pressed = isSelected(slug);
  const atLimit = !pressed && isFull;

  return (
    <button
      type="button"
      className={[
        "compare-toggle",
        size === "sm" ? "compare-toggle-sm" : "compare-toggle-md",
        pressed ? "is-pressed" : "",
        atLimit ? "is-limit" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={pressed}
      aria-disabled={atLimit ? true : undefined}
      title={atLimit ? t("limitHint") : undefined}
      onClick={() => {
        if (atLimit) {
          showLimitHint();
          return;
        }
        if (!pressed) trackEvent("compare_add");
        toggle(slug);
      }}
    >
      <span className="compare-toggle-label">{t("add")}</span>
    </button>
  );
}
