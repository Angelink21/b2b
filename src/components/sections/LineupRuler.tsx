"use client";

import { animate, motion } from "motion/react";
import { useTranslations } from "next-intl";
import {
  Children,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { NumberRoll } from "@/components/motion/NumberRoll";
import {
  hasPlayedLineupIntro,
  markLineupIntroPlayed,
} from "@/components/motion/sessionIntro";
import { useMotionEnabled } from "@/components/motion/useMotionEnabled";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import {
  INTRO_BUDGET_MS,
  MAGNET_THRESHOLD_UNITS,
  MOTION_EASE,
  MOTION_MS,
} from "@/config/motion";
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

/** Nearest anchor unit (0…1000) if within magnetic threshold; else null. */
function magnetUnit(unit: number, anchorCount: number): number | null {
  if (anchorCount < 2) return null;
  let best = unit;
  let bestDist = Infinity;
  for (let i = 0; i < anchorCount; i += 1) {
    const u = Math.round((i / (anchorCount - 1)) * RANGE_UNIT_MAX);
    const d = Math.abs(u - unit);
    if (d < bestDist) {
      bestDist = d;
      best = u;
    }
  }
  return bestDist <= MAGNET_THRESHOLD_UNITS ? best : null;
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
  const { enabled, expressive } = useMotionEnabled();

  const [loUnit, setLoUnit] = useState<number>(INITIAL_RANGE_UNIT.lo);
  const [hiUnit, setHiUnit] = useState<number>(INITIAL_RANGE_UNIT.hi);
  const [lineupReady, setLineupReady] = useState(false);
  const [introReady, setIntroReady] = useState(true);
  const [playMachineIntro, setPlayMachineIntro] = useState(false);
  const [scaleDrawn, setScaleDrawn] = useState(true);
  const [hoveredKg, setHoveredKg] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const introStarted = useRef(false);
  const loAnimRef = useRef<{ stop: () => void } | null>(null);
  const hiAnimRef = useRef<{ stop: () => void } | null>(null);
  const userMovedRef = useRef(false);

  const finishIntro = useCallback(() => {
    loAnimRef.current?.stop();
    hiAnimRef.current?.stop();
    loAnimRef.current = null;
    hiAnimRef.current = null;
    setScaleDrawn(true);
    setIntroReady(true);
  }, []);

  useLayoutEffect(() => {
    if (introStarted.current) return;
    introStarted.current = true;

    if (!enabled || hasPlayedLineupIntro()) {
      const frame = window.requestAnimationFrame(() => {
        setLineupReady(true);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    markLineupIntroPlayed();

    let scaleTimer = 0;
    let doneTimer = 0;

    // Defer setState out of the effect body (lint: set-state-in-effect).
    const frame = window.requestAnimationFrame(() => {
      setLineupReady(true);
      if (userMovedRef.current) return;
      setLoUnit(0);
      setHiUnit(0);
      setPlayMachineIntro(true);
      setScaleDrawn(false);
      setIntroReady(false);

      // motion: range handles spring to the starting load window (no bounce)
      loAnimRef.current = animate(0, INITIAL_RANGE_UNIT.lo, {
        type: "spring",
        stiffness: 140,
        damping: 22,
        mass: 0.8,
        bounce: 0,
        onUpdate: (v) => {
          if (!userMovedRef.current) setLoUnit(Math.round(v));
        },
      });
      hiAnimRef.current = animate(0, INITIAL_RANGE_UNIT.hi, {
        type: "spring",
        stiffness: 140,
        damping: 22,
        mass: 0.8,
        bounce: 0,
        onUpdate: (v) => {
          if (!userMovedRef.current) setHiUnit(Math.round(v));
        },
      });

      // motion: floor scale draws left→right after machines begin settling
      scaleTimer = window.setTimeout(() => {
        setScaleDrawn(true);
      }, MACHINE_INTRO_MS);

      doneTimer = window.setTimeout(() => {
        if (!userMovedRef.current) {
          setLoUnit(INITIAL_RANGE_UNIT.lo);
          setHiUnit(INITIAL_RANGE_UNIT.hi);
        }
        setIntroReady(true);
      }, INTRO_BUDGET_MS);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      loAnimRef.current?.stop();
      hiAnimRef.current?.stop();
      window.clearTimeout(scaleTimer);
      window.clearTimeout(doneTimer);
    };
  }, [enabled]);

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

  // motion: thumbs visually magnetize to kg anchors (aria/values unchanged)
  const visualLo = useMemo(() => {
    if (!expressive) return lo;
    return magnetUnit(lo, anchors.length) ?? lo;
  }, [expressive, lo, anchors.length]);
  const visualHi = useMemo(() => {
    if (!expressive) return hi;
    return magnetUnit(hi, anchors.length) ?? hi;
  }, [expressive, hi, anchors.length]);
  const visualLeftPct = (visualLo / RANGE_UNIT_MAX) * 100;
  const visualWidthPct =
    ((Math.max(visualLo, visualHi) - Math.min(visualLo, visualHi)) / RANGE_UNIT_MAX) *
    100;
  const showMagnet = expressive && (visualLo !== lo || visualHi !== hi);

  const catalogHref = fullRange ? "/catalog" : `/catalog?kg=${loKgRound}-${hiKgRound}`;
  const quoteHref = fullRange ? "/quote" : `/quote?kg=${hiKgRound}`;

  const setHovered = useCallback((kg: number | null) => {
    setHoveredKg(kg);
  }, []);

  const rangeState = {
    loUnit: lo,
    hiUnit: hi,
    loKg,
    hiKg,
    fullRange,
    liftActive: expressive && !fullRange && introReady,
    introReady,
    playMachineIntro,
    hoveredKg,
    setHoveredKg: setHovered,
  };

  const slots = Children.toArray(children);
  const columns = Math.max(anchors.length, 1);
  const gridStyle = {
    "--lineup-n": columns,
  } as CSSProperties;

  return (
    <LineupRangeProvider value={rangeState}>
      <div
        ref={stageRef}
        className="lineup-stage"
        data-lineup-ready={lineupReady ? "true" : "false"}
        data-lineup-intro={playMachineIntro && !introReady ? "1" : "0"}
      >
        <Container>
          <p className="sr-only">{t("lineupLabel")}</p>
          <div className="lineup-grid" style={gridStyle}>
            {/* motion: floor scale draws left→right on first load */}
            <motion.div
              className="lineup-floor"
              aria-hidden="true"
              initial={false}
              animate={{
                scaleX: scaleDrawn || !enabled ? 1 : 0,
              }}
              transition={{
                duration: enabled ? MOTION_MS.scale / 1000 : 0,
                ease: MOTION_EASE.emphasized,
              }}
              style={{ transformOrigin: "left center" }}
            />
            {anchors.map((kg, index) => {
              const inWindow = fullRange || (kg >= loKg - 0.01 && kg <= hiKg + 0.01);
              const hovered = hoveredKg === kg;
              return (
                <div className="lineup-col" key={kg}>
                  <div className="lineup-well">{slots[index]}</div>
                  <span
                    className={[
                      "lineup-kg",
                      inWindow && !fullRange ? "is-on" : "",
                      hovered ? "is-hover" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {kg}
                  </span>
                </div>
              );
            })}
            <div className="lineup-ruler">
              {anchors.map((kg, index) => {
                const tick =
                  anchors.length < 2 ? 0 : (index / (anchors.length - 1)) * 100;
                return (
                  <span
                    key={`tick-${kg}`}
                    className="lineup-tick"
                    style={{ left: `${tick}%` }}
                    aria-hidden="true"
                  />
                );
              })}
              <div
                className="lineup-band"
                style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              />
              {showMagnet ? (
                <div
                  className="lineup-band lineup-band-magnet"
                  aria-hidden="true"
                  style={{
                    left: `${visualLeftPct}%`,
                    width: `${visualWidthPct}%`,
                  }}
                />
              ) : null}
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
                  userMovedRef.current = true;
                  finishIntro();
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
                  userMovedRef.current = true;
                  finishIntro();
                  const next = Number(event.target.value);
                  setHiUnit(Math.max(next, lo));
                }}
              />
            </div>
          </div>
        </Container>
      </div>

      <Container className="lineup-read">
        <output className="lineup-output" aria-live="polite">
          {liveFull ? null : (
            <>
              {liveLo}–{liveHi} {tCat("kg")}{" "}
            </>
          )}
          <small className="lineup-count">
            {expressive ? (
              <>
                <NumberRoll value={liveCount} />{" "}
                {tCat("modelsLabel", { count: liveCount })}
              </>
            ) : (
              tCat("models", { count: liveCount })
            )}
          </small>
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

/** Time before scale draw starts (last machine delay + most of settle). */
const MACHINE_INTRO_MS = 7 * 60 + MOTION_MS.machine * 0.35;
