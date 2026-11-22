"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
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
  initialPlacementMm,
  isOutOfBounds,
  metersToMm,
  moveRect,
  roomAreaM2,
  rotateRectAroundCenter,
  shareOfRoomPercent,
  snapMm,
  totalFootprintAreaM2,
  type FloorRect,
  type RotationQuarter,
} from "@/lib/floor-planner/geometry";
import {
  clampPan,
  fitScalePxPerMm,
  fitView,
  formatZoomPercent,
  labelFontSizeMm,
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
  } | null>(null);
  const panDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originPanX: number;
    originPanY: number;
  } | null>(null);
  const viewRef = useRef<ViewTransform>(fitView());

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

  const roomWidthMm = metersToMm(roomWidthM);
  const roomLengthMm = metersToMm(roomLengthM);

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

  const defaultPlacements = useMemo(() => {
    const defaults: Record<string, PlacementState> = {};
    products.forEach((product, index) => {
      const { xMm, yMm } = initialPlacementMm(
        index,
        product.dimensionsMm.w,
        product.dimensionsMm.d,
      );
      defaults[product.slug] = { xMm, yMm, rotation: 0 };
    });
    return defaults;
  }, [products]);

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

  const pxPerMmAtFit = useMemo(
    () =>
      fitScalePxPerMm(
        viewportSize.width,
        viewportSize.height,
        roomWidthMm,
        roomLengthMm,
      ),
    [roomLengthMm, roomWidthMm, viewportSize.height, viewportSize.width],
  );

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

  const resetLayout = useCallback(() => {
    setRoomWidthM(DEFAULT_ROOM_WIDTH_M);
    setRoomLengthM(DEFAULT_ROOM_LENGTH_M);
    setGapMm(DEFAULT_MACHINE_GAP_MM);
    const next = fitView();
    viewRef.current = next;
    setView(next);
    setHiddenSlugs(new Set());
    setSelectedSlug(null);
    setPlacementOverrides({});
  }, []);

  const updatePlacement = useCallback(
    (slug: string, patch: Partial<PlacementState>) => {
      setPlacementOverrides((prev) => {
        const base = placements[slug];
        if (!base) return prev;
        const current = prev[slug] ?? base;
        return { ...prev, [slug]: { ...current, ...patch } };
      });
    },
    [placements],
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
      setPlacementOverrides((prev) => ({
        ...prev,
        [slug]: {
          xMm: snapMm(next.xMm),
          yMm: snapMm(next.yMm),
          rotation: next.rotation,
        },
      }));
    },
    [placements, products],
  );

  const removeFromPlan = useCallback((slug: string) => {
    setHiddenSlugs((prev) => new Set(prev).add(slug));
    setSelectedSlug((current) => (current === slug ? null : current));
  }, []);

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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm });
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const moved = moveRect(rect, GRID_SNAP_MM, 0);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const moved = moveRect(rect, 0, -GRID_SNAP_MM);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm });
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      const moved = moveRect(rect, 0, GRID_SNAP_MM);
      updatePlacement(effectiveSelectedSlug, { xMm: moved.xMm, yMm: moved.yMm });
    }
  }

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
    if (dragRef.current?.pointerId === event.pointerId) {
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
                const issue = outside
                  ? t("outside")
                  : overlap
                    ? t("overlap")
                    : null;
                const preferred = Math.max(
                  60,
                  Math.min(140, Math.min(w, d) * 0.14),
                );
                const labelSize = labelFontSizeMm(
                  preferred,
                  pxPerMmAtFit,
                  view.zoom,
                );

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
                    role="button"
                    tabIndex={-1}
                    aria-label={t("machineLabel", {
                      name: placement.name,
                      size: topViewLabel(
                        placement.wMm,
                        placement.dMm,
                        placement.rotation,
                      ),
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
                    <rect
                      x={placement.xMm}
                      y={placement.yMm}
                      width={w}
                      height={d}
                      className="floor-planner-machine-body"
                    />
                    {issue ? (
                      <line
                        x1={placement.xMm + 20}
                        y1={placement.yMm}
                        x2={placement.xMm + 20}
                        y2={placement.yMm + d}
                        className="floor-planner-machine-stripe"
                        strokeWidth={40}
                      />
                    ) : null}
                    <g aria-hidden="true">
                      {issue ? (
                        <text
                          x={placement.xMm + w / 2}
                          y={placement.yMm + d / 2}
                          className="floor-planner-machine-issue"
                          fontSize={labelSize}
                        >
                          {issue}
                        </text>
                      ) : null}
                      <text
                        x={placement.xMm + w / 2}
                        y={placement.yMm + d / 2 + (issue ? labelSize : 0)}
                        className="floor-planner-machine-name"
                        fontSize={labelSize}
                      >
                        {placement.name}
                      </text>
                      <text
                        x={placement.xMm + w / 2}
                        y={
                          placement.yMm +
                          d / 2 +
                          (issue ? labelSize * 2 : labelSize)
                        }
                        className="floor-planner-machine-size"
                        fontSize={labelSize * 0.85}
                      >
                        {topViewLabel(
                          placement.wMm,
                          placement.dMm,
                          placement.rotation,
                        )}{" "}
                        {t("unitMm")}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
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
      </div>
    </section>
  );
}
