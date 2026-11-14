"use client";

import { useId } from "react";

export type RangeDualProps = {
  min: number;
  max: number;
  valueMin: number;
  valueMax: number;
  step?: number;
  onChange: (next: { min: number; max: number }) => void;
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

export function RangeDual({
  min,
  max,
  valueMin,
  valueMax,
  step = 1,
  onChange,
  unit,
  valueTextFrom,
  valueTextTo,
  labelMin,
  labelMax,
  className = "",
}: RangeDualProps) {
  const id = useId();
  const lo = clamp(Math.min(valueMin, valueMax), min, max);
  const hi = clamp(Math.max(valueMin, valueMax), min, max);
  const span = max - min || 1;
  const leftPct = ((lo - min) / span) * 100;
  const rightPct = ((hi - min) / span) * 100;
  const valueText = `${valueTextFrom} ${lo} ${valueTextTo} ${hi} ${unit}`;

  return (
    <div className={`range-dual ${className}`.trim()}>
      <div
        className="range-dual-track"
        aria-hidden="true"
      >
        <div
          className="range-dual-band"
          style={{ left: `${leftPct}%`, width: `${rightPct - leftPct}%` }}
        />
      </div>
      <input
        id={`${id}-min`}
        type="range"
        className="range-dual-input"
        min={min}
        max={max}
        step={step}
        value={lo}
        aria-label={labelMin}
        aria-valuetext={valueText}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange({ min: Math.min(next, hi), max: hi });
        }}
      />
      <input
        id={`${id}-max`}
        type="range"
        className="range-dual-input"
        min={min}
        max={max}
        step={step}
        value={hi}
        aria-label={labelMax}
        aria-valuetext={valueText}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange({ min: lo, max: Math.max(next, lo) });
        }}
      />
    </div>
  );
}
