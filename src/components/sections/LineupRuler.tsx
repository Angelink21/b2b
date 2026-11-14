"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  countModelsInKgRange,
  INITIAL_RANGE_UNIT,
  isFullRange,
  kgFromUnit,
  RANGE_UNIT_MAX,
  RANGE_UNIT_MIN,
  type KgPair,
} from "@/lib/catalog/lineup";

import { LineupRangeProvider } from "./LineupContext";

export type LineupRulerProps = {
  anchors: readonly number[];
  kgPairs: readonly KgPair[];
  /** Full catalog length (including models without kg). */
  totalCount: number;
  children: ReactNode;
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return debounced;
}

export function LineupRuler({
  anchors,
  kgPairs,
  totalCount,
  children,
}: LineupRulerProps) {
  const t = useTranslations("home");
  const tCat = useTranslations("catalog");
  const id = useId();

  const [loUnit, setLoUnit] = useState<number>(INITIAL_RANGE_UNIT.lo);
  const [hiUnit, setHiUnit] = useState<number>(INITIAL_RANGE_UNIT.hi);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    stageRef.current?.setAttribute("data-lineup-ready", "true");
  }, []);

  const lo = Math.min(loUnit, hiUnit);
  const hi = Math.max(loUnit, hiUnit);
  const fullRange = isFullRange(lo, hi);
  const loKg = kgFromUnit(lo, anchors);
  const hiKg = kgFromUnit(hi, anchors);
  const loKgRound = Math.round(loKg);
  const hiKgRound = Math.round(hiKg);

  const count = useMemo(
    () =>
      countModelsInKgRange(kgPairs, loKg, hiKg, {
        fullRange,
        totalLength: totalCount,
      }),
    [kgPairs, loKg, hiKg, fullRange, totalCount],
  );

  const liveCount = useDebounced(count, 150);
  const liveLo = useDebounced(loKgRound, 150);
  const liveHi = useDebounced(hiKgRound, 150);
  const liveFull = useDebounced(fullRange, 150);

  const valueText = t("ariaValueText", {
    from: loKgRound,
    to: hiKgRound,
  });

  const leftPct = (lo / RANGE_UNIT_MAX) * 100;
  const widthPct = ((hi - lo) / RANGE_UNIT_MAX) * 100;

  const catalogHref = fullRange
    ? "/catalog"
    : `/catalog?kg=${loKgRound}-${hiKgRound}`;
  const quoteHref = fullRange ? "/quote" : `/quote?kg=${hiKgRound}`;

  const rangeState = {
    loUnit: lo,
    hiUnit: hi,
    loKg,
    hiKg,
    fullRange,
  };

  return (
    <LineupRangeProvider value={rangeState}>
      <div ref={stageRef} className="lineup-stage" data-lineup-ready="false">
        <div className="lineup-stage-in">
          <div
            className="lineup-line"
            role="img"
            aria-label={t("lineupLabel")}
          >
            {children}
          </div>
          <div className="lineup-kgs" aria-hidden="true">
            {anchors.map((kg) => {
              const on =
                fullRange ||
                (kg >= loKg - 0.01 && kg <= hiKg + 0.01);
              return (
                <span
                  key={kg}
                  className={on && !fullRange ? "is-on" : undefined}
                >
                  {kg}
                </span>
              );
            })}
          </div>
          <div className="lineup-ruler">
            <div
              className="lineup-band"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            />
            <input
              id={`${id}-min`}
              type="range"
              className="lineup-range"
              min={RANGE_UNIT_MIN}
              max={RANGE_UNIT_MAX}
              step={1}
              value={lo}
              aria-label={t("ariaMin")}
              aria-valuetext={valueText}
              onChange={(event) => {
                const next = Number(event.target.value);
                setLoUnit(Math.min(next, hi));
              }}
            />
            <input
              id={`${id}-max`}
              type="range"
              className="lineup-range"
              min={RANGE_UNIT_MIN}
              max={RANGE_UNIT_MAX}
              step={1}
              value={hi}
              aria-label={t("ariaMax")}
              aria-valuetext={valueText}
              onChange={(event) => {
                const next = Number(event.target.value);
                setHiUnit(Math.max(next, lo));
              }}
            />
          </div>
        </div>
      </div>

      <Container className="lineup-read">
        <output className="lineup-output" aria-live="polite">
          {liveFull ? null : (
            <>
              {liveLo}–{liveHi} {tCat("kg")}{" "}
            </>
          )}
          <small>{tCat("models", { count: liveCount })}</small>
        </output>
        <Button href={catalogHref} variant="secondary">
          {t("showInCatalog")}
        </Button>
        <Button href={quoteHref} variant="primary">
          {t("quoteCta", { count })}
        </Button>
      </Container>
    </LineupRangeProvider>
  );
}
