"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { formatCatalogNumber } from "@/lib/catalog/format";
import type { CompareRecord } from "@/lib/catalog/compare";
import {
  collectOverlapSlugs,
  DEFAULT_MACHINE_GAP_MM,
  DEFAULT_ROOM_LENGTH_M,
  DEFAULT_ROOM_WIDTH_M,
  footprintMm,
  GRID_SNAP_MM,
  isOutOfBounds,
  metersToMm,
  moveRect,
  placeMachinesDefault,
  roomAreaM2,
  rotateRectAroundCenter,
  shareOfRoomPercent,
  snapMm,
  totalFootprintAreaM2,
  type FloorRect,
  type RotationQuarter,
} from "@/lib/floor-planner/geometry";
import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
  type HistoryState,
} from "@/lib/floor-planner/history";
import {
  buildPlanHash,
  parsePlanHash,
  planPayloadFromState,
} from "@/lib/floor-planner/plan-hash";
import {
  clampRectInViewport,
  LABEL_BADGE_FONT_PX,
  LABEL_MAX_LINES,
  LABEL_NAME_FONT_PX,
  LABEL_SIZE_FONT_PX,
  nameFitsInMachineBox,
  pickCalloutSide,
  selectMachineLabelMode,
  wrapLabelLines,
  type RectPx,
} from "@/lib/floor-planner/machine-label";
import {
  clampPan,
  fitView,
  formatZoomPercent,
  PAN_STEP_PX,
  stepZoom,
  viewportHeightPx,
  zoomAtCenter,
  type ViewTransform,
} from "@/lib/floor-planner/view-transform";

type PlacementState = {
  xMm: number;
  yMm: number;
  rotation: RotationQuarter;
};

type PlanSnapshot = {
  roomWidthM: number;
  roomLengthM: number;
  gapMm: number;
  placementOverrides: Record<string, PlacementState>;
  hiddenSlugs: string[];
};

type FloorPlannerProps = {
  products: readonly CompareRecord[];
  quoteHref: string;
};

function topViewLabel(wMm: number, dMm: number, rotation: RotationQuarter): string {
  const { w, d } = footprintMm(wMm, dMm, rotation);
  return `${w}×${d}`;
}

/** Screen → SVG user units; includes CSS zoom/pan via getScreenCTM. */
function clientToSvgMm(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const matrix = svg.getScreenCTM();
  if (!matrix) return { x: 0, y: 0 };
  const mapped = pt.matrixTransform(matrix.inverse());
  return { x: mapped.x, y: mapped.y };
}

function snapshotEqual(a: PlanSnapshot, b: PlanSnapshot): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildDefaults(
  products: readonly CompareRecord[],
  roomWidthMm: number,
  roomLengthMm: number,
  gapMm: number,
): Record<string, PlacementState> {
  const placed = placeMachinesDefault(
    products.map((product) => ({
      wMm: product.dimensionsMm.w,
      dMm: product.dimensionsMm.d,
    })),
    roomWidthMm,
    roomLengthMm,
    gapMm,
  );
  const defaults: Record<string, PlacementState> = {};
  products.forEach((product, index) => {
    const point = placed[index];
    if (!point) return;
    defaults[product.slug] = point;
  });
  return defaults;
}

export function FloorPlanner({ products, quoteHref }: FloorPlannerProps) {
  const t = useTranslations("compare.floorPlanner");
  const locale = useLocale();
  const sectionId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const stagePointersRef = useRef(
    new Map<number, { x: number; y: number }>(),
  );
  const dragRef = useRef<{
    slug: string;
    offsetX: number;
    offsetY: number;
    pointerId: number;
    origin: PlacementState;
  } | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);
  const viewRef = useRef<ViewTransform>(fitView());
  const hydratedRef = useRef(false);

  const [roomWidthM, setRoomWidthM] = useState(DEFAULT_ROOM_WIDTH_M);
  const [roomLengthM, setRoomLengthM] = useState(DEFAULT_ROOM_LENGTH_M);
  const [gapMm, setGapMm] = useState(DEFAULT_MACHINE_GAP_MM);
  const [view, setView] = useState<ViewTransform>(fitView);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [hiddenSlugs, setHiddenSlugs] = useState<Set<string>>(() => new Set());
  const [placementOverrides, setPlacementOverrides] = useState<
    Record<string, PlacementState>
  >(() => ({}));
  const [history, setHistory] = useState<HistoryState<PlanSnapshot>>(() =>
    createHistory({
      roomWidthM: DEFAULT_ROOM_WIDTH_M,
      roomLengthM: DEFAULT_ROOM_LENGTH_M,
      gapMm: DEFAULT_MACHINE_GAP_MM,
      placementOverrides: {},
      hiddenSlugs: [],
    }),
  );
  const [planCopyStatus, setPlanCopyStatus] = useState(false);
  const [screenBoxes, setScreenBoxes] = useState<Record<string, RectPx>>(
    () => ({}),
  );

  const roomWidthMm = metersToMm(roomWidthM);
  const roomLengthMm = metersToMm(roomLengthM);

  const currentSnapshot = useMemo<PlanSnapshot>(
    () => ({
      roomWidthM,
      roomLengthM,
      gapMm,
      placementOverrides,
      hiddenSlugs: [...hiddenSlugs].sort(),
    }),
    [gapMm, hiddenSlugs, placementOverrides, roomLengthM, roomWidthM],
  );

  const commitSnapshot = useCallback((next: PlanSnapshot) => {
    setRoomWidthM(next.roomWidthM);
    setRoomLengthM(next.roomLengthM);
    setGapMm(next.gapMm);
    setPlacementOverrides(next.placementOverrides);
    setHiddenSlugs(new Set(next.hiddenSlugs));
  }, []);

  const pushSnapshot = useCallback((next: PlanSnapshot) => {
    setHistory((prev) => {
      if (snapshotEqual(prev.present, next)) return prev;
      return pushHistory(prev, next);
    });
  }, []);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    if (typeof window === "undefined") return;
    const parsed = parsePlanHash(window.location.hash);
    if (!parsed) return;
    const overrides: Record<string, PlacementState> = {};
    for (const machine of parsed.m) {
      if (!products.some((product) => product.slug === machine.s)) continue;
      overrides[machine.s] = {
        xMm: snapMm(machine.x),
        yMm: snapMm(machine.y),
        rotation: machine.r,
      };
    }
    const next: PlanSnapshot = {
      roomWidthM: parsed.w,
      roomLengthM: parsed.l,
      gapMm: parsed.g,
      placementOverrides: overrides,
      hiddenSlugs: (parsed.h ?? []).filter((slug) =>
        products.some((product) => product.slug === slug),
      ),
    };
    // Defer setState out of the effect body (lint: set-state-in-effect).
    const frame = window.requestAnimationFrame(() => {
      commitSnapshot(next);
      setHistory(createHistory(next));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [commitSnapshot, products]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const measure = () => {
      const width = stage.clientWidth;
      const height = viewportHeightPx(
        width,
        roomWidthM,
        roomLengthM,
        window.innerHeight,
      );
      setViewportSize((prev) => {
        if (prev.width === width && prev.height === height) return prev;
        setView((current) => {
          const next = zoomAtCenter(current, current.zoom, width, height);
          viewRef.current = next;
          return next;
        });
        return { width, height };
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [roomLengthM, roomWidthM]);

  const productSlugs = useMemo(
    () => new Set(products.map((product) => product.slug)),
    [products],
  );

  const defaultPlacements = useMemo(
    () => buildDefaults(products, roomWidthMm, roomLengthMm, gapMm),
    [gapMm, products, roomLengthMm, roomWidthMm],
  );

  const placements = useMemo(() => {
    const merged = { ...defaultPlacements };
    for (const [slug, state] of Object.entries(placementOverrides)) {
      if (merged[slug]) {
        merged[slug] = state;
      }
    }
    return merged;
  }, [defaultPlacements, placementOverrides]);

  const effectiveHiddenSlugs = useMemo(() => {
    const next = new Set<string>();
    for (const slug of hiddenSlugs) {
      if (productSlugs.has(slug)) next.add(slug);
    }
    return next;
  }, [hiddenSlugs, productSlugs]);

  const effectiveSelectedSlug =
    selectedSlug && !effectiveHiddenSlugs.has(selectedSlug)
      ? selectedSlug
      : null;

  const activePlacements = useMemo(() => {
    return products
      .filter((product) => !effectiveHiddenSlugs.has(product.slug))
      .map((product) => {
        const state = placements[product.slug];
        if (!state) return null;
        return {
          slug: product.slug,
          name: product.name,
          wMm: product.dimensionsMm.w,
          dMm: product.dimensionsMm.d,
          ...state,
        };
      })
      .filter(
        (
          item,
        ): item is {
          slug: string;
          name: string;
          wMm: number;
          dMm: number;
          xMm: number;
          yMm: number;
          rotation: RotationQuarter;
        } => Boolean(item),
      );
  }, [effectiveHiddenSlugs, placements, products]);

  const overlapSlugs = useMemo(
    () => collectOverlapSlugs(activePlacements, gapMm),
    [activePlacements, gapMm],
  );

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const stage = stageRef.current;
    if (!svg || !stage) return;
    const measure = () => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const stageBox = stage.getBoundingClientRect();
      const next: Record<string, RectPx> = {};
      for (const placement of activePlacements) {
        const { w, d } = footprintMm(
          placement.wMm,
          placement.dMm,
          placement.rotation,
        );
        const p1 = svg.createSVGPoint();
        p1.x = placement.xMm;
        p1.y = placement.yMm;
        const p2 = svg.createSVGPoint();
        p2.x = placement.xMm + w;
        p2.y = placement.yMm + d;
        const a = p1.matrixTransform(ctm);
        const b = p2.matrixTransform(ctm);
        next[placement.slug] = {
          left: Math.min(a.x, b.x) - stageBox.left,
          top: Math.min(a.y, b.y) - stageBox.top,
          width: Math.abs(b.x - a.x),
          height: Math.abs(b.y - a.y),
        };
      }
      setScreenBoxes(next);
    };
    measure();
    const frame = window.requestAnimationFrame(measure);
    return () => window.cancelAnimationFrame(frame);
  }, [activePlacements, view, viewportSize, roomWidthMm, roomLengthMm]);

  const machineAreaM2 = useMemo(
    () => totalFootprintAreaM2(activePlacements),
    [activePlacements],
  );

  const roomArea = roomAreaM2(roomWidthM, roomLengthM);
  const areaShare = shareOfRoomPercent(machineAreaM2, roomArea);

  const gridLinesM = useMemo(() => {
    const max = Math.max(roomWidthM, roomLengthM);
    return Array.from({ length: max + 1 }, (_, index) => index);
  }, [roomLengthM, roomWidthM]);

  const commitView = useCallback(
    (next: ViewTransform) => {
      const width = viewportSize.width || stageRef.current?.clientWidth || 0;
      const height =
        viewportSize.height ||
        viewportHeightPx(
          width,
          roomWidthM,
          roomLengthM,
          typeof window !== "undefined" ? window.innerHeight : 0,
        );
      const clamped = zoomAtCenter(next, next.zoom, width, height);
      viewRef.current = clamped;
      setView(clamped);
    },
    [roomLengthM, roomWidthM, viewportSize.height, viewportSize.width],
  );

  const bumpZoom = useCallback(
    (direction: 1 | -1) => {
      setView((current) => {
        const width = viewportSize.width || stageRef.current?.clientWidth || 0;
        const height =
          viewportSize.height ||
          viewportHeightPx(
            width,
            roomWidthM,
            roomLengthM,
            typeof window !== "undefined" ? window.innerHeight : 0,
          );
        const next = zoomAtCenter(
          current,
          stepZoom(current.zoom, direction),
          width,
          height,
        );
        viewRef.current = next;
        return next;
      });
    },
    [roomLengthM, roomWidthM, viewportSize.height, viewportSize.width],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const direction: 1 | -1 = event.deltaY < 0 ? 1 : -1;
      bumpZoom(direction);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
    };
  }, [bumpZoom]);

  const fitToView = useCallback(() => {
    const next = fitView();
    viewRef.current = next;
    setView(next);
  }, []);

  const applySnapshot = useCallback(
    (next: PlanSnapshot) => {
      commitSnapshot(next);
      setHistory((prev) => ({ ...prev, present: next }));
    },
    [commitSnapshot],
  );

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (!canUndo(prev)) return prev;
      const next = undoHistory(prev);
      commitSnapshot(next.present);
      return next;
    });
  }, [commitSnapshot]);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (!canRedo(prev)) return prev;
      const next = redoHistory(prev);
      commitSnapshot(next.present);
      return next;
    });
  }, [commitSnapshot]);

  const resetLayout = useCallback(() => {
    const next: PlanSnapshot = {
      roomWidthM: DEFAULT_ROOM_WIDTH_M,
      roomLengthM: DEFAULT_ROOM_LENGTH_M,
      gapMm: DEFAULT_MACHINE_GAP_MM,
      placementOverrides: {},
      hiddenSlugs: [],
    };
    pushSnapshot(currentSnapshot);
    applySnapshot(next);
    const fitted = fitView();
    viewRef.current = fitted;
    setView(fitted);
    setSelectedSlug(null);
  }, [applySnapshot, currentSnapshot, pushSnapshot]);

  const updatePlacement = useCallback(
    (slug: string, patch: Partial<PlacementState>, record = false) => {
      setPlacementOverrides((prev) => {
        const base = placements[slug];
        if (!base) return prev;
        const current = prev[slug] ?? base;
        const nextOverrides = { ...prev, [slug]: { ...current, ...patch } };
        if (record) {
          pushSnapshot({
            ...currentSnapshot,
            placementOverrides: nextOverrides,
          });
        }
        return nextOverrides;
      });
    },
    [currentSnapshot, placements, pushSnapshot],
  );

  const rotateSelected = useCallback(
    (slug: string) => {
      const product = products.find((p) => p.slug === slug);
      const current = placements[slug];
      if (!product || !current) return;
      const rect: FloorRect = {
        xMm: current.xMm,
        yMm: current.yMm,
        wMm: product.dimensionsMm.w,
        dMm: product.dimensionsMm.d,
        rotation: current.rotation,
      };
      const next = rotateRectAroundCenter(rect);
      const nextOverrides = {
        ...placementOverrides,
        [slug]: {
          xMm: snapMm(next.xMm),
          yMm: snapMm(next.yMm),
          rotation: next.rotation,
        },
      };
      const snapshot: PlanSnapshot = {
        ...currentSnapshot,
        placementOverrides: nextOverrides,
      };
      pushSnapshot(currentSnapshot);
      setPlacementOverrides(nextOverrides);
      setHistory((prev) => ({ ...prev, present: snapshot }));
    },
    [
      currentSnapshot,
      placementOverrides,
      placements,
      products,
      pushSnapshot,
    ],
  );

  const removeFromPlan = useCallback(
    (slug: string) => {
      const nextHidden = new Set(hiddenSlugs).add(slug);
      const snapshot: PlanSnapshot = {
        ...currentSnapshot,
        hiddenSlugs: [...nextHidden].sort(),
      };
      pushSnapshot(currentSnapshot);
      setHiddenSlugs(nextHidden);
      setSelectedSlug((current) => (current === slug ? null : current));
      setHistory((prev) => ({ ...prev, present: snapshot }));
    },
    [currentSnapshot, hiddenSlugs, pushSnapshot],
  );

  const panBy = useCallback(
    (dx: number, dy: number) => {
      const current = viewRef.current;
      if (current.zoom <= 1) return;
      const pan = clampPan(
        current.panX + dx,
        current.panY + dy,
        current.zoom,
        viewportSize.width,
        viewportSize.height,
      );
      const next = { zoom: current.zoom, ...pan };
      viewRef.current = next;
      setView(next);
    },
    [viewportSize.height, viewportSize.width],
  );

  const copyPlanLink = useCallback(async () => {
    try {
      const payload = planPayloadFromState({
        roomWidthM,
        roomLengthM,
        gapMm,
        placements,
        hiddenSlugs: [...effectiveHiddenSlugs],
      });
      const url = new URL(window.location.href);
      url.hash = buildPlanHash(payload).slice(1);
      await navigator.clipboard.writeText(url.toString());
      setPlanCopyStatus(true);
      window.setTimeout(() => setPlanCopyStatus(false), 2000);
    } catch {
      setPlanCopyStatus(false);
    }
  }, [
    effectiveHiddenSlugs,
    gapMm,
    placements,
    roomLengthM,
    roomWidthM,
  ]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable)
    ) {
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
      return;
    }

    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      bumpZoom(1);
      return;
    }
    if (event.key === "-" || event.key === "_") {
      event.preventDefault();
      bumpZoom(-1);
      return;
    }
    if (event.key === "0") {
      event.preventDefault();
      fitToView();
      return;
    }

    if (!effectiveSelectedSlug) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        panBy(PAN_STEP_PX, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        panBy(-PAN_STEP_PX, 0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        panBy(0, PAN_STEP_PX);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        panBy(0, -PAN_STEP_PX);
      }
      return;
    }

    const product = products.find((p) => p.slug === effectiveSelectedSlug);
    const state = placements[effectiveSelectedSlug];
    if (!product || !state) return;

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeFromPlan(effectiveSelectedSlug);
      return;
    }

    if (event.key === "r" || event.key === "R") {
      event.preventDefault();
      rotateSelected(effectiveSelectedSlug);
      return;
    }

    const rect: FloorRect = {
      xMm: state.xMm,
      yMm: state.yMm,
      wMm: product.dimensionsMm.w,
      dMm: product.dimensionsMm.d,
      rotation: state.rotation,
    };

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const moved = moveRect(rect, -GRID_SNAP_MM, 0);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm }, true);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const moved = moveRect(rect, GRID_SNAP_MM, 0);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm }, true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const moved = moveRect(rect, 0, -GRID_SNAP_MM);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm }, true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const moved = moveRect(rect, 0, GRID_SNAP_MM);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm }, true);
    }
  }

  useEffect(() => {
    function onWindowKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
    }
    window.addEventListener("keydown", onWindowKey);
    return () => window.removeEventListener("keydown", onWindowKey);
  }, [redo, undo]);

  function beginDrag(
    slug: string,
    event: ReactPointerEvent<SVGGElement>,
  ) {
    const svg = svgRef.current;
    if (!svg) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedSlug(slug);
    const state = placements[slug];
    if (!state) return;

    const point = clientToSvgMm(svg, event.clientX, event.clientY);
    dragRef.current = {
      slug,
      pointerId: event.pointerId,
      offsetX: point.x - state.xMm,
      offsetY: point.y - state.yMm,
      origin: state,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onMachinePointerMove(
    slug: string,
    event: ReactPointerEvent<SVGGElement>,
  ) {
    const drag = dragRef.current;
    const svg = svgRef.current;
    if (!drag || drag.slug !== slug || !svg) return;
    const point = clientToSvgMm(svg, event.clientX, event.clientY);
    const xMm = snapMm(point.x - drag.offsetX);
    const yMm = snapMm(point.y - drag.offsetY);
    updatePlacement(slug, { xMm, yMm });
  }

  function endDrag(event: ReactPointerEvent<SVGGElement>) {
    const drag = dragRef.current;
    if (drag?.pointerId === event.pointerId) {
      const current = placements[drag.slug];
      if (
        current &&
        (current.xMm !== drag.origin.xMm || current.yMm !== drag.origin.yMm)
      ) {
        pushSnapshot({
          ...currentSnapshot,
          placementOverrides: {
            ...placementOverrides,
            [drag.slug]: current,
          },
        });
      }
      dragRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function pinchDistance(
    pointers: Map<number, { x: number; y: number }>,
  ): number | null {
    if (pointers.size < 2) return null;
    const points = [...pointers.values()];
    const [a, b] = points;
    if (!a || !b) return null;
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function onStagePointerDownCapture(event: ReactPointerEvent<HTMLDivElement>) {
    stagePointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    const distance = pinchDistance(stagePointersRef.current);
    if (distance !== null) {
      pinchRef.current = { distance, zoom: viewRef.current.zoom };
      panDragRef.current = null;
    }
  }

  function onStagePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const target = event.target as Element | null;
    if (target?.closest(".floor-planner-machine")) return;

    setSelectedSlug(null);

    if (viewRef.current.zoom > 1 && stagePointersRef.current.size < 2) {
      panDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originPanX: viewRef.current.panX,
        originPanY: viewRef.current.panY,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  function onStagePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (stagePointersRef.current.has(event.pointerId)) {
      stagePointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    const distance = pinchDistance(stagePointersRef.current);
    const pinch = pinchRef.current;
    if (distance !== null && pinch && pinch.distance > 0) {
      const nextZoom = pinch.zoom * (distance / pinch.distance);
      commitView({ ...viewRef.current, zoom: nextZoom });
      return;
    }

    const panDrag = panDragRef.current;
    if (!panDrag || panDrag.pointerId !== event.pointerId) return;
    const dx = event.clientX - panDrag.startX;
    const dy = event.clientY - panDrag.startY;
    const pan = clampPan(
      panDrag.originPanX + dx,
      panDrag.originPanY + dy,
      viewRef.current.zoom,
      viewportSize.width,
      viewportSize.height,
    );
    const next = { zoom: viewRef.current.zoom, ...pan };
    viewRef.current = next;
    setView(next);
  }

  function onStagePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    stagePointersRef.current.delete(event.pointerId);
    if (stagePointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (panDragRef.current?.pointerId === event.pointerId) {
      panDragRef.current = null;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  const formatArea = (value: number) =>
    formatCatalogNumber(locale, value, 2);

  const formatPercent = (value: number) =>
    formatCatalogNumber(locale, value, 1);

  const roomWidthFieldId = `${sectionId}-room-width`;
  const roomLengthFieldId = `${sectionId}-room-length`;
  const gapFieldId = `${sectionId}-gap`;
  const zoomLabel = formatZoomPercent(view.zoom);
  const undoEnabled = canUndo(history);
  const redoEnabled = canRedo(history);

  return (
    <section
      id="floor-planner"
      className="floor-planner"
      aria-labelledby="floor-planner-title"
    >
      <h2
        id="floor-planner-title"
        className="floor-planner-title"
        tabIndex={-1}
      >
        {t("title")}
      </h2>
      <p className="floor-planner-lead text-steel">{t("lead")}</p>

      <h3 className="floor-planner-summary" aria-live="polite">
        {t("summaryArea", { area: formatArea(machineAreaM2) })}
        <span className="floor-planner-summary-sep"> · </span>
        {t("summaryShare", { percent: formatPercent(areaShare) })}
      </h3>

      <div className="floor-planner-fields no-print" aria-label={t("fieldsLabel")}>
        <Field id={roomWidthFieldId} label={t("roomWidth")}>
          <Input
            id={roomWidthFieldId}
            type="number"
            inputMode="decimal"
            min={1}
            max={40}
            step={0.5}
            value={roomWidthM}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isFinite(value) && value > 0) setRoomWidthM(value);
            }}
            onBlur={() => {
              if (roomWidthM !== history.present.roomWidthM) {
                pushSnapshot(currentSnapshot);
              }
            }}
          />
        </Field>
        <Field id={roomLengthFieldId} label={t("roomLength")}>
          <Input
            id={roomLengthFieldId}
            type="number"
            inputMode="decimal"
            min={1}
            max={40}
            step={0.5}
            value={roomLengthM}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isFinite(value) && value > 0) setRoomLengthM(value);
            }}
            onBlur={() => {
              if (roomLengthM !== history.present.roomLengthM) {
                pushSnapshot(currentSnapshot);
              }
            }}
          />
        </Field>
        <Field id={gapFieldId} label={t("machineGap")}>
          <Input
            id={gapFieldId}
            type="number"
            inputMode="numeric"
            min={0}
            max={5000}
            step={50}
            value={gapMm}
            onChange={(event) => {
              const value = Number.parseInt(event.target.value, 10);
              if (Number.isFinite(value) && value >= 0) setGapMm(value);
            }}
            onBlur={() => {
              if (gapMm !== history.present.gapMm) {
                pushSnapshot(currentSnapshot);
              }
            }}
          />
        </Field>
      </div>

      <div className="floor-planner-stage-wrap">
        <div
          className="floor-planner-zoom no-print"
          role="group"
          aria-label={t("zoomLabel")}
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={t("zoomOut")}
            onClick={() => bumpZoom(-1)}
          >
            −
          </Button>
          <span className="floor-planner-zoom-value" aria-live="polite">
            {zoomLabel}
          </span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-label={t("zoomIn")}
            onClick={() => bumpZoom(1)}
          >
            +
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={fitToView}
          >
            {t("fit")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!undoEnabled}
            onClick={undo}
          >
            {t("undo")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!redoEnabled}
            onClick={redo}
          >
            {t("redo")}
          </Button>
        </div>
        <div
          ref={stageRef}
          className="floor-planner-stage"
          tabIndex={0}
          role="application"
          aria-label={t("canvasLabel")}
          onKeyDown={handleKeyDown}
          onPointerDown={onStagePointerDown}
          onPointerDownCapture={onStagePointerDownCapture}
          onPointerMove={onStagePointerMove}
          onPointerUp={onStagePointerUp}
          onPointerCancel={onStagePointerUp}
          style={{
            height:
              viewportSize.height > 0 ? `${viewportSize.height}px` : undefined,
          }}
        >
          <div
            className="floor-planner-stage-inner"
            style={{
              transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`,
              transformOrigin: "center center",
            }}
          >
            <svg
              ref={svgRef}
              className="floor-planner-svg"
              viewBox={`0 0 ${roomWidthMm} ${roomLengthMm}`}
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              overflow="visible"
              aria-hidden={false}
            >
              <title>{t("canvasLabel")}</title>
              <rect
                x={0}
                y={0}
                width={roomWidthMm}
                height={roomLengthMm}
                className="floor-planner-room"
              />
              {gridLinesM.map((meter) => {
                const pos = meter * 1000;
                return (
                  <g key={`grid-${meter}`} className="floor-planner-grid">
                    <line x1={pos} y1={0} x2={pos} y2={roomLengthMm} />
                    <line x1={0} y1={pos} x2={roomWidthMm} y2={pos} />
                  </g>
                );
              })}
              {activePlacements.map((placement) => {
                const { w, d } = footprintMm(
                  placement.wMm,
                  placement.dMm,
                  placement.rotation,
                );
                const rect: FloorRect = {
                  xMm: placement.xMm,
                  yMm: placement.yMm,
                  wMm: placement.wMm,
                  dMm: placement.dMm,
                  rotation: placement.rotation,
                };
                const outside = isOutOfBounds(rect, roomWidthMm, roomLengthMm);
                const overlap = overlapSlugs.has(placement.slug);
                const selected = effectiveSelectedSlug === placement.slug;
                const sizeText = topViewLabel(
                  placement.wMm,
                  placement.dMm,
                  placement.rotation,
                );
                const machineTitle = `${placement.name}, ${sizeText} ${t("unitMm")}`;

                return (
                  <g
                    key={placement.slug}
                    className={[
                      "floor-planner-machine",
                      selected ? "is-selected" : "",
                      outside ? "is-outside" : "",
                      overlap ? "is-overlap" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-slug={placement.slug}
                    data-x-mm={placement.xMm}
                    data-y-mm={placement.yMm}
                    data-rotation={placement.rotation}
                    role="button"
                    tabIndex={-1}
                    aria-label={t("machineLabel", {
                      name: placement.name,
                      size: sizeText,
                    })}
                    onPointerDown={(event) => beginDrag(placement.slug, event)}
                    onPointerMove={(event) =>
                      onMachinePointerMove(placement.slug, event)
                    }
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedSlug(placement.slug);
                    }}
                  >
                    <title>{machineTitle}</title>
                    <rect
                      x={placement.xMm}
                      y={placement.yMm}
                      width={w}
                      height={d}
                      className="floor-planner-machine-body"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="floor-planner-labels" aria-hidden="true">
            {activePlacements.map((placement) => {
              const box = screenBoxes[placement.slug];
              if (!box || box.width <= 0 || box.height <= 0) return null;
              const rect: FloorRect = {
                xMm: placement.xMm,
                yMm: placement.yMm,
                wMm: placement.wMm,
                dMm: placement.dMm,
                rotation: placement.rotation,
              };
              const outside = isOutOfBounds(rect, roomWidthMm, roomLengthMm);
              const overlap = overlapSlugs.has(placement.slug);
              const issue = outside
                ? t("outside")
                : overlap
                  ? t("overlap")
                  : null;
              const sizeText = `${topViewLabel(
                placement.wMm,
                placement.dMm,
                placement.rotation,
              )} ${t("unitMm")}`;
              const fits = nameFitsInMachineBox(
                placement.name,
                box.width,
                box.height,
              );
              const mode = selectMachineLabelMode({
                widthPx: box.width,
                heightPx: box.height,
                nameFitsInside: fits,
              });
              const avgChar = LABEL_NAME_FONT_PX * 0.55;
              const maxChars = Math.max(
                4,
                Math.floor(
                  (mode === "callout" ? 160 : Math.max(24, box.width - 8)) /
                    avgChar,
                ),
              );
              const nameLines = wrapLabelLines(
                placement.name,
                maxChars,
                LABEL_MAX_LINES,
              );
              const showSize = mode === "full";
              const labelWidth =
                mode === "callout"
                  ? Math.min(
                      180,
                      Math.max(
                        72,
                        nameLines.reduce(
                          (m, line) => Math.max(m, line.length * avgChar + 16),
                          0,
                        ),
                      ),
                    )
                  : box.width;
              const labelHeight =
                nameLines.length * LABEL_NAME_FONT_PX * 1.2 +
                (showSize ? LABEL_SIZE_FONT_PX * 1.3 + 2 : 0) +
                8;
              const side =
                mode === "callout"
                  ? pickCalloutSide(
                      box,
                      viewportSize,
                      labelWidth,
                      labelHeight,
                    )
                  : null;
              let labelLeft = box.left;
              let labelTop = box.top;
              let leader: {
                x1: number;
                y1: number;
                x2: number;
                y2: number;
              } | null = null;
              if (mode === "callout" && side === "right") {
                labelLeft = box.left + box.width + 8;
                labelTop = box.top + Math.max(0, (box.height - labelHeight) / 2);
                leader = {
                  x1: box.left + box.width,
                  y1: box.top + box.height / 2,
                  x2: labelLeft,
                  y2: labelTop + labelHeight / 2,
                };
              } else if (mode === "callout" && side === "bottom") {
                labelLeft = box.left + Math.max(0, (box.width - labelWidth) / 2);
                labelTop = box.top + box.height + 8;
                leader = {
                  x1: box.left + box.width / 2,
                  y1: box.top + box.height,
                  x2: labelLeft + labelWidth / 2,
                  y2: labelTop,
                };
              }
              const clampedLabel = clampRectInViewport(
                {
                  left: labelLeft,
                  top: labelTop,
                  width: mode === "callout" ? labelWidth : box.width,
                  height: mode === "callout" ? labelHeight : box.height,
                },
                viewportSize.width > 0
                  ? viewportSize
                  : { width: 1, height: 1 },
              );

              const badgeWidth = Math.max(
                48,
                (issue?.length ?? 0) * LABEL_BADGE_FONT_PX * 0.62 + 16,
              );
              const badgeHeight = LABEL_BADGE_FONT_PX + 10;
              const badgePreferred = {
                left: box.left + Math.max(0, (box.width - badgeWidth) / 2),
                top: box.top - badgeHeight - 4,
                width: badgeWidth,
                height: badgeHeight,
              };
              const badgeBox = issue
                ? clampRectInViewport(
                    badgePreferred,
                    viewportSize.width > 0
                      ? viewportSize
                      : { width: 1, height: 1 },
                  )
                : null;

              return (
                <div key={`label-${placement.slug}`}>
                  {leader ? (
                    <svg
                      className="floor-planner-callout-leader"
                      width={viewportSize.width || 1}
                      height={viewportSize.height || 1}
                    >
                      <line
                        x1={leader.x1}
                        y1={leader.y1}
                        x2={leader.x2}
                        y2={leader.y2}
                      />
                    </svg>
                  ) : null}
                  <div
                    className={[
                      "floor-planner-label",
                      mode === "callout" ? "is-callout" : "is-inside",
                    ].join(" ")}
                    data-label-slug={placement.slug}
                    data-label-mode={mode}
                    style={
                      mode === "callout"
                        ? {
                            left: clampedLabel.left,
                            top: clampedLabel.top,
                            width: clampedLabel.width,
                          }
                        : {
                            left: box.left,
                            top: box.top,
                            width: box.width,
                            height: box.height,
                          }
                    }
                  >
                    <div className="floor-planner-label-name">
                      {nameLines.map((line) => (
                        <span key={`${placement.slug}-${line}`}>{line}</span>
                      ))}
                    </div>
                    {showSize ? (
                      <div className="floor-planner-label-size">{sizeText}</div>
                    ) : null}
                  </div>
                  {issue && badgeBox ? (
                    <div
                      className="floor-planner-badge"
                      data-badge-slug={placement.slug}
                      style={{
                        left: badgeBox.left,
                        top: badgeBox.top,
                        minHeight: badgeBox.height,
                      }}
                    >
                      {issue}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
        <p className="floor-planner-hint text-steel no-print">{t("hint")}</p>
      </div>

      <div className="floor-planner-actions">
        <Button type="button" variant="secondary" onClick={resetLayout}>
          {t("reset")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="no-print"
          onClick={() => void copyPlanLink()}
        >
          {t("copyPlanLink")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="no-print"
          onClick={() => window.print()}
        >
          {t("print")}
        </Button>
        {effectiveSelectedSlug ? (
          <Button
            type="button"
            variant="secondary"
            className="no-print"
            onClick={() => rotateSelected(effectiveSelectedSlug)}
          >
            {t("rotate")}
          </Button>
        ) : null}
        <Button href={quoteHref} variant="primary">
          {t("quote")}
        </Button>
        {planCopyStatus ? (
          <p className="compare-copy-status" role="status">
            {t("planLinkCopied")}
          </p>
        ) : null}
      </div>
    </section>
  );
}
