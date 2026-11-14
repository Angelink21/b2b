import type { ReactNode } from "react";

type GridProps = {
  children: ReactNode;
  className?: string;
};

/** 12-column page grid. Gap comes from `--grid-gap` (24px, 32px from 1024px). */
export function Grid({ children, className = "" }: GridProps) {
  return <div className={`page-grid ${className}`.trim()}>{children}</div>;
}
