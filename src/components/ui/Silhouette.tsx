import {
  portholeRadius,
  silhouettePixelSize,
  silhouetteScale,
  type SilhouetteDims,
} from "@/lib/silhouette";

export type SilhouetteProps = {
  widthMm: number;
  heightMm: number;
  /** Fit the larger side into this many CSS pixels (prototype lineup uses ~190). */
  targetMaxPx?: number;
  /** Explicit scale override (e.g. shared lineup scale). */
  scale?: number;
  className?: string;
  title?: string;
};

export function computeSilhouetteLayout(
  dims: SilhouetteDims,
  opts: { targetMaxPx?: number; scale?: number },
): {
  scale: number;
  width: number;
  height: number;
  panelH: number;
  cx: number;
  cy: number;
  r: number;
  rInner: number;
} {
  const scale =
    opts.scale ?? silhouetteScale(dims, opts.targetMaxPx ?? 190);
  const { width, height } = silhouettePixelSize(dims, scale);
  const r = portholeRadius(width, height);
  return {
    scale,
    width,
    height,
    panelH: Math.max(5, height * 0.05),
    cx: width / 2,
    cy: height * 0.57,
    r,
    rInner: r * 0.72,
  };
}

/**
 * Machine body silhouette from mm — panel + porthole (prototype drawM).
 */
export function Silhouette({
  widthMm,
  heightMm,
  targetMaxPx = 190,
  scale: scaleProp,
  className = "",
  title,
}: SilhouetteProps) {
  const layout = computeSilhouetteLayout(
    { w: widthMm, h: heightMm },
    scaleProp !== undefined
      ? { targetMaxPx, scale: scaleProp }
      : { targetMaxPx },
  );
  const { width, height, panelH, cx, cy, r, rInner } = layout;

  return (
    <svg
      className={`silhouette ${className}`.trim()}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ aspectRatio: `${widthMm} / ${heightMm}` }}
    >
      <rect
        x={0.75}
        y={0.75}
        width={width - 1.5}
        height={height - 1.5}
        className="silhouette-body"
      />
      <rect x={6} y={6} width={width - 12} height={panelH} className="silhouette-panel" />
      <circle cx={cx} cy={cy} r={r} className="silhouette-port" />
      <circle cx={cx} cy={cy} r={rInner} className="silhouette-port-inner" />
    </svg>
  );
}
