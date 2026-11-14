"use client";

import { motion, useReducedMotion } from "motion/react";

import { useDimHighlight } from "@/components/motion/DimHighlight";
import { isExpressive, MOTION_EASE, MOTION_MS } from "@/config/motion";

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

  const reduced = useReducedMotion() === true;
  const expressive = isExpressive() && !reduced;
  const { active } = useDimHighlight();

  const widthPath = `M0 ${height + 16}H${width}M0 ${height + 10}v12M${width} ${height + 10}v12`;
  const heightPath = `M${width + 16} 0V${height}M${width + 10} 0h12M${width + 10} ${height}h12`;

  const widthOn =
    active === "width" || active === "both";
  const heightOn =
    active === "height" || active === "both";

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
          {/* motion: dimension lines draw via stroke length; labels fade in after 150ms */}
          {expressive ? (
            <>
              <motion.path
                d={widthPath}
                fill="none"
                className={widthOn ? "dim-line is-hot" : "dim-line"}
                data-dim="width"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: MOTION_MS.slow / 1000,
                  ease: MOTION_EASE.emphasized,
                }}
              />
              <motion.path
                d={heightPath}
                fill="none"
                className={heightOn ? "dim-line is-hot" : "dim-line"}
                data-dim="height"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: MOTION_MS.slow / 1000,
                  ease: MOTION_EASE.emphasized,
                  delay: 0.08,
                }}
              />
              <motion.text
                x={width / 2}
                y={height + 36}
                textAnchor="middle"
                className={widthOn ? "dim-label is-hot" : "dim-label"}
                data-dim="width"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: MOTION_MS.labelDelay / 1000,
                  duration: MOTION_MS.base / 1000,
                }}
              >
                {widthMm}
              </motion.text>
              <motion.text
                x={width + 28}
                y={height / 2}
                className={heightOn ? "dim-label is-hot" : "dim-label"}
                data-dim="height"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  delay: MOTION_MS.labelDelay / 1000,
                  duration: MOTION_MS.base / 1000,
                }}
              >
                {heightMm}
              </motion.text>
            </>
          ) : (
            <>
              <path
                d={`${widthPath}${heightPath}`}
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
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
