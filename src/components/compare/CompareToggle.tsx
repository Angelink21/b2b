"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics/track";

import { useCompareSelection } from "./useCompareSelection";

type CompareToggleProps = {
  slug: string;
  className?: string;
  size?: "md" | "sm";
};

function CompareToggleFallback({
  className = "",
  size = "sm",
}: Pick<CompareToggleProps, "className" | "size">) {
  const t = useTranslations("compare");
  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      className={className}
      disabled
      aria-hidden="true"
      tabIndex={-1}
    >
      {t("add")}
    </Button>
  );
}

function CompareToggleInner({
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
        if (!pressed) trackEvent("compare_add");
        void toggle(slug);
      }}
    >
      {pressed ? t("inCompare") : t("add")}
    </Button>
  );
}

/** Suspense boundary required: `useCompareSelection` → nuqs → `useSearchParams`. */
export function CompareToggle(props: CompareToggleProps) {
  const fallbackProps: Pick<CompareToggleProps, "className" | "size"> = {};
  if (props.className !== undefined) fallbackProps.className = props.className;
  if (props.size !== undefined) fallbackProps.size = props.size;

  return (
    <Suspense fallback={<CompareToggleFallback {...fallbackProps} />}>
      <CompareToggleInner {...props} />
    </Suspense>
  );
}
