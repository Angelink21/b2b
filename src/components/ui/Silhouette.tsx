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
  const { width, height, cx, cy, r, rInner } = layout;
  const footH = Math.max(4, height * 0.05);
  const footW = Math.max(5, width * 0.14);
  const bodyH = height - footH;
  const panelH = Math.max(12, bodyH * 0.18);
  const pad = Math.max(4, width * 0.08);
  const displayW = Math.min(width * 0.32, panelH * 1.35);
  const displayH = Math.max(4, panelH * 0.42);
  const key = Math.max(3, panelH * 0.22);
  const doorY = Math.min(cy, bodyH - r - 2);
  const glint = `M ${cx - rInner * 0.35} ${doorY - rInner * 0.15} A ${rInner * 0.5} ${rInner * 0.5} 0 0 1 ${cx + rInner * 0.2} ${doorY - rInner * 0.45}`;

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
        height={bodyH - 0.75}
        className="silhouette-body"
      />
      <rect
        x={pad}
        y={pad}
        width={width - pad * 2}
        height={panelH}
        className="silhouette-panel"
      />
      <rect
        x={pad + 3}
        y={pad + (panelH - displayH) / 2}
        width={displayW}
        height={displayH}
        className="silhouette-display"
      />
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={width - pad - 3 - key}
          y={pad + 3 + index * (key + 2)}
          width={key}
          height={key}
          className="silhouette-key"
        />
      ))}
      <circle cx={cx} cy={doorY} r={r} className="silhouette-port" />
      <circle cx={cx} cy={doorY} r={rInner} className="silhouette-port-inner" />
      <path d={glint} className="silhouette-glint" />
      <rect
        x={pad}
        y={bodyH}
        width={footW}
        height={footH - 0.75}
        className="silhouette-foot"
      />
      <rect
        x={width - pad - footW}
        y={bodyH}
        width={footW}
        height={footH - 0.75}
        className="silhouette-foot"
      />
    </svg>
  );
}
