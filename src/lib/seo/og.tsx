import type { ReactNode } from "react";

import { colors } from "@/styles/tokens";

export const OG_SIZE = { width: 1200, height: 630 } as const;

export const ogColors = colors.light;

/** Honest front silhouette from mm for OG (Satori-friendly divs). */
export function OgSilhouette({
  widthMm,
  heightMm,
  maxPx = 280,
}: {
  widthMm: number;
  heightMm: number;
  maxPx?: number;
}) {
  const scale = Math.min(maxPx / widthMm, maxPx / heightMm);
  const width = Math.max(24, widthMm * scale);
  const height = Math.max(24, heightMm * scale);
  const panelH = Math.max(4, height * 0.05);
  const r = Math.min(width, height) * 0.27;
  const cx = width / 2;
  const cy = height * 0.57;
  const ink = ogColors.ink;
  const line = ogColors.line;
  const floor = ogColors.floor;

  return (
    <div
      style={{
        display: "flex",
        width,
        height,
        backgroundColor: floor,
        border: `2px solid ${ink}`,
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 8,
          left: 8,
          width: width - 16,
          height: panelH,
          backgroundColor: line,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: cx - r,
          top: cy - r,
          width: r * 2,
          height: r * 2,
          borderRadius: r,
          border: `2px solid ${ink}`,
        }}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: cx - r * 0.72,
          top: cy - r * 0.72,
          width: r * 1.44,
          height: r * 1.44,
          borderRadius: r * 0.72,
          border: `1px solid ${line}`,
        }}
      />
    </div>
  );
}

export function OgFrame({
  children,
  brand,
}: {
  children: ReactNode;
  brand: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: ogColors.bg,
        color: ogColors.ink,
        padding: 48,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: "0.02em",
          color: ogColors.steel,
          marginBottom: 24,
        }}
      >
        {brand}
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          gap: 48,
        }}
      >
        {children}
      </div>
    </div>
  );
}
