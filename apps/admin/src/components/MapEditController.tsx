import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Geometry } from "geojson";
import type { EntityRecord } from "../db/types";
import type { EditMode } from "../types";
import "@geoman-io/leaflet-geoman-free";

type GeomanLayer = L.Layer & {
  pm: {
    enable:           (opts?: { allowSelfIntersection?: boolean }) => void;
    disable:          () => void;
    enableLayerDrag:  () => void;
    disableLayerDrag: () => void;
  };
  toGeoJSON: () => GeoJSON.Feature;
};

type GeomanCreateEvent = {
  layer: L.Layer & { toGeoJSON: () => GeoJSON.Feature };
};

interface Props {
  editMode:            EditMode;
  editingEntityId:     string | null;
  layerRegistry:       React.RefObject<Map<string, L.Layer>>;
  pendingGeometryRef:  React.MutableRefObject<Geometry | null>;
  entities:            EntityRecord[];
  onCancelEdit:        () => void;
}

// Returns all editable sub-layers — handles both single Polygon (L.Path)
// and MultiPolygon (L.GeoJSON layer group containing multiple L.Polygon sub-layers).
function getSubLayers(layer: L.Layer): L.Layer[] {
  return "getLayers" in layer
    ? (layer as L.GeoJSON).getLayers()
    : [layer];
}

// Reads the current geometry from a layer after Geoman has edited it.
function collectGeometry(layer: L.Layer): Geometry | null {
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
function mergePolygon(
  base: Geometry,
  newPoly: GeoJSON.Polygon
): GeoJSON.MultiPolygon {
  if (base.type === "Polygon") {
    return {
      type: "MultiPolygon",
      coordinates: [(base as GeoJSON.Polygon).coordinates, newPoly.coordinates],
    };
  }
  if (base.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: [...(base as GeoJSON.MultiPolygon).coordinates, newPoly.coordinates],
    };
  }
  return { type: "MultiPolygon", coordinates: [newPoly.coordinates] };
}

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
        snappable: false,
      });
    } catch {
      // Controls already exist or Geoman isn't fully initialized yet.
    }
  }, [map]);

  // Escape key cancels whichever edit mode is active.
  useEffect(() => {
    if (editMode === "idle") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancelEdit();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [editMode, onCancelEdit]);

  // Vertex edit mode — enables Geoman vertex handles on the entity's layer.
  // Supports both Polygon (single layer) and MultiPolygon (layer group).
  useEffect(() => {
    if (editMode !== "vertices" || !editingEntityId) return;

    const layer = layerRegistry.current.get(editingEntityId);
    const entity = entities.find((e) => e.id === editingEntityId);
    if (!layer || !entity) return;

    const original = entity.geometry;

    const handleEdit = () => {
      pendingGeometryRef.current = collectGeometry(layer);
    };

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

  // Drag mode — enables moving the whole polygon by dragging.
  useEffect(() => {
    if (editMode !== "drag" || !editingEntityId) return;

    const layer = layerRegistry.current.get(editingEntityId);
    const entity = entities.find((e) => e.id === editingEntityId);
    if (!layer || !entity) return;

    const original = entity.geometry;

    const handleDragEnd = () => {
      pendingGeometryRef.current = collectGeometry(layer);
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
      restoreLayer(layer, original);
    };
  }, [editMode, editingEntityId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw mode — activates Geoman polygon drawing. Each completed polygon is
  // automatically merged into the entity's geometry as a MultiPolygon.
  useEffect(() => {
    if (editMode !== "draw" || !editingEntityId) return;

    const entity = entities.find((e) => e.id === editingEntityId);
    if (!entity) return;

    map.pm.enableDraw("Polygon", { continueDrawing: false });

    const handleCreate = (event: GeomanCreateEvent) => {
      const drawnLayer = event.layer;
      drawnLayersRef.current.push(drawnLayer);
      const drawnGeometry = drawnLayer.toGeoJSON().geometry as GeoJSON.Polygon;
      const base = pendingGeometryRef.current ?? entity.geometry;
      pendingGeometryRef.current = mergePolygon(base, drawnGeometry);
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

  return null;
}