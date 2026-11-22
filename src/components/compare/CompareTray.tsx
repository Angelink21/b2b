"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { Button } from "@/components/ui/Button";
import { Link } from "@/i18n/navigation";
import { serializeCompareSlugs } from "@/lib/catalog/compare";

import { useCompareContext } from "./CompareProvider";

export function CompareTray() {
  const t = useTranslations("compare");
  const {
    selected,
    ready,
    remove,
    clear,
    itemsBySlug,
    toast,
    limitHint,
    dismissToast,
    dismissLimitHint,
  } = useCompareContext();

  const resolved = selected.map((slug) => {
    const known = itemsBySlug[slug];
    if (known) return known;
    return {
      slug,
      name: slug,
      category: "washers" as const,
      thumbSrc: null,
      thumbW: 44,
      thumbH: 44,
    };
  });

  const visible = ready && selected.length > 0;
  const count = selected.length;
  const canOpen = count >= 2;
  const compareHref = `/compare?m=${encodeURIComponent(
    serializeCompareSlugs(resolved.map((item) => item.slug)),
  )}`;

  useEffect(() => {
    document.body.classList.toggle("has-compare-tray", visible);
    return () => {
      document.body.classList.remove("has-compare-tray");
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="compare-tray" role="region" aria-label={t("trayLabel")}>
      {toast ? (
        <p className="compare-tray-toast" role="status">
          {t("added", { name: toast.name })}
          {" · "}
          {canOpen ? (
            <Link href={compareHref} onClick={dismissToast}>
              {t("viewCompare")}
            </Link>
          ) : (
            <span>{t("viewCompare")}</span>
          )}
        </p>
      ) : null}
      {limitHint ? (
        <p className="compare-tray-limit" role="status">
          {t("limitHint")}
          <button
            type="button"
            className="compare-tray-limit-dismiss"
            onClick={dismissLimitHint}
            aria-label={t("clear")}
          >
            ×
          </button>
        </p>
      ) : null}
      <div className="compare-tray-inner">
        <ul className="compare-tray-list">
          {resolved.map((item) => (
            <li key={item.slug} className="compare-tray-item">
              <span className="compare-tray-thumb" aria-hidden="true">
                {item.thumbSrc ? (
                  <Image
                    src={item.thumbSrc}
                    alt=""
                    width={40}
                    height={40}
                    sizes="40px"
                    unoptimized
                    className="compare-tray-thumb-img"
                  />
                ) : (
                  <span className="compare-tray-thumb-fallback" />
                )}
              </span>
              <span className="compare-tray-name">{item.name}</span>
              <button
                type="button"
                className="compare-tray-remove"
                aria-label={t("remove", { name: item.name })}
                onClick={() => {
                  remove(item.slug);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <div className="compare-tray-actions">
          {canOpen ? (
            <Button href={compareHref} variant="secondary" size="sm">
              {t("openCompareWithCount", { count })}
            </Button>
          ) : (
            <button
              type="button"
              className="btn btn-sm compare-tray-open-disabled"
              aria-disabled="true"
              title={t("needOneMore")}
            >
              {t("openCompareWithCount", { count })}
            </button>
          )}
          <Button type="button" variant="link" size="sm" onClick={clear}>
            {t("clear")}
          </Button>
        </div>
      </div>
    </div>
  );
}
