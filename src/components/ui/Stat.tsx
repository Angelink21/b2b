import type { ReactNode } from "react";

type StatProps = {
  value: ReactNode;
  label?: ReactNode;
  className?: string;
  /** Live region for changing counts (e.g. lineup model count). */
  live?: boolean;
};

export function Stat({ value, label, className = "", live = false }: StatProps) {
  return (
    <div className={`stat ${className}`.trim()}>
      <output
        className="stat-value"
        {...(live ? { "aria-live": "polite" as const } : {})}
      >
        {value}
      </output>
      {label ? <div className="stat-label">{label}</div> : null}
    </div>
  );
}
