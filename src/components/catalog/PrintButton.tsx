"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/Button";

export function PrintButton() {
  const t = useTranslations("model");

  return (
    <Button
      type="button"
      variant="secondary"
      className="no-print"
      onClick={() => {
        window.print();
      }}
    >
      {t("print")}
    </Button>
  );
}
