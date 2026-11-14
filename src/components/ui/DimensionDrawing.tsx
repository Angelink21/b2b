import { computeSilhouetteLayout } from "./Silhouette";

type DimensionDrawingProps = {
  widthMm: number;
  heightMm: number;
  /** Fit larger side (prototype model card uses 300). */
  targetMaxPx?: number;
  title: string;
  className?: string;
};

/**
 * Silhouette plus width/height dimension lines from catalog mm.
 */
export function DimensionDrawing({
  widthMm,
  heightMm,
  targetMaxPx = 300,
  title,
  className = "",
}: DimensionDrawingProps) {
  const layout = computeSilhouetteLayout(
    { w: widthMm, h: heightMm },
    { targetMaxPx },
  );
  const { width, height, panelH, cx, cy, r, rInner } = layout;
  const padL = 0;
  const padT = 0;
  const padR = 40;
  const padB = 48;
  const vbW = width + padR + 30;
  const vbH = height + padB + 20;

  return (
    <div className={`draw ${className}`.trim()}>
      <svg
        viewBox={`-10 -10 ${vbW} ${vbH}`}
        width="100%"
        style={{ maxWidth: vbW, maxHeight: 380, aspectRatio: `${vbW} / ${vbH}` }}
        role="img"
        aria-label={title}
      >
        <g transform={`translate(${padL},${padT})`}>
          <rect
            x={0.75}
            y={0.75}
            width={width - 1.5}
            height={height - 1.5}
            className="silhouette-body"
          />
          <rect
            x={6}
            y={6}
            width={width - 12}
            height={panelH}
            className="silhouette-panel"
          />
          <circle cx={cx} cy={cy} r={r} className="silhouette-port" />
          <circle cx={cx} cy={cy} r={rInner} className="silhouette-port-inner" />
        </g>
        <g className="dim-lines">
          <path
            d={`M0 ${height + 16}H${width}M0 ${height + 10}v12M${width} ${height + 10}v12M${width + 16} 0V${height}M${width + 10} 0h12M${width + 10} ${height}h12`}
            fill="none"
          />
          <text
            x={width / 2}
            y={height + 36}
            textAnchor="middle"
            className="dim-label"
          >
            {widthMm}
          </text>
          <text x={width + 28} y={height / 2} className="dim-label">
            {heightMm}
          </text>
        </g>
      </svg>
    </div>
  );
}
