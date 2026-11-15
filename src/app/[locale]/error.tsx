"use client";

import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/Container";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ reset }: ErrorProps) {
  const t = useTranslations("errors");

  return (
    <Container className="py-24">
      <h1>{t("errorTitle")}</h1>
      <p className="mt-6 text-steel">{t("errorBody")}</p>
      <p className="mt-6">
        <button type="button" className="btn btn-red" onClick={reset}>
          {t("retry")}
        </button>
      </p>
    </Container>
  );
}
