"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

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
  const { isSelected, toggle, isFull } = useCompareSelection();
  const pressed = isSelected(slug);
  const disabled = !pressed && isFull;

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={className}
      aria-pressed={pressed}
      disabled={disabled}
      title={disabled ? t("full") : undefined}
      onClick={() => {
        void toggle(slug);
      }}
    >
      {pressed ? t("inCompare") : t("add")}
    </Button>
  );
}
