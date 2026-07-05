import { useMap } from "react-leaflet";
import { useMapStore, CREATING_LAYER_ID } from "../store/mapStore";
import { useEffect, useRef } from "react";
import L from "leaflet";
import type { StyleRecord } from "../db/types";

const BUTTONS = {
  EDIT_SHAPE: "editVertices-custom",
  MOVE_SHAPE: "dragSelected-custom",
  DELETE_SHAPE: "deleteSelected-custom",
};

const DEFAULT_COLOR = "#2563eb";

type GeomanLayer = L.Layer & {
  pm: {
    enable: (opts?: { allowSelfIntersection?: boolean }) => void;
    disable: () => void;
    enableLayerDrag: () => void;
    disableLayerDrag: () => void;
  };
  toGeoJSON: () => GeoJSON.Feature;
};

export default function MapCustomControls({
  selectedEntityId,
  selectedEntityStyleType,
  layerRegistry,
  creatingLayersRef,
  styles,
}: {
  selectedEntityId: string | null;
  selectedEntityStyleType: string | null;
  layerRegistry: React.MutableRefObject<Map<string, L.Layer>>;
  creatingLayersRef: React.MutableRefObject<L.Layer[]>;
  styles: StyleRecord[];
}) {
  const map = useMap();
  const { isEditing, isCreating, originalGeometry, setPendingGeometry } = useMapStore();
  // Tracks whether the toolbar is currently in vertices-edit or drag mode.
  const activeMode = useRef<"vertices" | "drag" | null>(null);
  // Indicates whether we entered a create flow so cleanup can remove temp layers.
  const wasCreating = useRef(false);

  // Track whether the session entered create mode so cleanup can remove temporary creation layers later.
  useEffect(() => {
    if (isCreating) wasCreating.current = true;
  }, [isCreating]);

  // Always-current ref so button onClick closures never go stale.
  // Keep current props in a ref so toolbar callbacks can access fresh values without re-registering.
  const ref = useRef({
    selectedEntityId,
    selectedEntityStyleType,
    layerRegistry,
    creatingLayersRef,
    setPendingGeometry,
    isCreating,
    styles,
  });

  useEffect(() => {
    ref.current = {
      selectedEntityId,
      selectedEntityStyleType,
      layerRegistry,
      creatingLayersRef,
      setPendingGeometry,
      isCreating,
      styles,
    };
  });

  // Resolves which layer the toolbar buttons should act on:
  // edit mode → selected entity layer, create mode → last drawn temp layer.
  const getEffectiveLayer = (): GeomanLayer | undefined => {
    const { selectedEntityId: id, layerRegistry: reg, isCreating: creating } = ref.current;
    const effectiveId = id ?? (creating ? CREATING_LAYER_ID : null);
    return effectiveId ? (reg.current.get(effectiveId) as GeomanLayer | undefined) : undefined;
  };

  // Cleanup when editing ends (both save and cancel).
  useEffect(() => {
    if (isEditing) return;

    const { layerRegistry: reg, creatingLayersRef: layersRef } = ref.current;
    const wereCreating = wasCreating.current;

    const effectiveId = selectedEntityId ?? (wereCreating ? CREATING_LAYER_ID : null);
    const layer = effectiveId ? (reg.current.get(effectiveId) as GeomanLayer | undefined) : undefined;

    if (layer) {
      layer.pm.disable();
      layer.pm.disableLayerDrag();
      (layer as L.Layer).off("pm:edit");
      (layer as L.Layer).off("pm:dragend");
    }

    activeMode.current = null;
    map.pm.Toolbar.buttons[BUTTONS.EDIT_SHAPE]?.toggle(false);
    map.pm.Toolbar.buttons[BUTTONS.MOVE_SHAPE]?.toggle(false);

    if (wereCreating) {
      // Remove all layers drawn during create mode (fire roads may have several).
      layersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      layersRef.current = [];
      reg.current.delete(CREATING_LAYER_ID);
      wasCreating.current = false;
    }

    // Restore original geometry on cancel (originalGeometry is set by cancelEditing,
    // cleared by stopEditing — so this block only runs on cancel, never on save).
    if (originalGeometry && !wereCreating) {
      const geoJsonLayer = layer as unknown as L.GeoJSON;
      if (typeof geoJsonLayer?.clearLayers === "function") {
        geoJsonLayer.clearLayers();
        geoJsonLayer.addData(originalGeometry as GeoJSON.GeoJsonObject);
      } else if (originalGeometry.type === "Point") {
        const coords = (originalGeometry as GeoJSON.Point).coordinates;
        const marker = layer as unknown as L.CircleMarker;
        marker.setLatLng(L.latLng(coords[1]!, coords[0]!));
        marker.redraw();
      } else {
        const path = layer as unknown as L.Path & {
          setLatLngs: (ll: L.LatLngExpression[] | L.LatLngExpression[][]) => void;
        };
        const restored = L.geoJSON(originalGeometry);
        const rl = restored.getLayers()[0] as L.Path & {
          getLatLngs: () => L.LatLng[] | L.LatLng[][];
        };
        path.setLatLngs(rl.getLatLngs());
        path.redraw();
      }
    }

    // Always remove extra drawn layers from edit mode (both save and cancel).
    // On save: removes the unstyled Geoman layer since GeoJSON will remount with correct style.
    // On cancel: removes layers that were drawn before the cancel was pressed.
    if (!wereCreating && layersRef.current.length > 0) {
      layersRef.current.forEach((l) => { try { map.removeLayer(l); } catch { /* no-op */ } });
      layersRef.current = [];
    }
  }, [isEditing, originalGeometry]);

  // Captures shapes drawn during edit mode and merges them with the existing geometry.
  // Applies entity style to the drawn layer so it looks correct before saving.
  useEffect(() => {
    const handleEditModeDraw = (e: any) => {
      const {
        isCreating: creating,
        selectedEntityStyleType: styleType,
        creatingLayersRef: layersRef,
        styles: allStyles,
      } = ref.current;

      // Create mode is handled entirely by MapCreateHandler.
      if (creating) return;

      const layer = e.layer as L.Path & L.Layer & { toGeoJSON: () => GeoJSON.Feature };
      const drawnGeometry = layer.toGeoJSON().geometry;

      // Apply the entity's current style so the drawn layer matches existing ones.
      const style = allStyles.find((s) => s.type === styleType);
      if (style && typeof (layer as any).setStyle === "function") {
        (layer as any).setStyle({
          color: style.borderColor || DEFAULT_COLOR,
          weight: style.borderWidth ?? 2,
          dashArray: style.dashPattern || undefined,
          fillColor: style.fillColor || DEFAULT_COLOR,
          fillOpacity: style.fillOpacity ?? 0.35,
        });
      }

      // Track for cleanup on save or cancel.
      layersRef.current.push(layer);

      const store = useMapStore.getState();
      const base = store.pendingGeometry ?? store.originalGeometry;

      if (drawnGeometry.type === "Polygon") {
        // Merge the new polygon with any existing polygon geometry.
        const existingCoords: GeoJSON.Position[][][] =
          base?.type === "MultiPolygon" ? (base as GeoJSON.MultiPolygon).coordinates :
            base?.type === "Polygon" ? [(base as GeoJSON.Polygon).coordinates] : [];

        ref.current.setPendingGeometry({
          type: "MultiPolygon",
          coordinates: [...existingCoords, (drawnGeometry as GeoJSON.Polygon).coordinates],
        });
      } else if (drawnGeometry.type === "LineString") {
        // Merge the new line with any existing line geometry.
        const existingCoords: GeoJSON.Position[][] =
          base?.type === "MultiLineString" ? (base as GeoJSON.MultiLineString).coordinates :
            base?.type === "LineString" ? [(base as GeoJSON.LineString).coordinates] : [];

        ref.current.setPendingGeometry({
          type: "MultiLineString",
          coordinates: [...existingCoords, (drawnGeometry as GeoJSON.LineString).coordinates],
        });
      } else {
        // Points and other types: replace rather than accumulate.
        ref.current.setPendingGeometry(drawnGeometry);
      }
    };

    map.on("pm:create", handleEditModeDraw);
    return () => { map.off("pm:create", handleEditModeDraw); };
  }, [map]);

  // Create toolbar buttons once on mount; ref keeps callbacks current.
  useEffect(() => {
    const toolbar = map.pm.Toolbar;

    if (!toolbar.buttons[BUTTONS.EDIT_SHAPE]) {
      toolbar.createCustomControl({
        name: BUTTONS.EDIT_SHAPE,
        block: "edit",
        title: "Edit shape vertices",
        className: "leaflet-pm-icon-edit",
        toggle: true,
        onClick: () => {
          const { setPendingGeometry: setGeom } = ref.current;
          const layer = getEffectiveLayer();
          if (!layer?.pm) return;

          if (activeMode.current === "vertices") {
            layer.pm.disable();
            (layer as L.Layer).off("pm:edit");
            activeMode.current = null;
          } else {
            layer.pm.disableLayerDrag();
            (layer as L.Layer).off("pm:dragend");
            layer.pm.enable({ allowSelfIntersection: false });
            (layer as L.Layer).on("pm:edit", () => { setGeom(layer.toGeoJSON().geometry); });
            activeMode.current = "vertices";
          }
        },
      });
    }

    if (!toolbar.buttons[BUTTONS.MOVE_SHAPE]) {
      toolbar.createCustomControl({
        name: BUTTONS.MOVE_SHAPE,
        block: "edit",
        title: "Drag shape",
        className: "leaflet-pm-icon-drag",
        toggle: true,
        onClick: () => {
          const { setPendingGeometry: setGeom } = ref.current;
          const layer = getEffectiveLayer();
          if (!layer?.pm) return;

          if (activeMode.current === "drag") {
            layer.pm.disableLayerDrag();
            (layer as L.Layer).off("pm:dragend");
            activeMode.current = null;
          } else {
            layer.pm.disable();
            (layer as L.Layer).off("pm:edit");
            layer.pm.enableLayerDrag();
            (layer as L.Layer).on("pm:dragend", () => { setGeom(layer.toGeoJSON().geometry); });
            activeMode.current = "drag";
          }
        },
      });
    }

    if (!toolbar.buttons[BUTTONS.DELETE_SHAPE]) {
      toolbar.createCustomControl({
        name: BUTTONS.DELETE_SHAPE,
        block: "edit",
        title: "Delete shape",
        className: "leaflet-pm-icon-trash",
        onClick: () => {
          const { layerRegistry: reg } = ref.current;
          const layer = getEffectiveLayer();
          if (!layer) return;
          map.removeLayer(layer);
          const effectiveId = ref.current.selectedEntityId ??
            (ref.current.isCreating ? CREATING_LAYER_ID : null);
          if (effectiveId) reg.current.delete(effectiveId);
        },
        afterClick: () => { toolbar.buttons[BUTTONS.DELETE_SHAPE].toggle(false); },
      });
    }

    return () => {
      try { map.pm.Toolbar.removeButton(BUTTONS.EDIT_SHAPE); } catch { /* no-op */ }
      try { map.pm.Toolbar.removeButton(BUTTONS.MOVE_SHAPE); } catch { /* no-op */ }
      try { map.pm.Toolbar.removeButton(BUTTONS.DELETE_SHAPE); } catch { /* no-op */ }
    };
  }, [map]);

  return null;
}