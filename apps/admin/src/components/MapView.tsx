import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Pane } from "react-leaflet";
import { buffer } from "@turf/turf";
import L from "leaflet";
import type { EntityRecord, StyleRecord } from "../db/types";
import "leaflet/dist/leaflet.css";
import { MapClickHandler } from "./MapClickHandler";
import { DEFAULT_POI_ICON, getIconPath } from "../utils/Icons";
import MapEditController from "./MapEditController";
import type { EditMode } from "../types";
import MapGeometryToolbar from "./MapGeometryToolbar";

const DEFAULT_COLOR = "#2563eb";
const SELECTED_BORDER_COLOR = "#fff";

interface Props {
  entities: EntityRecord[];
  styles: StyleRecord[];
  mapKey: number;
  selectedEntityId: string | null;
  openEntity: (entityId: string | null) => void;
  editMode: EditMode;
  editingEntityId: string | null;
  pendingGeometryRef: React.RefObject<GeoJSON.Geometry | null>;
  onStartEdit: (entityId: string, mode: Exclude<EditMode, "idle">) => void;
  onCancelEdit: () => void;
  onSaveGeometry: () => Promise<void>;
}

type FeatureProperties = {
  id: string;
  name: string | undefined;
  styleType: string;
  geometryType: string;
  icon: string | undefined;
};

type MapFeature = {
  type: "Feature";
  properties: FeatureProperties;
  geometry: EntityRecord["geometry"];
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: MapFeature[];
};

const EntityToFeature = (entity: EntityRecord): MapFeature => ({
  type: "Feature",
  properties: {
    id: entity.id,
    name: entity.name,
    styleType: entity.styleType,
    geometryType: entity.geometry.type,
    icon: entity.icon,
  },
  geometry: entity.geometry,
});

const isFireRoad = (feature: MapFeature) => feature.properties.styleType === "fireroad";

const getStyle = (style: StyleRecord | undefined, selected: boolean) => {
  const common = {
    color: selected ? SELECTED_BORDER_COLOR : (style?.borderColor ?? DEFAULT_COLOR),
    opacity: 1,
    dashArray: style?.dashPattern || undefined,
  };

  return {
    ...common,
    weight: selected ? (style?.borderWidth ?? 2) + 2 : (style?.borderWidth ?? 2),
    fillColor: style?.fillColor ?? DEFAULT_COLOR,
    fillOpacity: style?.fillOpacity ?? 0.35,
  };
};

/**
 * Creates a divIcon for the entity's PNG icon image.
 */
const createPOIIcon = (iconName: string): L.DivIcon =>
  L.divIcon({
    className: "",   // Prevents Leaflet adding its own default-icon class
    html: `<img src="${getIconPath(iconName)}" alt="${iconName}" width="32" height="32" />`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

export default function MapView({
  entities,
  styles,
  mapKey,
  selectedEntityId,
  openEntity,
  editMode,
  editingEntityId,
  pendingGeometryRef,
  onStartEdit,
  onCancelEdit,
  onSaveGeometry
}: Props) {
  const layerRegistry = useRef<Map<string, L.Layer>>(new Map());

  // Always holds the current editMode so onEachFeature click handlers
  // read the live value rather than the stale closure from layer creation.
  const editModeRef = useRef(editMode);
  useEffect(() => { editModeRef.current = editMode; }, [editMode]);

  const styleByType = useMemo(
    () => new Map(styles.map((s) => [s.type, s])),
    [styles]
  );

  const poiFeatures: FeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: entities
      .filter((e) => e.geometry.type === "Point")
      .map(EntityToFeature),
  }), [entities]);

  const roadFeatures: FeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: entities
      .filter((e) => e.geometry.type === "LineString" || e.geometry.type === "MultiLineString")
      .map(EntityToFeature)
      .map((e) => buffer(e, isFireRoad(e) ? 2.5 : 0.5, { units: "meters" }) as MapFeature),
  }), [entities]);

  const areaFeatures: FeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: entities
      .filter((e) =>
        e.styleType !== "propertyborder" &&
        (e.geometry.type === "Polygon" || e.geometry.type === "MultiPolygon")
      )
      .map(EntityToFeature),
  }), [entities]);

  // Rendered in a separate pane so it draws below areas and roads.
  const propertyBorderFeatures: FeatureCollection = useMemo(() => ({
    type: "FeatureCollection",
    features: entities
      .filter((e) =>
        e.styleType === "propertyborder" &&
        (e.geometry.type === "Polygon" || e.geometry.type === "MultiPolygon")
      )
      .map(EntityToFeature),
  }), [entities]);

  // Binds click handler and tooltip to each rendered layer.
  const onEachFeature = (feature: MapFeature, layer: L.Layer) => {
    if (!feature.properties?.id) return;

    // Register every rendered layer so MapEditController can find it by entity id.
    layerRegistry.current.set(feature.properties.id, layer);

    layer.on("click", (event: L.LeafletMouseEvent) => {
      if (event.originalEvent) L.DomEvent.stopPropagation(event);
      // Block entity selection while a geometry edit is active.
      // Read from ref so we always get the current editMode,
      // not the stale value captured when this layer was created.
      if (editModeRef.current !== "idle") return;
      openEntity(feature.properties.id);
    });

    if (feature.properties.name) {
      layer.bindTooltip(feature.properties.name);
    }
  };

  /** POIs use L.marker with a divIcon so the PNG is rendered correctly. */
  const pointToLayer = (feature: MapFeature, latlng: L.LatLng): L.Marker => {
    const iconName = feature.properties.icon ?? DEFAULT_POI_ICON;
    return L.marker(latlng, { icon: createPOIIcon(iconName) });
  };

  const styleFeature = (feature: MapFeature) => {
    if (editMode !== "idle") return;
    const entity = entities.find((e) => e.id === feature.properties.id);
    const style = entity ? styleByType.get(entity.styleType) : undefined;
    const selected = selectedEntityId === feature.properties.id;
    return getStyle(style, selected);
  };

  // mapKey included so layers remount after a geometry save.
  const areaKey = useMemo(
    () => areaFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey,
    [areaFeatures, mapKey]
  );

  const roadKey = useMemo(
    () => roadFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey,
    [roadFeatures, mapKey]
  );

  // selectedEntityId included so POI markers remount on selection change,
  // updating the divIcon's selected CSS class.
  const poiKey = useMemo(
    () =>
      poiFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey,
    [poiFeatures, mapKey]
  );

  const propertyBorderKey = useMemo(
    () => propertyBorderFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey,
    [propertyBorderFeatures, mapKey]
  );

  return (
    <div className="map-container" style={{ height: "100%", width: "100%" }}>
      <MapContainer
        // @ts-ignore
        center={[57.6226, 14.9276]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <MapGeometryToolbar
          editMode={editMode}
          editingEntityId={editingEntityId}
          selectedEntityId={selectedEntityId}
          onStartEdit={onStartEdit}
          onSaveGeometry={onSaveGeometry}
          onCancelEdit={onCancelEdit}
        />
        <TileLayer
          url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          // @ts-ignore
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />
        <Pane name="property-borders">
          <GeoJSON
            key={propertyBorderKey}
            data={propertyBorderFeatures}
            // @ts-ignore
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="areas">
          <GeoJSON
            key={areaKey}
            data={areaFeatures}
            // @ts-ignore
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="roads">
          <GeoJSON
            key={roadKey}
            data={roadFeatures}
            // @ts-ignore
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="pois">
          <GeoJSON
            key={poiKey}
            data={poiFeatures}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <MapEditController
          editMode={editMode}
          editingEntityId={editingEntityId}
          layerRegistry={layerRegistry}
          pendingGeometryRef={pendingGeometryRef}
          entities={entities}
          onCancelEdit={onCancelEdit}
        />
        <MapClickHandler
          onClearSelection={() => {
            if (editModeRef.current !== "idle") return;
            openEntity(null);
          }}
        />
      </MapContainer>
    </div>
  );
}