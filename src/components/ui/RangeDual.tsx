"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { flushSync } from "react-dom";

export type RangeDualProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  onChange: (next: { min: number; max: number }) => void;
  /** Fired on pointerup / blur after a drag or keyboard change. */
  onCommit?: (next: { min: number; max: number }) => void;
  /** Visible/accessible unit label (from i18n). */
  unit: string;
  /** Prefix for aria-valuetext (from i18n). */
  valueTextFrom: string;
  /** Connector for aria-valuetext (from i18n). */
  valueTextTo: string;
  labelMin: string;
  labelMax: string;
  className?: string;
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function snap(n: number, step: number, lo: number, hi: number): number {
  if (step <= 0) return clamp(n, lo, hi);
  const rounded = Math.round((n - lo) / step) * step + lo;
  const precision = String(step).includes(".")
    ? (String(step).split(".")[1]?.length ?? 0)
    : 0;
  const fixed =
    precision > 0 ? Number(rounded.toFixed(precision)) : Math.round(rounded);
  return clamp(fixed, lo, hi);
}

function thumbLeft(pct: number): string {
  return `calc(12px + (100% - 24px) * ${pct / 100})`;
}

type DragVisual = {
  which: "min" | "max";
  min: number;
  max: number;
  pointerPct: number;
};

export function RangeDual({
  min,
  max,
  valueMin,
  valueMax,
  step = 1,
  onChange,
  onCommit,
  unit,
  valueTextFrom,
  valueTextTo,
  labelMin,
  labelMax,
  className = "",
}: RangeDualProps) {
  const id = useId();
  const zoneRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const dragRef = useRef<DragVisual | null>(null);
  const [drag, setDrag] = useState<DragVisual | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    onCommitRef.current = onCommit;
  }, [onChange, onCommit]);

  const propLo = clamp(Math.min(valueMin, valueMax), min, max);
  const propHi = clamp(Math.max(valueMin, valueMax), min, max);
  const lo = drag?.min ?? propLo;
  const hi = drag?.max ?? propHi;

  const span = max - min || 1;
  const valueLeftPct = ((lo - min) / span) * 100;
  const valueRightPct = ((hi - min) / span) * 100;
  const leftPct = drag?.which === "min" ? drag.pointerPct : valueLeftPct;
  const rightPct = drag?.which === "max" ? drag.pointerPct : valueRightPct;
  const valueText = `${valueTextFrom} ${lo} ${valueTextTo} ${hi} ${unit}`;

  function pointerPctFromClientX(clientX: number): number {
    const zone = zoneRef.current;
    if (!zone) return 0;
    const rect = zone.getBoundingClientRect();
    const pad = 12;
    const trackLeft = rect.left + pad;
    const trackWidth = Math.max(1, rect.width - pad * 2);
    return clamp((clientX - trackLeft) / trackWidth, 0, 1) * 100;
  }

  function valueFromClientX(clientX: number): number {
    const pct = pointerPctFromClientX(clientX) / 100;
    return snap(min + pct * span, step, min, max);
  }

  function applyMove(which: "min" | "max", clientX: number) {
    const current = dragRef.current;
    if (!current || current.which !== which) return;
    const nextVal = valueFromClientX(clientX);
    let nextMin = current.min;
    let nextMax = current.max;
    let pointerPct = pointerPctFromClientX(clientX);
    if (which === "min") {
      nextMin = Math.min(nextVal, current.max);
      pointerPct = Math.min(pointerPct, ((current.max - min) / span) * 100);
    } else {
      nextMax = Math.max(nextVal, current.min);
      pointerPct = Math.max(pointerPct, ((current.min - min) / span) * 100);
    }
    const next: DragVisual = {
      which,
      min: nextMin,
      max: nextMax,
      pointerPct,
    };
    dragRef.current = next;
    flushSync(() => {
      setDrag(next);
    });
    onChangeRef.current({ min: nextMin, max: nextMax });
  }

  function endDrag() {
    const current = dragRef.current;
    if (!current) return;
    dragRef.current = null;
    flushSync(() => {
      setDrag(null);
    });
    onCommitRef.current?.({ min: current.min, max: current.max });
  }

  function onThumbPointerDown(
    which: "min" | "max",
    event: ReactPointerEvent<HTMLSpanElement>,
  ) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const nextVal = valueFromClientX(event.clientX);
    let nextMin = propLo;
    let nextMax = propHi;
    let pointerPct = pointerPctFromClientX(event.clientX);
    if (which === "min") {
      nextMin = Math.min(nextVal, propHi);
      pointerPct = Math.min(pointerPct, ((propHi - min) / span) * 100);
    } else {
      nextMax = Math.max(nextVal, propLo);
      pointerPct = Math.max(pointerPct, ((propLo - min) / span) * 100);
    }
    const next: DragVisual = {
      which,
      min: nextMin,
      max: nextMax,
      pointerPct,
    };
    dragRef.current = next;
    flushSync(() => {
      setDrag(next);
    });
    onChangeRef.current({ min: nextMin, max: nextMax });

    const pointerId = event.pointerId;
    const target = event.currentTarget;

    function onMove(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      applyMove(which, ev.clientX);
    }
    function onUp(ev: PointerEvent) {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (target.hasPointerCapture(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
      endDrag();
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }

  function onThumbKeyDown(
    which: "min" | "max",
    event: KeyboardEvent<HTMLSpanElement>,
  ) {
    const keys = [
      "ArrowLeft",
      "ArrowDown",
      "ArrowRight",
      "ArrowUp",
      "Home",
      "End",
      "PageDown",
      "PageUp",
    ];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const delta =
      event.key === "Home"
        ? min - (which === "min" ? lo : hi)
        : event.key === "End"
          ? max - (which === "min" ? lo : hi)
          : event.key === "PageDown"
            ? -step * 10
            : event.key === "PageUp"
              ? step * 10
              : event.key === "ArrowLeft" || event.key === "ArrowDown"
                ? -step
                : step;
    if (which === "min") {
      const nextMin = snap(lo + delta, step, min, hi);
      const next = { min: nextMin, max: hi };
      onChange(next);
      onCommit?.(next);
    } else {
      const nextMax = snap(hi + delta, step, lo, max);
      const next = { min: lo, max: nextMax };
      onChange(next);
      onCommit?.(next);
    }
  }

  return (
    <div
      ref={zoneRef}
      className={`range-dual ${className}`.trim()}
      data-range-dual=""
    >
      <div className="range-dual-track" aria-hidden="true">
        <div
          className="range-dual-band"
          style={{
            left: `${Math.min(leftPct, rightPct)}%`,
            width: `${Math.abs(rightPct - leftPct)}%`,
          }}
        />
      </div>

      <span
        id={`${id}-min`}
        className="range-dual-thumb is-min"
        style={{ left: thumbLeft(leftPct) }}
        aria-label={labelMin}
        aria-valuemin={min}
        aria-valuemax={hi}
        aria-valuenow={lo}
        aria-valuetext={valueText}
        role="slider"
        tabIndex={0}
        onPointerDown={(event) => onThumbPointerDown("min", event)}
        onKeyDown={(event) => onThumbKeyDown("min", event)}
      />
      <span
        id={`${id}-max`}
        className="range-dual-thumb is-max"
        style={{ left: thumbLeft(rightPct) }}
        aria-label={labelMax}
        aria-valuemin={lo}
        aria-valuemax={max}
        aria-valuenow={hi}
        aria-valuetext={valueText}
        role="slider"
        tabIndex={0}
        onPointerDown={(event) => onThumbPointerDown("max", event)}
        onKeyDown={(event) => onThumbKeyDown("max", event)}
      />
    </div>
  );
}
