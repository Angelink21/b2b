export const GRID_SNAP_MM = 50;
export const WALL_CLEARANCE_MM = 100;
export const DEFAULT_ROOM_WIDTH_M = 6;
export const DEFAULT_ROOM_LENGTH_M = 4;
export const DEFAULT_MACHINE_GAP_MM = 0;

export type RotationQuarter = 0 | 1 | 2 | 3;

export type FloorRect = {
  xMm: number;
  yMm: number;
  wMm: number;
  dMm: number;
  rotation: RotationQuarter;
};

export function footprintMm(
  wMm: number,
  dMm: number,
  rotation: RotationQuarter,
): { w: number; d: number } {
  const swap = rotation % 2 === 1;
  return swap ? { w: dMm, d: wMm } : { w: wMm, d: dMm };
}

export function snapMm(value: number, gridMm: number = GRID_SNAP_MM): number {
  return Math.round(value / gridMm) * gridMm;
}

export function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

export function metersToMm(meters: number): number {
  return meters * 1000;
}

export function roomAreaM2(roomWidthM: number, roomLengthM: number): number {
  return roomWidthM * roomLengthM;
}

export function footprintAreaM2(
  wMm: number,
  dMm: number,
  rotation: RotationQuarter,
): number {
  const { w, d } = footprintMm(wMm, dMm, rotation);
  return (w * d) / 1_000_000;
}

export function totalFootprintAreaM2(
  items: readonly { wMm: number; dMm: number; rotation: RotationQuarter }[],
): number {
  let sum = 0;
  for (const item of items) {
    sum += footprintAreaM2(item.wMm, item.dMm, item.rotation);
  }
  return sum;
}

export function shareOfRoomPercent(
  machineAreaM2: number,
  roomAreaM2: number,
): number {
  if (roomAreaM2 <= 0) return 0;
  return (machineAreaM2 / roomAreaM2) * 100;
}

export function rotateQuarter(rotation: RotationQuarter): RotationQuarter {
  return ((rotation + 1) % 4) as RotationQuarter;
}

export function isOutOfBounds(
  rect: FloorRect,
  roomWidthMm: number,
  roomLengthMm: number,
): boolean {
  const { w, d } = footprintMm(rect.wMm, rect.dMm, rect.rotation);
  return (
    rect.xMm < 0 ||
    rect.yMm < 0 ||
    rect.xMm + w > roomWidthMm ||
    rect.yMm + d > roomLengthMm
  );
}

/** Axis-aligned footprint with optional clearance gap between machines. */
function expandedBox(
  rect: FloorRect,
  gapMm: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const { w, d } = footprintMm(rect.wMm, rect.dMm, rect.rotation);
  const pad = gapMm / 2;
  return {
    x1: rect.xMm - pad,
    y1: rect.yMm - pad,
    x2: rect.xMm + w + pad,
    y2: rect.yMm + d + pad,
  };
}

export function rectsOverlap(
  a: FloorRect,
  b: FloorRect,
  gapMm: number,
): boolean {
  const boxA = expandedBox(a, gapMm);
  const boxB = expandedBox(b, gapMm);
  return !(
    boxA.x2 <= boxB.x1 ||
    boxB.x2 <= boxA.x1 ||
    boxA.y2 <= boxB.y1 ||
    boxB.y2 <= boxA.y1
  );
}

export function collectOverlapSlugs(
  placements: readonly (FloorRect & { slug: string })[],
  gapMm: number,
): Set<string> {
  const overlapping = new Set<string>();
  for (let i = 0; i < placements.length; i += 1) {
    for (let j = i + 1; j < placements.length; j += 1) {
      const left = placements[i]!;
      const right = placements[j]!;
      if (rectsOverlap(left, right, gapMm)) {
        overlapping.add(left.slug);
        overlapping.add(right.slug);
      }
    }
  }
  return overlapping;
}

export function rotateRectAroundCenter(rect: FloorRect): FloorRect {
  const { w, d } = footprintMm(rect.wMm, rect.dMm, rect.rotation);
  const cx = rect.xMm + w / 2;
  const cy = rect.yMm + d / 2;
  const rotation = rotateQuarter(rect.rotation);
  const next = footprintMm(rect.wMm, rect.dMm, rotation);
  return {
    ...rect,
    rotation,
    xMm: cx - next.w / 2,
    yMm: cy - next.d / 2,
  };
}

export function moveRect(
  rect: FloorRect,
  dxMm: number,
  dyMm: number,
): FloorRect {
  return {
    ...rect,
    xMm: snapMm(rect.xMm + dxMm),
    yMm: snapMm(rect.yMm + dyMm),
  };
}

/**
 * Nearest free cell on the snap grid that keeps the footprint inside the room
 * and clear of occupied rects (with gap). Prefers the wall-clearance origin.
 */
export function findNearestFreePlacementMm(
  wMm: number,
  dMm: number,
  rotation: RotationQuarter,
  roomWidthMm: number,
  roomLengthMm: number,
  occupied: readonly FloorRect[],
  gapMm: number,
  preferXMm: number = WALL_CLEARANCE_MM,
  preferYMm: number = WALL_CLEARANCE_MM,
): { xMm: number; yMm: number } {
  const originX = snapMm(preferXMm);
  const originY = snapMm(preferYMm);
  const { w, d } = footprintMm(wMm, dMm, rotation);
  const maxX = snapMm(Math.max(0, roomWidthMm - w));
  const maxY = snapMm(Math.max(0, roomLengthMm - d));

  let best: { xMm: number; yMm: number; dist: number } | null = null;

  for (let yMm = 0; yMm <= maxY; yMm += GRID_SNAP_MM) {
    for (let xMm = 0; xMm <= maxX; xMm += GRID_SNAP_MM) {
      const candidate: FloorRect = {
        xMm,
        yMm,
        wMm,
        dMm,
        rotation,
      };
      if (isOutOfBounds(candidate, roomWidthMm, roomLengthMm)) continue;
      if (occupied.some((other) => rectsOverlap(candidate, other, gapMm))) {
        continue;
      }
      const dist =
        (xMm - originX) * (xMm - originX) + (yMm - originY) * (yMm - originY);
      if (!best || dist < best.dist) {
        best = { xMm, yMm, dist };
      }
    }
  }

  return best
    ? { xMm: best.xMm, yMm: best.yMm }
    : { xMm: originX, yMm: originY };
}

/** Place machines sequentially: first at 100×100 mm, then nearest free 50 mm cells. */
export function placeMachinesDefault(
  machines: readonly { wMm: number; dMm: number }[],
  roomWidthMm: number,
  roomLengthMm: number,
  gapMm: number = DEFAULT_MACHINE_GAP_MM,
): { xMm: number; yMm: number; rotation: RotationQuarter }[] {
  const placed: FloorRect[] = [];
  const result: { xMm: number; yMm: number; rotation: RotationQuarter }[] = [];

  for (const machine of machines) {
    const rotation: RotationQuarter = 0;
    const { xMm, yMm } = findNearestFreePlacementMm(
      machine.wMm,
      machine.dMm,
      rotation,
      roomWidthMm,
      roomLengthMm,
      placed,
      gapMm,
      WALL_CLEARANCE_MM,
      WALL_CLEARANCE_MM,
    );
    const rect: FloorRect = {
      xMm,
      yMm,
      wMm: machine.wMm,
      dMm: machine.dMm,
      rotation,
    };
    placed.push(rect);
    result.push({ xMm, yMm, rotation });
  }

  return result;
}

/** @deprecated Prefer placeMachinesDefault — kept for call-site migration. */
export function initialPlacementMm(
  index: number,
  wMm: number,
  dMm: number,
): { xMm: number; yMm: number } {
  if (index === 0) {
    return {
      xMm: snapMm(WALL_CLEARANCE_MM),
      yMm: snapMm(WALL_CLEARANCE_MM),
    };
  }
  const { w, d } = footprintMm(wMm, dMm, 0);
  const col = index % 2;
  const row = Math.floor(index / 2);
  const xMm = snapMm(WALL_CLEARANCE_MM + col * (w + 300));
  const yMm = snapMm(WALL_CLEARANCE_MM + row * (d + 300));
  return { xMm, yMm };
}