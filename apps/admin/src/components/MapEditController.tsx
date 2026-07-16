import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Geometry } from "geojson";
import type { EntityRecord } from "../db/types";
import type { EditMode } from "../types";
import "@geoman-io/leaflet-geoman-free";

type GeomanLayer = L.Layer & {
  pm: {
    enable: (opts?: { allowSelfIntersection?: boolean }) => void;
    disable: () => void;
    enableLayerDrag: () => void;
    disableLayerDrag: () => void;
  };
  toGeoJSON: () => GeoJSON.Feature;
};

type GeomanCreateEvent = {
  layer: L.Layer & { toGeoJSON: () => GeoJSON.Feature };
};

interface Props {
  editMode: EditMode;
  editingEntityId: string | null;
  layerRegistry: React.RefObject<Map<string, L.Layer>>;
  pendingGeometryRef: React.RefObject<Geometry | null>;
  entities: EntityRecord[];
  onCancelEdit: () => void;
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
      coordinates: sub.map(
        (l) => ((l as GeomanLayer).toGeoJSON().geometry as GeoJSON.Polygon).coordinates
      ),
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
    coordinates: sub.map(
      (l) => ((l as GeomanLayer).toGeoJSON().geometry as GeoJSON.LineString).coordinates
    ),
  };
}

// Reads current positions from point marker(s) after dragging.
// Returns Point for a single marker, MultiPoint for several.
function collectPointGeometry(layer: L.Layer): Geometry | null {
  const subLayers = getSubLayers(layer);
  if (!subLayers.length) return null;
  const coords = subLayers.map((l) => {
    const ll = (l as L.Marker).getLatLng();
    return [ll.lng, ll.lat] as [number, number];
  });
  if (coords.length === 1) return { type: "Point", coordinates: coords[0]! };
  return { type: "MultiPoint", coordinates: coords };
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

export default function MapEditController({
  editMode,
  editingEntityId,
  layerRegistry,
  pendingGeometryRef,
  entities,
  onCancelEdit,
}: Props) {
  const map = useMap();
  // Tracks layers drawn in 'draw' mode so they can be removed on cleanup.
  const drawnLayersRef = useRef<L.Layer[]>([]);

  // Ensure Geoman's toolbar/controls are added to the map so custom
  // toolbar buttons created elsewhere are visible.
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
      });
      map.pm.setGlobalOptions({ snappable: true, snapDistance: 10 /* px */ });
    } catch { /* already initialised */ }
  }, [map]);

  // Escape key cancels whichever edit mode is active.
  useEffect(() => {
    if (editMode === "idle") return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancelEdit(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editMode, onCancelEdit]);

  // ── Area: vertex editing ──────────────────────────────────

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

  // ── Area: drag / move ─────────────────────────────────────
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

  // ── Area: draw additional polygon ─────────────────────────
  // Each completed polygon is automatically merged into the entity's geometry as a MultiPolygon.
  useEffect(() => {
    if (editMode !== "draw" || !editingEntityId) return;

    const entity = entities.find((e) => e.id === editingEntityId);
    if (!entity) return;

    map.pm.enableDraw("Polygon", { continueDrawing: false });
    const handleCreate = (event: GeomanCreateEvent) => {
      const drawnLayer = event.layer;
      drawnLayersRef.current.push(drawnLayer);
      const drawnGeom = drawnLayer.toGeoJSON().geometry as GeoJSON.Polygon;
      const base = pendingGeometryRef.current ?? entity.geometry;
      pendingGeometryRef.current = mergePolygon(base, drawnGeom);
    };
    map.on("pm:create", handleCreate);

    return () => {
      map.pm.disableDraw();
      map.off("pm:create", handleCreate);
      // Remove all drawn layers — on cancel these disappear, on save
      // bumpMapKey() remounts the GeoJSON with the merged MultiPolygon from DB.
      drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      drawnLayersRef.current = [];
    };
  }, [editMode, editingEntityId, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Road: all three line edit modes ──────────────────────
  // All road modes share a temporary source line layer that replaces the
  // buffered polygon (which MapView hides by excluding the entity from
  // roadFeatures while a road edit mode is active). The temp layer shows
  // the raw LineString/MultiLineString for direct editing.
  useEffect(() => {
    const isRoadMode = editMode === "editLine" || editMode === "dragLine" || editMode === "drawLine";
    if (!isRoadMode || !editingEntityId) return;

    const entity = entities.find((e) => e.id === editingEntityId);
    if (!entity) return;

    // Create a temporary layer showing the source lines (not the buffer).
    const tempLayer = L.geoJSON(entity.geometry, {
      style: () => SOURCE_LINE_STYLE,
    }).addTo(map);

    if (editMode === "editLine") {
      const handleEdit = () => { pendingGeometryRef.current = collectLineGeometry(tempLayer); };
      tempLayer.getLayers().forEach((l) => {
        (l as GeomanLayer).pm.enable({ allowSelfIntersection: false });
        l.on("pm:edit", handleEdit);
      });
    }

    if (editMode === "dragLine") {
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
        const base = pendingGeometryRef.current ?? entity.geometry;
        pendingGeometryRef.current = mergeLine(base, drawnGeom);
      };
      map.on("pm:create", handleCreate);
    }

    return () => {
      // Disable all Geoman interactions on the temp layer before removing it.
      tempLayer.getLayers().forEach((l) => {
        try { (l as GeomanLayer).pm.disable(); } catch { /* no-op */ }
        try { (l as GeomanLayer).pm.disableLayerDrag(); } catch { /* no-op */ }
        l.off("pm:edit");
        l.off("pm:dragend");
      });

      if (editMode === "drawLine") {
        map.pm.disableDraw();
        map.off("pm:create");
        drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
        drawnLayersRef.current = [];
      }

      // Always remove the temp source line layer on cleanup.
      // On save, bumpMapKey() remounts the road with its buffer from DB.
      // On cancel, the road was already excluded from roadFeatures so
      // nothing visible is lost until mapKey bumps on the next interaction.
      map.removeLayer(tempLayer);
    };
  }, [editMode, editingEntityId, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── POI: drag existing point markers ─────────────────────
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
      pendingGeometryRef.current = collectPointGeometry(layer);
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

  // ── POI: draw additional point, merging into MultiPoint ───
  useEffect(() => {
    if (editMode !== "drawPOI" || !editingEntityId) return;

    const entity = entities.find((e) => e.id === editingEntityId);
    if (!entity) return;

    map.pm.enableDraw("Marker", { continueDrawing: false });

    const handleCreate = (event: GeomanCreateEvent) => {
      const drawnLayer = event.layer;
      drawnLayersRef.current.push(drawnLayer);
      const drawnGeom = drawnLayer.toGeoJSON().geometry as GeoJSON.Point;
      const base = pendingGeometryRef.current ?? entity.geometry;
      pendingGeometryRef.current = mergePoint(base, drawnGeom);
    };

    map.on("pm:create", handleCreate);

    return () => {
      map.pm.disableDraw();
      map.off("pm:create", handleCreate);
      // Remove drawn markers. On save, bumpMapKey() remounts with merged geometry.
      drawnLayersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      drawnLayersRef.current = [];
    };
  }, [editMode, editingEntityId, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}