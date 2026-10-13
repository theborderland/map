import { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Geometry } from "geojson";
import type { EntityCollections, SettingsRecord } from "../db/types";
import type { EntityKind } from "../types";
import { createPOIIcon } from "../utils/Icons";
import { useCreatingKind, useMapEditStore } from "../store/mapEditStore";
import "@geoman-io/leaflet-geoman-free";

type GeomanLayer = L.Layer & {
  pm: {
    enable: (opts?: {
      allowSelfIntersection?: boolean;
      snappable?: boolean;
      snapDistance?: number;
      removeVertexOn?: string;
      removeVertexValidation?: (args: { event: L.LeafletMouseEvent }) => boolean;
    }) => void;
    disable: () => void;
    enableLayerDrag: () => void;
    disableLayerDrag: () => void;
  };
  toGeoJSON: () => GeoJSON.Feature;
};

type GeomanCreateEvent = { layer: L.Layer & { toGeoJSON: () => GeoJSON.Feature } };

interface Props {
  entities: EntityCollections;
  settings: SettingsRecord;
  selectedPOIIcon: string;
}

// ── Shared geometry helpers ──────────────────────────────────

function getSubLayers(layer: L.Layer): L.Layer[] {
  if (!("getLayers" in layer)) return [layer];
  return (layer as L.LayerGroup).getLayers().flatMap((child) => getSubLayers(child));
}

// Reads current polygon geometry from a layer after vertex editing.
function collectPolygonGeometry(layer: L.Layer): Geometry | null {
  const sub = getSubLayers(layer);
  if (!sub.length) return null;
  if (sub.length === 1) return (sub[0] as GeomanLayer).toGeoJSON().geometry;
  return {
    type: "MultiPolygon",
    coordinates: sub.map((l) => ((l as GeomanLayer).toGeoJSON().geometry as GeoJSON.Polygon).coordinates),
  };
}

// Reads current line geometry from the temporary source line layer group.
function collectLineGeometry(layer: L.Layer): Geometry | null {
  const sub = getSubLayers(layer);
  if (!sub.length) return null;
  if (sub.length === 1) return (sub[0] as GeomanLayer).toGeoJSON().geometry;
  return {
    type: "MultiLineString",
    coordinates: sub.map((l) => ((l as GeomanLayer).toGeoJSON().geometry as GeoJSON.LineString).coordinates),
  };
}

// Merges a newly drawn polygon into the area's existing geometry,
// producing a MultiPolygon regardless of how many polygons existed before.
function mergePolygon(base: Geometry, newPoly: GeoJSON.Polygon): GeoJSON.MultiPolygon {
  if (base.type === "Polygon") {
    return { type: "MultiPolygon", coordinates: [(base as GeoJSON.Polygon).coordinates, newPoly.coordinates] };
  }
  if (base.type === "MultiPolygon") {
    return { type: "MultiPolygon", coordinates: [...(base as GeoJSON.MultiPolygon).coordinates, newPoly.coordinates] };
  }
  return { type: "MultiPolygon", coordinates: [newPoly.coordinates] };
}

// Merges a new line into existing road geometry.
// A single LineString + new line becomes a MultiLineString.
function mergeLine(base: Geometry, newLine: GeoJSON.LineString): GeoJSON.MultiLineString {
  if (base.type === "LineString") {
    return { type: "MultiLineString", coordinates: [(base as GeoJSON.LineString).coordinates, newLine.coordinates] };
  }
  if (base.type === "MultiLineString") {
    return { type: "MultiLineString", coordinates: [...(base as GeoJSON.MultiLineString).coordinates, newLine.coordinates] };
  }
  return { type: "MultiLineString", coordinates: [newLine.coordinates] };
}

// Merges a newly placed point into existing POI geometry.
// Single Point + new point becomes MultiPoint.
function mergePoint(base: Geometry, newPoint: GeoJSON.Point): GeoJSON.MultiPoint {
  if (base.type === "Point") {
    return { type: "MultiPoint", coordinates: [(base as GeoJSON.Point).coordinates, newPoint.coordinates] };
  }
  if (base.type === "MultiPoint") {
    return { type: "MultiPoint", coordinates: [...(base as GeoJSON.MultiPoint).coordinates, newPoint.coordinates] };
  }
  return { type: "MultiPoint", coordinates: [newPoint.coordinates] };
}

// Splits a Multi* geometry into one geometry per constituent part.
// Single-part geometries (Polygon/LineString) pass through unchanged.
function splitGeometryParts(geometry: Geometry): Geometry[] {
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.map(
      (coords): GeoJSON.Polygon => ({ type: "Polygon", coordinates: coords })
    );
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map(
      (coords): GeoJSON.LineString => ({ type: "LineString", coordinates: coords })
    );
  }
  return [geometry];
}

// Builds a flat LayerGroup with one simple Leaflet layer per constituent
// part of the geometry. A plain `L.geoJSON(geometry)` call collapses a
// MultiPolygon/MultiLineString into a single compound layer that Geoman
// drags as one rigid body — every part moves together. This instead
// produces genuinely separate layers so each part can be dragged
// independently, matching how MultiPoint already renders as separate
// marker layers (which is why POI dragging already works per-point).
function buildPartsLayerGroup(geometry: Geometry, style: L.PathOptions): L.LayerGroup {
  const subLayers = splitGeometryParts(geometry)
    .map((part) => L.geoJSON(part, { style: () => style, pane: "edit-overlay" }).getLayers()[0])
    .filter((l): l is L.Layer => !!l);
  return L.layerGroup(subLayers);
}

const EDIT_PREVIEW_STYLE: L.PathOptions = {
  color: "#fff",
  weight: 3,
  opacity: 1,
  fillColor: "#fff",
  fillOpacity: 0.2,
};
// ── Per-kind geometry strategy ───────────────────────────────
// Captures the only three things that actually differ between area/road/poi
// editing: which Geoman draw tool to use, how to read geometry back off a
// layer, and how to merge a newly drawn shape into an existing geometry.

interface GeometryStrategy {
  geomanDrawType: "Polygon" | "Line" | "Marker";
  collectGeometry: (layer: L.Layer) => Geometry | null;
  mergeGeometry: (base: Geometry, drawn: GeoJSON.Geometry) => Geometry;
}

const STRATEGIES: Record<EntityKind, GeometryStrategy> = {
  area: {
    geomanDrawType: "Polygon",
    collectGeometry: collectPolygonGeometry,
    mergeGeometry: (base, drawn) => mergePolygon(base, drawn as GeoJSON.Polygon),
  },
  road: {
    geomanDrawType: "Line",
    collectGeometry: collectLineGeometry,
    mergeGeometry: (base, drawn) => mergeLine(base, drawn as GeoJSON.LineString),
  },
  poi: {
    geomanDrawType: "Marker",
    collectGeometry: () => null, // POI has no vertex/drag-existing mode
    mergeGeometry: (base, drawn) => mergePoint(base, drawn as GeoJSON.Point),
  },
};

/**
 * Shared cleanup for any "create from scratch" draw session (POI, Road,
 * Area). On Save, the session's layer(s) graduate into the persistent
 * draft set so the user can keep adding more before finally creating the
 * entity. On Cancel, only this session's layer(s) are discarded and
 * pendingGeometry is restored to the pre-session snapshot.
 */
function finalizeDrawSession({
  isCreatingFlow,
  drawnLayersRef,
  draftCommittedLayersRef,
  draftSessionSnapshotRef,
  map,
}: {
  isCreatingFlow: boolean;
  drawnLayersRef: React.RefObject<L.Layer[]>;
  draftCommittedLayersRef: React.RefObject<L.Layer[]>;
  draftSessionSnapshotRef: React.RefObject<Geometry | null>;
  map: L.Map;
}) {
  const { draftAction, setPendingGeometry, resetDraftAction } = useMapEditStore.getState();

  if (isCreatingFlow) {
    if (draftAction === "save") {
      draftCommittedLayersRef.current.push(...drawnLayersRef.current);
      drawnLayersRef.current = [];
    } else {
      drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      drawnLayersRef.current = [];
      setPendingGeometry(draftSessionSnapshotRef.current);
    }
  } else {
    // Editing an existing entity — always remove; bumpMapKey() remounts
    // the real layer on save, and the original layer is untouched on cancel.
    drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
    drawnLayersRef.current = [];
  }
  resetDraftAction();
}

export default function MapEditController({ entities, settings, selectedPOIIcon }: Props) {
  const map = useMap();
  const editState = useMapEditStore((s) => s.state);

  // Tracks layers drawn in 'draw' mode so they can be removed on cleanup.
  const drawnLayersRef = useRef<L.Layer[]>([]);

  // ── Draft-creation-only refs ───────────────────────────────
  // Layers "saved" (via toolbar Save) during a creation flow, persisted
  // across multiple draw sessions until the entity is created or the
  // whole flow is cancelled. Not used for editing existing entities.
  const draftCommittedLayersRef = useRef<L.Layer[]>([]);
  // Snapshot of pendingGeometryRef.current taken at the start of each
  // creation draw session, so Cancel can restore precisely to it.
  const draftSessionSnapshotRef = useRef<Geometry | null>(null);

  // ── Derived, typed sessions ──────────────────────────────
  // Each of these is null unless editState represents that specific kind
  // of session, collapsing the old string-keyed lookup tables (EDIT_
  // EXISTING_MODES / DRAW_MODES) into direct pattern matching on the
  // union — the compiler verifies every case is handled.

  /** Vertex-edit or whole-shape-drag on an already-saved area/road. */
  const existingEdit = useMemo(() => {
    if (editState.status !== "editing") return null;
    const { kind, entityId, action } = editState;
    if (kind === "area" && (action === "vertices" || action === "dragPolygon")) {
      return { kind, entityId, isDrag: action === "dragPolygon" };
    }
    if (kind === "road" && (action === "editLine" || action === "dragLine")) {
      return { kind, entityId, isDrag: action === "dragLine" };
    }
    return null;
  }, [editState]);

  /** Drawing a new shape — either merging into an existing entity, or
   *  (entityId null) drawing the very first shape of a brand new one. */
  const drawSession = useMemo(() => {
    if (editState.status === "editing") {
      const { kind, entityId, action } = editState;
      const isDrawAction =
        (kind === "area" && action === "drawPolygon") ||
        (kind === "road" && action === "drawLine") ||
        (kind === "poi" && action === "drawPOI");
      return isDrawAction ? { kind, entityId: entityId as string | null } : null;
    }
    if (editState.status === "creating" && editState.drawing) {
      return { kind: editState.kind, entityId: null as string | null };
    }
    return null;
  }, [editState]);

  /** Dragging existing point marker(s) directly — POI-only, no temp layer. */
  const moveSession = useMemo(() => {
    if (editState.status === "editing" && editState.kind === "poi" && editState.action === "movePOI") {
      return { entityId: editState.entityId };
    }
    return null;
  }, [editState]);

  const creatingKind = useCreatingKind();

  // ── Toolbar init (once) ─────────────────────────────────────
  useEffect(() => {
    if (!map.pm?.Toolbar) return;
    const vertexPane = map.getPane("edit-vertices") ?? map.createPane("edit-vertices");
    vertexPane.style.zIndex = "675";
    map.pm.setGlobalOptions({
      panes: { vertexPane: "edit-vertices" },
    });
    try {
      map.pm.addControls({
        position: "topleft",
        drawText: false,
        drawPolygon: false,
        drawCircle: false,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircleMarker: false,
        removalMode: false,
        editControls: false,
        snappable: false,
      });
    } catch { /* already initialised */ }
  }, [map]);

  // Escape key cancels whichever edit/draw mode is active.
  useEffect(() => {
    if (editState.status === "idle") return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") useMapEditStore.getState().cancelEdit(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editState.status]);

  // ── Draft creation flow lifecycle (any entity kind) ─────────
  useEffect(() => {
    if (!creatingKind) return;

    draftCommittedLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
    draftCommittedLayersRef.current = [];
    useMapEditStore.getState().setPendingGeometry(null);

    return () => {
      draftCommittedLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      draftCommittedLayersRef.current = [];
      useMapEditStore.getState().setPendingGeometry(null);
    };
  }, [creatingKind, map]);

  // ── Edit existing shape: vertices/drag (area), editLine/dragLine (road) ──
  useEffect(() => {
    if (!existingEdit) return;
    const { kind, entityId, isDrag } = existingEdit;

    const entity = entities[kind].find((e) => e.id === entityId);
    if (!entity) return;

    const strategy = STRATEGIES[kind];

    // Always edit a dedicated layer group with one editable Leaflet layer per
    // geometry part. A compound MultiPolygon/MultiLineString layer does not
    // expose its coordinate arrays as independently editable Geoman layers.
    const targetLayer = buildPartsLayerGroup(entity.geometry, EDIT_PREVIEW_STYLE).addTo(map);

    // Bring the layer(s) being edited to the top of the stack so they're
    // always clickable/draggable, even if another shape was rendered on
    // top of them originally.
    getSubLayers(targetLayer).forEach((l) => {
      if ("bringToFront" in l && typeof (l as L.Path).bringToFront === "function") {
        (l as L.Path).bringToFront();
      }
    });

    const handleChange = () => {
      useMapEditStore.getState().setPendingGeometry(strategy.collectGeometry(targetLayer));
    };

    let hintTooltip: L.Tooltip | undefined;
    let moveHint: ((event: MouseEvent) => void) | undefined;
    if (!isDrag) {
      hintTooltip = L.tooltip({
        direction: "bottom",
        offset: L.point(0, 22),
        className: "vertex-edit-hint",
        interactive: false,
      })
        .setContent("Ctrl-click a vertex to remove it")
        .setLatLng(map.getCenter())
        .addTo(map);
      moveHint = (event) => {
        const containerPoint = map.mouseEventToContainerPoint(event);
        hintTooltip?.setLatLng(map.containerPointToLatLng(containerPoint));
      };
      map.getContainer().addEventListener("mousemove", moveHint);
    }

    getSubLayers(targetLayer).forEach((l) => {
      if (isDrag) {
        (l as GeomanLayer).pm.enableLayerDrag();
        l.on("pm:dragend", handleChange);
      } else {
        (l as GeomanLayer).pm.enable({
          allowSelfIntersection: false,
          snappable: settings.snapDistance > 0,
          snapDistance: settings.snapDistance,
          removeVertexOn: "click contextmenu",
          removeVertexValidation: ({ event }) => {
            if (!event.originalEvent.ctrlKey) return false;
            event.originalEvent.preventDefault();
            return true;
          },
        });
        l.on("pm:edit", handleChange);
      }
    });

    return () => {
      getSubLayers(targetLayer).forEach((l) => {
        try {
          if (isDrag) (l as GeomanLayer).pm.disableLayerDrag();
          else (l as GeomanLayer).pm.disable();
        } catch { /* no-op */ }
        l.off("pm:edit", handleChange);
        l.off("pm:dragend", handleChange);
      });
      map.removeLayer(targetLayer);
      if (moveHint) map.getContainer().removeEventListener("mousemove", moveHint);
      if (hintTooltip) map.removeLayer(hintTooltip);
    };
  }, [existingEdit?.kind, existingEdit?.entityId, existingEdit?.isDrag, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Draw new / add-to-existing shape (area + road + poi, unified) ──
  useEffect(() => {
    if (!drawSession) return;
    const { kind, entityId } = drawSession;

    const strategy = STRATEGIES[kind];
    const entity = entityId ? entities[kind].find((e) => e.id === entityId) : undefined;
    const isCreatingFlow = !entityId;

    if (isCreatingFlow) {
      draftSessionSnapshotRef.current = useMapEditStore.getState().pendingGeometry;
    }

    // Roads show the same thin source-line context layer while drawing an
    // additional line onto an existing road — visual only, no handlers.
    const contextLayer = (kind === "road" && entity)
      ? L.geoJSON(entity.geometry, { style: () => EDIT_PREVIEW_STYLE, pane: "edit-overlay" }).addTo(map)
      : null;

    const drawOptions: Record<string, unknown> = { continueDrawing: false };
    if (kind === "poi") {
      drawOptions.markerStyle = { icon: createPOIIcon(selectedPOIIcon) };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.pm.enableDraw(strategy.geomanDrawType, drawOptions as any);

    const handleCreate = (event: GeomanCreateEvent) => {
      const drawnLayer = event.layer;
      drawnLayersRef.current.push(drawnLayer);
      const drawnGeom = drawnLayer.toGeoJSON().geometry;
      const base = useMapEditStore.getState().pendingGeometry ?? entity?.geometry;
      useMapEditStore.getState().setPendingGeometry(
        base ? strategy.mergeGeometry(base, drawnGeom) : drawnGeom
      );
    };

    map.on("pm:create", handleCreate);

    return () => {
      map.pm.disableDraw();
      map.off("pm:create", handleCreate);
      if (contextLayer) map.removeLayer(contextLayer);
      finalizeDrawSession({
        isCreatingFlow, drawnLayersRef, draftCommittedLayersRef, draftSessionSnapshotRef, map,
      });
    };
  }, [drawSession?.kind, drawSession?.entityId, map, selectedPOIIcon]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── POI: move existing point(s) — kept separate ─────────────
  useEffect(() => {
    if (!moveSession) return;
    const { entityId } = moveSession;
    const entity = entities.poi.find((e) => e.id === entityId);
    if (!entity) return;

    const layer = L.geoJSON(entity.geometry, {
      pointToLayer: (_feature, latlng) => L.marker(latlng, {
        icon: createPOIIcon(entity.icon ?? selectedPOIIcon),
        pane: "edit-overlay",
      }),
    }).addTo(map);

    const handleDragEnd = () => {
      const subLayers = getSubLayers(layer);
      const coords = subLayers.map((l) => {
        const ll = (l as L.Marker).getLatLng();
        return [ll.lng, ll.lat] as [number, number];
      });
      useMapEditStore.getState().setPendingGeometry(
        coords.length === 1
          ? { type: "Point", coordinates: coords[0]! }
          : { type: "MultiPoint", coordinates: coords }
      );
    };

    getSubLayers(layer).forEach((l) => {
      (l as GeomanLayer).pm.enableLayerDrag();
      l.on("pm:dragend", handleDragEnd);
    });

    return () => {
      getSubLayers(layer).forEach((l) => {
        try { (l as GeomanLayer).pm.disableLayerDrag(); } catch { /* no-op */ }
        l.off("pm:dragend", handleDragEnd);
      });
      map.removeLayer(layer);
    };
  }, [moveSession?.entityId, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}