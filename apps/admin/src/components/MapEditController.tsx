import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Geometry } from "geojson";
import type { EntityRecord, SettingsRecord } from "../db/types";
import type { EditMode, EntityKind } from "../types";
import "@geoman-io/leaflet-geoman-free";
import { createPOIIcon } from "../utils/Icons";

type GeomanLayer = L.Layer & {
  pm: {
    enable: (opts?: { allowSelfIntersection?: boolean }) => void;
    disable: () => void;
    enableLayerDrag: () => void;
    disableLayerDrag: () => void;
  };
  toGeoJSON: () => GeoJSON.Feature;
};

type GeomanCreateEvent = { layer: L.Layer & { toGeoJSON: () => GeoJSON.Feature } };

interface Props {
  editMode: EditMode;
  editingEntityId: string | null;
  layerRegistry: React.RefObject<Map<string, L.Layer>>;
  pendingGeometryRef: React.RefObject<Geometry | null>;
  draftActionRef: React.RefObject<"save" | "cancel" | null>;
  creatingKind: EntityKind | null;
  entities: EntityRecord[];
  onCancelEdit: () => void;
  settings: SettingsRecord;
  selectedPOIIcon: string; // icon name, e.g. "toilet"
}

function getSubLayers(layer: L.Layer): L.Layer[] {
  return "getLayers" in layer ? (layer as L.GeoJSON).getLayers() : [layer];
}

// Reads current polygon geometry from a layer after vertex editing.
function collectPolygonGeometry(layer: L.Layer): Geometry | null {
  if ("getLayers" in layer) {
    const sub = (layer as L.GeoJSON).getLayers();
    if (!sub.length) return null;
    if (sub.length === 1) return (sub[0] as GeomanLayer).toGeoJSON().geometry;
    return {
      type: "MultiPolygon",
      coordinates: sub.map((l) => ((l as GeomanLayer).toGeoJSON().geometry as GeoJSON.Polygon).coordinates),
    };
  }
  return (layer as GeomanLayer).toGeoJSON().geometry;
}

// Reads current line geometry from the temporary source line layer group.
function collectLineGeometry(layer: L.GeoJSON): Geometry | null {
  const sub = layer.getLayers();
  if (!sub.length) return null;
  if (sub.length === 1) return (sub[0] as GeomanLayer).toGeoJSON().geometry;
  return {
    type: "MultiLineString",
    coordinates: sub.map((l) => ((l as GeomanLayer).toGeoJSON().geometry as GeoJSON.LineString).coordinates),
  };
}

// Restores a Leaflet layer to its original geometry.
// Called in effect cleanup for both save and cancel paths. On save,
// bumpMapKey() immediately remounts the layer with the correct saved geometry,
// so the brief restore is invisible to the user.
function restoreLayer(layer: L.Layer, original: Geometry): void {
  if ("clearLayers" in layer) {
    const gl = layer as L.GeoJSON;
    gl.clearLayers();
    gl.addData(original as GeoJSON.GeoJsonObject);
    return;
  }
  const restored = L.geoJSON(original);
  const rl = restored.getLayers()[0] as L.Path & { getLatLngs?: () => unknown };
  const path = layer as L.Path & { setLatLngs?: (ll: unknown) => void };
  if (rl?.getLatLngs && path.setLatLngs) {
    path.setLatLngs(rl.getLatLngs());
    path.redraw();
  }
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

// Visual style for the temporary source line layer shown during road editing.
// Shows the raw LineString instead of the buffered polygon.
const SOURCE_LINE_STYLE = { color: "#3b82f6", weight: 3, opacity: 1, fillOpacity: 0 };

/**
 * Shared cleanup for any "create from scratch" draw session (POI, Road, and Area). 
 * On Save, the session's layer(s) graduate into the persistent
 * draft set so the user can keep adding more before finally creating the
 * entity. On Cancel, only this session's layer(s) are discarded and
 * pendingGeometryRef is restored to the pre-session snapshot.
 */
function finalizeDrawSession({
  isCreatingFlow,
  drawnLayersRef,
  draftCommittedLayersRef,
  draftSessionSnapshotRef,
  pendingGeometryRef,
  draftActionRef,
  map,
}: {
  isCreatingFlow: boolean;
  drawnLayersRef: React.RefObject<L.Layer[]>;
  draftCommittedLayersRef: React.RefObject<L.Layer[]>;
  draftSessionSnapshotRef: React.RefObject<Geometry | null>;
  pendingGeometryRef: React.RefObject<Geometry | null>;
  draftActionRef: React.RefObject<"save" | "cancel" | null>;
  map: L.Map;
}) {
  if (isCreatingFlow) {
    if (draftActionRef.current === "save") {
      draftCommittedLayersRef.current.push(...drawnLayersRef.current);
      drawnLayersRef.current = [];
    } else {
      drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      drawnLayersRef.current = [];
      pendingGeometryRef.current = draftSessionSnapshotRef.current;
    }
  } else {
    // Editing an existing entity — always remove; bumpMapKey() remounts
    // the real layer on save, and the original layer is untouched on cancel.
    drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
    drawnLayersRef.current = [];
  }
  draftActionRef.current = null;
}

export default function MapEditController({
  editMode,
  editingEntityId,
  layerRegistry,
  pendingGeometryRef,
  draftActionRef,
  creatingKind,
  entities,
  onCancelEdit,
  settings,
  selectedPOIIcon,
}: Props) {
  const map = useMap();
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

  // ── Toolbar init (once) ─────────────────────────────────────
  useEffect(() => {
    if (!map.pm?.Toolbar) return;
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

  // Applies the configurable snap settings whenever they change.
  useEffect(() => {
    map.pm.setGlobalOptions({
      snappable: settings.snapDistance > 0,
      snapDistance: settings.snapDistance,
    });
  }, [map, settings.snapDistance]);

  // Escape key cancels whichever edit/draw mode is active.
  useEffect(() => {
    if (editMode === "idle") return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelEdit(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editMode, onCancelEdit]);

  // ── Draft creation flow lifecycle ─────────────
  // Rising edge: fresh start — defensively clear any stale draft state.
  // Falling edge: flow ended (entity created OR cancelled) — remove every
  // committed draft layer. On success this avoids duplicate markers once
  // bumpMapKey() renders the real, DB-backed entity.
  useEffect(() => {
    if (!creatingKind) return;

    draftCommittedLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
    draftCommittedLayersRef.current = [];
    pendingGeometryRef.current = null;

    return () => {
      draftCommittedLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      draftCommittedLayersRef.current = [];
      pendingGeometryRef.current = null;
    };
  }, [creatingKind, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Area: vertex editing (existing entity only) ──────────────────────────────────

  // Vertex edit mode — enables Geoman vertex handles on the entity's layer.
  // Supports both Polygon (single layer) and MultiPolygon (layer group).
  useEffect(() => {
    if (editMode !== "vertices" || !editingEntityId) return;

    const layer = layerRegistry.current.get(editingEntityId);
    const entity = entities.find((e) => e.id === editingEntityId);
    if (!layer || !entity) return;

    const original = entity.geometry;
    const handleEdit = () => { pendingGeometryRef.current = collectPolygonGeometry(layer); };
    getSubLayers(layer).forEach((l) => {
      (l as GeomanLayer).pm.enable({ allowSelfIntersection: false });
      l.on("pm:edit", handleEdit);
    });

    return () => {
      getSubLayers(layer).forEach((l) => {
        try { (l as GeomanLayer).pm.disable(); } catch { /* no-op */ }
        l.off("pm:edit", handleEdit);
      });
      restoreLayer(layer, original);
    };
  }, [editMode, editingEntityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Area: drag / move (existing entity only) ───────────────
  useEffect(() => {
    if (editMode !== "drag" || !editingEntityId) return;

    const layer = layerRegistry.current.get(editingEntityId);
    const entity = entities.find((e) => e.id === editingEntityId);
    if (!layer || !entity) return;

    const original = entity.geometry;
    const handleDragEnd = () => { pendingGeometryRef.current = collectPolygonGeometry(layer); };
    getSubLayers(layer).forEach((l) => {
      (l as GeomanLayer).pm.enableLayerDrag();
      l.on("pm:dragend", handleDragEnd);
    });

    return () => {
      getSubLayers(layer).forEach((l) => {
        try { (l as GeomanLayer).pm.disableLayerDrag(); } catch { /* no-op */ }
        l.off("pm:dragend", handleDragEnd);
      });
      restoreLayer(layer, original);
    };
  }, [editMode, editingEntityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Area: draw polygon — add-to-existing AND brand new creation ──
  // draw always uses Geoman's Polygon tool. When editingEntityId is set,
  // each drawn polygon merges into the existing entity's geometry. When
  // null (brand new area), the first polygon becomes the geometry and
  // subsequent ones merge, same as roads/POIs during creation.
  useEffect(() => {
    if (editMode !== "draw") return;

    const entity = editingEntityId ? entities.find((e) => e.id === editingEntityId) : undefined;
    if (editingEntityId && !entity) return;

    const isCreatingFlow = !editingEntityId;
    if (isCreatingFlow) {
      draftSessionSnapshotRef.current = pendingGeometryRef.current;
    }

    map.pm.enableDraw("Polygon", { continueDrawing: false });

    const handleCreate = (event: GeomanCreateEvent) => {
      const drawnLayer = event.layer;
      drawnLayersRef.current.push(drawnLayer);
      const drawnGeom = drawnLayer.toGeoJSON().geometry as GeoJSON.Polygon;
      const base = pendingGeometryRef.current ?? entity?.geometry;
      // No base yet (brand new area) → the drawn polygon is the geometry.
      pendingGeometryRef.current = base ? mergePolygon(base, drawnGeom) : drawnGeom;
    };

    map.on("pm:create", handleCreate);

    return () => {
      map.pm.disableDraw();
      map.off("pm:create", handleCreate);
      finalizeDrawSession({
        isCreatingFlow,
        drawnLayersRef,
        draftCommittedLayersRef,
        draftSessionSnapshotRef,
        pendingGeometryRef,
        draftActionRef,
        map,
      });
    };
  }, [editMode, editingEntityId, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Road: editLine / dragLine / drawLine ────────────────────
  // editLine and dragLine always require an existing entity. drawLine works
  // both ways: adding a line to an existing road (shows source-line context
  // via a temp layer) and drawing the very first line(s) of a brand new
  // road (editingEntityId null — no temp layer, nothing exists yet).
  useEffect(() => {
    const isRoadMode = editMode === "editLine" || editMode === "dragLine" || editMode === "drawLine";
    if (!isRoadMode) return;

    const requiresExistingEntity = editMode === "editLine" || editMode === "dragLine";
    if (requiresExistingEntity && !editingEntityId) return;

    const entity = editingEntityId ? entities.find((e) => e.id === editingEntityId) : undefined;
    if (requiresExistingEntity && !entity) return;

    const isCreatingFlow = editMode === "drawLine" && !editingEntityId;
    if (isCreatingFlow) {
      draftSessionSnapshotRef.current = pendingGeometryRef.current;
    }

    // Show existing source lines (thin, unstyled) in place of the buffered
    // polygon — only relevant when there's an entity to show.
    const tempLayer = entity
      ? L.geoJSON(entity.geometry, { style: () => SOURCE_LINE_STYLE }).addTo(map)
      : null;

    if (editMode === "editLine" && tempLayer) {
      const handleEdit = () => { pendingGeometryRef.current = collectLineGeometry(tempLayer); };
      tempLayer.getLayers().forEach((l) => {
        (l as GeomanLayer).pm.enable({ allowSelfIntersection: false });
        l.on("pm:edit", handleEdit);
      });
    }

    if (editMode === "dragLine" && tempLayer) {
      const handleDragEnd = () => { pendingGeometryRef.current = collectLineGeometry(tempLayer); };
      tempLayer.getLayers().forEach((l) => {
        (l as GeomanLayer).pm.enableLayerDrag();
        l.on("pm:dragend", handleDragEnd);
      });
    }

    if (editMode === "drawLine") {
      map.pm.enableDraw("Line", { continueDrawing: false });
      const handleCreate = (event: GeomanCreateEvent) => {
        const drawnLayer = event.layer;
        drawnLayersRef.current.push(drawnLayer);
        const drawnGeom = drawnLayer.toGeoJSON().geometry as GeoJSON.LineString;
        const base = pendingGeometryRef.current ?? entity?.geometry;
        // No base yet (brand new road) → the drawn line is the geometry.
        pendingGeometryRef.current = base ? mergeLine(base, drawnGeom) : drawnGeom;
      };
      map.on("pm:create", handleCreate);
    }

    return () => {
      if (tempLayer) {
        // Disable all Geoman interactions on the temp layer before removing it.
        tempLayer.getLayers().forEach((l) => {
          try { (l as GeomanLayer).pm.disable(); } catch { /* no-op */ }
          try { (l as GeomanLayer).pm.disableLayerDrag(); } catch { /* no-op */ }
          l.off("pm:edit");
          l.off("pm:dragend");
        });
        map.removeLayer(tempLayer);
      }

      if (editMode === "drawLine") {
        map.pm.disableDraw();
        map.off("pm:create");
        finalizeDrawSession({
          isCreatingFlow,
          drawnLayersRef,
          draftCommittedLayersRef,
          draftSessionSnapshotRef,
          pendingGeometryRef,
          draftActionRef,
          map,
        });
      }
    };
  }, [editMode, editingEntityId, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── POI: move existing point(s) — existing entity only ─────
  // Enables Geoman drag on the marker(s) that are already on the map.
  // Snapshots original positions so cancel can restore them without a remount.
  useEffect(() => {
    if (editMode !== "movePOI" || !editingEntityId) return;

    const layer = layerRegistry.current.get(editingEntityId);
    const entity = entities.find((e) => e.id === editingEntityId);
    if (!layer || !entity) return;

    // Snapshot original LatLng per sub-layer for cancel restore.
    const originalPositions = new Map<L.Layer, L.LatLng>();
    const handleDragEnd = () => {
      const subLayers = getSubLayers(layer);
      const coords = subLayers.map((l) => {
        const ll = (l as L.Marker).getLatLng();
        return [ll.lng, ll.lat] as [number, number];
      });
      pendingGeometryRef.current = coords.length === 1
        ? { type: "Point", coordinates: coords[0]! }
        : { type: "MultiPoint", coordinates: coords };
    };

    getSubLayers(layer).forEach((l) => {
      originalPositions.set(l, (l as L.Marker).getLatLng());
      (l as GeomanLayer).pm.enableLayerDrag();
      l.on("pm:dragend", handleDragEnd);
    });

    return () => {
      getSubLayers(layer).forEach((l) => {
        try { (l as GeomanLayer).pm.disableLayerDrag(); } catch { /* no-op */ }
        l.off("pm:dragend", handleDragEnd);
        // Restore original position on cancel. On save, bumpMapKey()
        // remounts the layer so this restore is immediately overridden.
        const orig = originalPositions.get(l);
        if (orig) (l as L.Marker).setLatLng(orig);
      });
    };
  }, [editMode, editingEntityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── POI: draw a point — both add-to-existing AND brand new creation ──
  useEffect(() => {
    if (editMode !== "drawPOI") return;

    const isCreatingFlow = !editingEntityId;
    if (isCreatingFlow) {
      // Snapshot before this session's changes so Cancel can restore precisely.
      draftSessionSnapshotRef.current = pendingGeometryRef.current;
    }

    const entity = editingEntityId ? entities.find((e) => e.id === editingEntityId) : undefined;

    map.pm.enableDraw("Marker", {
      continueDrawing: false,
      markerStyle: { icon: createPOIIcon(selectedPOIIcon) }
    });

    const handleCreate = (event: GeomanCreateEvent) => {
      const drawnLayer = event.layer;
      drawnLayersRef.current.push(drawnLayer);
      const drawnGeom = drawnLayer.toGeoJSON().geometry as GeoJSON.Point;
      const base = pendingGeometryRef.current ?? entity?.geometry;
      pendingGeometryRef.current = base ? mergePoint(base, drawnGeom) : drawnGeom;
    };

    map.on("pm:create", handleCreate);

    return () => {
      map.pm.disableDraw();
      map.off("pm:create", handleCreate);
      finalizeDrawSession({
        isCreatingFlow,
        drawnLayersRef,
        draftCommittedLayersRef,
        draftSessionSnapshotRef,
        pendingGeometryRef,
        draftActionRef,
        map,
      });
    };
  }, [editMode, editingEntityId, map, selectedPOIIcon]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}