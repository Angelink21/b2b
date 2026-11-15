"use client";

import { useTranslations } from "next-intl";

import { useCompareSelection } from "./useCompareSelection";

type CompareCheckboxProps = {
  slug: string;
  name: string;
  className?: string;
};

export function CompareCheckbox({
  slug,
  name,
  className = "",
}: CompareCheckboxProps) {
  const t = useTranslations("compare");
  const { isSelected, toggle, isFull } = useCompareSelection();
  const pressed = isSelected(slug);
  const disabled = !pressed && isFull;

  return (
    <label
      className={`compare-check ${className}`.trim()}
      title={disabled ? t("full") : undefined}
    >
      <input
        type="checkbox"
        className="compare-check-input"
        checked={pressed}
        disabled={disabled}
        aria-label={t("addNamed", { name })}
        onChange={() => {
          void toggle(slug);
        }}
      />
      <span className="sr-only">{t("add")}</span>
    </label>
  );
}
