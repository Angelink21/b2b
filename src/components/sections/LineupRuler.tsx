"use client";

import { animate } from "motion/react";
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
  type PointerEvent as ReactPointerEvent,
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
import { Stat } from "@/components/ui/Stat";
import {
  INTRO_BUDGET_MS,
  MAGNET_THRESHOLD_UNITS,
} from "@/config/motion";
import { trackEvent } from "@/lib/analytics/track";
import {
  countModelsInKgRange,
  fractionToUnit,
  INITIAL_RANGE_UNIT,
  isFullRange,
  kgFromUnit,
  RANGE_UNIT_MAX,
  RANGE_UNIT_MIN,
  unitToFraction,
  type KgPair,
} from "@/lib/catalog/lineup";

import { LineupRangeProvider } from "./LineupContext";
import {
  LineupRangeStrip,
  type LineupRangeStripProps,
} from "./LineupRangeStrip";

export type LineupCaptionData = {
  /** Full fixed info-line text while this machine is hovered/focused. */
  hint: string;
};

export type LineupRulerProps = {
  anchors: readonly number[];
  kgPairs: readonly KgPair[];
  /** Full catalog length (including models without kg). */
  totalCount: number;
  /** Info-line copy, parallel to anchors / children. */
  captions: readonly LineupCaptionData[];
  rangeStripCandidates?: LineupRangeStripProps["candidates"];
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

/** Inclusive break indices for contiguous preset segments along lineup anchors. */
function lineupPresetBreaks(anchorCount: number, segments = 4): number[] {
  if (anchorCount < 2) return [0];
  const raw: number[] = [];
  for (let s = 0; s <= segments; s += 1) {
    raw.push(Math.round((s * (anchorCount - 1)) / segments));
  }
  return raw.filter((value, index, list) => index === 0 || value !== list[index - 1]);
}

function unitAtAnchorIndex(index: number, anchorCount: number): number {
  if (anchorCount < 2) return RANGE_UNIT_MIN;
  return Math.round((index / (anchorCount - 1)) * RANGE_UNIT_MAX);
}

export function LineupRuler({
  anchors,
  kgPairs,
  totalCount,
  captions,
  rangeStripCandidates = [],
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
  const [hoveredKg, setHoveredKg] = useState<number | null>(null);
  const [centers, setCenters] = useState<number[]>([]);
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const machinesRef = useRef<HTMLDivElement>(null);
  const rulerRef = useRef<HTMLDivElement>(null);
  const loRef = useRef(loUnit);
  const hiRef = useRef(hiUnit);
  const introStarted = useRef(false);
  const loAnimRef = useRef<{ stop: () => void } | null>(null);
  const hiAnimRef = useRef<{ stop: () => void } | null>(null);
  const userMovedRef = useRef(false);

  useEffect(() => {
    loRef.current = loUnit;
    hiRef.current = hiUnit;
  }, [loUnit, hiUnit]);

  useEffect(() => {
    if (!userMovedRef.current) return;
    const timer = window.setTimeout(() => {
      trackEvent("lineup_use");
    }, 400);
    return () => window.clearTimeout(timer);
  }, [loUnit, hiUnit]);

  const finishIntro = useCallback(() => {
    loAnimRef.current?.stop();
    hiAnimRef.current?.stop();
    loAnimRef.current = null;
    hiAnimRef.current = null;
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

    let doneTimer = 0;

    // Defer setState out of the effect body (lint: set-state-in-effect).
    const frame = window.requestAnimationFrame(() => {
      setLineupReady(true);
      if (userMovedRef.current) return;
      setLoUnit(0);
      setHiUnit(0);
      setPlayMachineIntro(true);
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

  const placed = useMemo(() => {
    if (centers.length === anchors.length && centers.length > 0) return centers;
    if (anchors.length < 2) return [0.5];
    return anchors.map((_, index) => index / (anchors.length - 1));
  }, [anchors, centers]);

  const at = useCallback((unit: number) => unitToFraction(unit, placed) * 100, [placed]);
  const leftPct = at(Math.min(lo, hi));
  const widthPct = Math.max(0, at(Math.max(lo, hi)) - leftPct);

  // motion: thumbs visually magnetize to kg anchors (aria/values unchanged)
  const visualLo = useMemo(() => {
    if (!expressive) return lo;
    return magnetUnit(lo, anchors.length) ?? lo;
  }, [expressive, lo, anchors.length]);
  const visualHi = useMemo(() => {
    if (!expressive) return hi;
    return magnetUnit(hi, anchors.length) ?? hi;
  }, [expressive, hi, anchors.length]);
  const visualLeftPct = at(Math.min(visualLo, visualHi));
  const visualWidthPct = Math.max(0, at(Math.max(visualLo, visualHi)) - visualLeftPct);
  const showMagnet = expressive && (visualLo !== lo || visualHi !== hi);

  useLayoutEffect(() => {
    const root = machinesRef.current;
    if (!root) return;
    const measure = () => {
      const cols = [...root.querySelectorAll<HTMLElement>(".lineup-col")];
      const box = root.getBoundingClientRect();
      if (box.width <= 0 || cols.length === 0) return;
      const next = cols.map((col) => {
        const colBox = col.getBoundingClientRect();
        return (colBox.left + colBox.width / 2 - box.left) / box.width;
      });
      setCenters((prev) => {
        if (
          prev.length === next.length &&
          prev.every((value, index) => Math.abs(value - next[index]!) < 0.001)
        ) {
          return prev;
        }
        return next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => observer.disconnect();
  }, [anchors.length]);

  const unitFromClientX = useCallback(
    (clientX: number) => {
      const box = rulerRef.current?.getBoundingClientRect();
      if (!box || box.width <= 0) return RANGE_UNIT_MIN;
      return fractionToUnit((clientX - box.left) / box.width, placed);
    },
    [placed],
  );

  const moveHandle = useCallback(
    (which: "lo" | "hi", clientX: number) => {
      userMovedRef.current = true;
      finishIntro();
      setActivePreset(null);
      const next = unitFromClientX(clientX);
      if (which === "lo") setLoUnit(Math.min(next, hiRef.current));
      else setHiUnit(Math.max(next, loRef.current));
    },
    [finishIntro, unitFromClientX],
  );

  const presetBreaks = useMemo(
    () => lineupPresetBreaks(anchors.length, 4),
    [anchors.length],
  );

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
  const hoveredIndex =
    hoveredKg === null ? -1 : anchors.findIndex((kg) => kg === hoveredKg);
  const hoveredHint =
    hoveredIndex >= 0 ? captions[hoveredIndex]?.hint : undefined;

  const dragHandle =
    (which: "lo" | "hi") => (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      moveHandle(which, event.clientX);
      const move = (pointer: PointerEvent) => moveHandle(which, pointer.clientX);
      const end = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", end);
        handle.removeEventListener("pointercancel", end);
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", end);
      handle.addEventListener("pointercancel", end);
    };

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
          <div className="lineup-grid">
            <div className="lineup-machines" ref={machinesRef}>
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
            </div>
            <div
              className="lineup-ruler"
              ref={rulerRef}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).classList.contains("lineup-thumb")) {
                  return;
                }
                const next = unitFromClientX(event.clientX);
                const which =
                  Math.abs(next - loRef.current) <= Math.abs(next - hiRef.current)
                    ? "lo"
                    : "hi";
                moveHandle(which, event.clientX);
              }}
            >
              {anchors.map((kg, index) => (
                <span
                  key={`tick-${kg}`}
                  className="lineup-tick"
                  style={{ left: `${(placed[index] ?? 0) * 100}%` }}
                  aria-hidden="true"
                />
              ))}
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
              <div
                className="lineup-thumb"
                style={{ left: `${at(lo)}%` }}
                aria-hidden="true"
                onPointerDown={dragHandle("lo")}
              />
              <div
                className="lineup-thumb"
                style={{ left: `${at(hi)}%` }}
                aria-hidden="true"
                onPointerDown={dragHandle("hi")}
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
                  userMovedRef.current = true;
                  finishIntro();
                  setActivePreset(null);
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
                  setActivePreset(null);
                  const next = Number(event.target.value);
                  setHiUnit(Math.max(next, lo));
                }}
              />
            </div>
          </div>
          <p
            className="lineup-scale-note"
            data-testid="lineup-scale-note"
            aria-live="polite"
          >
            {hoveredHint ?? t("scaleNote")}
          </p>
        </Container>
      </div>

      <Container className="lineup-read">
        <Stat
          className="lineup-output"
          live
          value={
            <>
              {liveFull ? null : (
                <span className="lineup-range-value">
                  {liveLo}–{liveHi} {tCat("kg")}{" "}
                </span>
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
            </>
          }
        />
        {rangeStripCandidates.length > 0 ? (
          <LineupRangeStrip candidates={rangeStripCandidates} />
        ) : null}
        {presetBreaks.length >= 3 ? (
          <ul className="lineup-presets" aria-label={t("presetsLabel")}>
            {presetBreaks.slice(0, -1).map((startIndex, segment) => {
              const endIndex = presetBreaks[segment + 1]!;
              const isFirst = segment === 0;
              const isLast = segment === presetBreaks.length - 2;
              const loTarget = isFirst
                ? RANGE_UNIT_MIN
                : unitAtAnchorIndex(startIndex, anchors.length);
              const hiTarget = isLast
                ? RANGE_UNIT_MAX
                : unitAtAnchorIndex(endIndex, anchors.length);
              const label = isFirst
                ? t("presetTo", { kg: anchors[endIndex]! })
                : isLast
                  ? t("presetFrom", { kg: anchors[startIndex]! })
                  : t("presetBetween", {
                      from: anchors[startIndex]!,
                      to: anchors[endIndex]!,
                    });
              return (
                <li key={`preset-${startIndex}-${endIndex}`}>
                  <button
                    type="button"
                    className="lineup-preset"
                    aria-pressed={activePreset === segment}
                    onClick={() => {
                      userMovedRef.current = true;
                      finishIntro();
                      setActivePreset(segment);
                      setLoUnit(loTarget);
                      setHiUnit(hiTarget);
                    }}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
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
