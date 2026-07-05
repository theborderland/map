import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { CREATING_LAYER_ID, useMapStore } from "../store/mapStore";
import type { StyleRecord } from "../db/types";

const DEFAULT_COLOR = "#2563eb";

interface Props {
  layerRegistry: React.MutableRefObject<Map<string, L.Layer>>;
  creatingLayersRef: React.MutableRefObject<L.Layer[]>;
  styles: StyleRecord[];
}

export default function MapCreateHandler({ layerRegistry, creatingLayersRef, styles }: Props) {
  const map = useMap();
  const { isCreating, createEntityKind, creatingStyleType, setPendingGeometry } = useMapStore();

  // Enable/disable draw mode when create state changes.
  // continueDrawing lets the user draw multiple shapes before saving (not needed for POIs).
  useEffect(() => {
    if (!isCreating || !createEntityKind) {
      map.pm.disableDraw();
      return;
    }
    const modeMap = { area: "Polygon", road: "Line", poi: "Marker" } as const;
    map.pm.enableDraw(modeMap[createEntityKind], {
      continueDrawing: createEntityKind !== "poi",
    });

    return () => { map.pm.disableDraw(); };
  }, [isCreating, createEntityKind, map]);

  // Capture each drawn layer, apply style, and accumulate all shapes into the
  // correct geometry type. Roads and areas merge into multi-geometries.
  useEffect(() => {
    const handleCreate = (e: any) => {
      if (!isCreating) return;

      const layer = e.layer as L.Path & L.Layer & { toGeoJSON: () => GeoJSON.Feature };

      // Apply the selected style immediately for visual feedback while drawing.
      const style = styles.find((s) => s.type === creatingStyleType);
      if (style && typeof (layer as any).setStyle === "function") {
        (layer as any).setStyle({
          color:       style.borderColor || DEFAULT_COLOR,
          weight:      style.borderWidth ?? 2,
          dashArray:   style.dashPattern || undefined,
          fillColor:   style.fillColor   || DEFAULT_COLOR,
          fillOpacity: style.fillOpacity ?? 0.35,
        });
      }

      // Track all drawn layers so they can all be removed on cancel/save.
      creatingLayersRef.current.push(layer);
      layerRegistry.current.set(CREATING_LAYER_ID, layer);

      if (createEntityKind === "area") {
        // Accumulate all drawn polygons; normalization to Polygon/MultiPolygon
        // happens at save time in useEntityForm.normalizeGeometry.
        const allCoords = creatingLayersRef.current
          .map((l) => (l as L.Layer & { toGeoJSON: () => GeoJSON.Feature }).toGeoJSON().geometry)
          .filter((g): g is GeoJSON.Polygon => g.type === "Polygon")
          .map((g) => g.coordinates);

        setPendingGeometry(
          allCoords.length === 1
            ? { type: "Polygon", coordinates: allCoords[0]! }
            : { type: "MultiPolygon", coordinates: allCoords }
        );
      } else if (createEntityKind === "road") {
        // Accumulate all drawn lines; normalization to LineString/MultiLineString
        // (and fire road → always MultiLineString) happens in normalizeGeometry.
        const allCoords = creatingLayersRef.current
          .map((l) => (l as L.Layer & { toGeoJSON: () => GeoJSON.Feature }).toGeoJSON().geometry)
          .filter((g): g is GeoJSON.LineString => g.type === "LineString")
          .map((g) => g.coordinates);

        setPendingGeometry(
          allCoords.length === 1
            ? { type: "LineString", coordinates: allCoords[0]! }
            : { type: "MultiLineString", coordinates: allCoords }
        );
      } else {
        // POIs are always a single point — replace, don't accumulate.
        setPendingGeometry(layer.toGeoJSON().geometry);
      }
    };

    map.on("pm:create", handleCreate);
    return () => { map.off("pm:create", handleCreate); };
  }, [map, isCreating, createEntityKind, creatingStyleType, styles, layerRegistry, creatingLayersRef, setPendingGeometry]);

  return null;
}