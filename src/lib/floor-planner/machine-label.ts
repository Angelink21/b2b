/** Screen-pixel label layout for floor-planner machines (pure, unit-tested). */

export const LABEL_NAME_FONT_PX = 14;
export const LABEL_SIZE_FONT_PX = 12;
export const LABEL_BADGE_FONT_PX = 12;
export const LABEL_MAX_LINES = 3;
/** Below this on-screen footprint, drop size line and consider callout. */
export const LABEL_FULL_MIN_WIDTH_PX = 90;
export const LABEL_FULL_MIN_HEIGHT_PX = 36;

export type MachineLabelMode = "full" | "name" | "callout";

export type MachineLabelModeInput = {
  widthPx: number;
  heightPx: number;
  /** Whether the wrapped name (≤3 lines) fits inside the machine box. */
  nameFitsInside: boolean;
};

/**
 * Choose how to render a machine caption:
 * - full: name + size inside the machine
 * - name: name only inside (machine too short/narrow for size)
 * - callout: label beside the machine with a leader line
 */
export function selectMachineLabelMode(
  input: MachineLabelModeInput,
): MachineLabelMode {
  const { widthPx, heightPx, nameFitsInside } = input;
  const tooSmall =
    widthPx < LABEL_FULL_MIN_WIDTH_PX || heightPx < LABEL_FULL_MIN_HEIGHT_PX;
  if (!tooSmall && nameFitsInside) return "full";
  if (nameFitsInside) return "name";
  return "callout";
}

/** Approximate whether a name fits in a box at 14px / 600 weight, max 3 lines. */
export function nameFitsInMachineBox(
  name: string,
  widthPx: number,
  heightPx: number,
  fontPx: number = LABEL_NAME_FONT_PX,
  maxLines: number = LABEL_MAX_LINES,
): boolean {
  if (widthPx <= 0 || heightPx <= 0) return false;
  const lineHeight = fontPx * 1.2;
  if (lineHeight * maxLines > heightPx - 4) return false;
  const avgChar = fontPx * 0.55;
  const maxCharsPerLine = Math.max(1, Math.floor((widthPx - 8) / avgChar));
  const lines = wrapLabelLines(name, maxCharsPerLine, maxLines);
  if (lines.length > maxLines) return false;
  const longest = lines.reduce((m, line) => Math.max(m, line.length), 0);
  return longest * avgChar <= widthPx - 8 && lines.length * lineHeight <= heightPx - 4;
}

export function wrapLabelLines(
  text: string,
  maxChars: number,
  maxLines: number = LABEL_MAX_LINES,
): string[] {
  const limit = Math.max(1, maxChars);
  if (text.length <= limit) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= limit) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (word.length <= limit) {
      current = word;
    } else {
      for (let i = 0; i < word.length; i += limit) {
        const chunk = word.slice(i, i + limit);
        if (i + limit < word.length) {
          lines.push(chunk);
          if (lines.length >= maxLines) {
            return lines.slice(0, maxLines);
          }
        } else {
          current = chunk;
        }
      }
    }
    if (lines.length >= maxLines) {
      return lines.slice(0, maxLines);
    }
  }
  if (current) lines.push(current);
  return (lines.length > 0 ? lines : [text]).slice(0, maxLines);
}

export type RectPx = { left: number; top: number; width: number; height: number };

/** Keep a badge rect fully inside the stage viewport. */
export function clampRectInViewport(
  rect: RectPx,
  viewport: { width: number; height: number },
  margin = 2,
): RectPx {
  const width = Math.min(rect.width, Math.max(0, viewport.width - margin * 2));
  const height = Math.min(rect.height, Math.max(0, viewport.height - margin * 2));
  const left = Math.min(
    Math.max(margin, rect.left),
    Math.max(margin, viewport.width - width - margin),
  );
  const top = Math.min(
    Math.max(margin, rect.top),
    Math.max(margin, viewport.height - height - margin),
  );
  return { left, top, width, height };
}

export type CalloutSide = "right" | "bottom";

/** Prefer right callout when there is horizontal room; else bottom. */
export function pickCalloutSide(
  machine: RectPx,
  viewport: { width: number; height: number },
  calloutWidth: number,
  calloutHeight: number,
  gap = 8,
): CalloutSide {
  const rightFits = machine.left + machine.width + gap + calloutWidth <= viewport.width - 2;
  if (rightFits) return "right";
  const bottomFits =
    machine.top + machine.height + gap + calloutHeight <= viewport.height - 2;
  if (bottomFits) return "bottom";
  // Prefer the side with more free space.
  const rightSpace = viewport.width - (machine.left + machine.width);
  const bottomSpace = viewport.height - (machine.top + machine.height);
  return rightSpace >= bottomSpace ? "right" : "bottom";
}
