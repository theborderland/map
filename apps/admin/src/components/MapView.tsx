import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Pane } from "react-leaflet";
import { buffer } from "@turf/turf";
import L from "leaflet";
import type { EntityRecord, SettingsRecord, StyleRecord } from "../db/types";
import "leaflet/dist/leaflet.css";
import { MapClickHandler } from "./MapClickHandler";
import { createPOIIcon, DEFAULT_POI_ICON } from "../utils/Icons";
import MapEditController from "./MapEditController";
import type { EntityKind } from "../types";
import MapGeometryToolbar from "./MapGeometryToolbar";
import { useMapEditStore, isLocked } from "../store/mapEditStore";

const DEFAULT_COLOR = "#2563eb";
const SELECTED_BORDER_COLOR = "#fff";

interface Props {
  entities: EntityRecord[];
  styles: StyleRecord[];
  mapKey: number;
  selectedEntityId: string | null;
  openEntity: (entityId: string | null) => void;
  settings: SettingsRecord;
  selectedPOIIcon: string;
}

type FeatureProperties = {
  id: string;
  name: string | undefined;
  styleType: string;
  geometryType: string;
  icon: string | undefined;
  bufferMeters: number;
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
    bufferMeters: entity.bufferMeters ?? 0,
  },
  geometry: entity.geometry,
});

/** Filters entities by predicate and wraps them as a FeatureCollection —
 *  removes the `{ type: "FeatureCollection", features: ... }` wrapper
 *  that was previously duplicated across four separate useMemo blocks. */
function buildFeatureCollection(
  entities: EntityRecord[],
  predicate: (e: EntityRecord) => boolean
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: entities.filter(predicate).map(EntityToFeature),
  };
}

const getStyle = (style: StyleRecord | undefined, selected: boolean) => ({
  color: selected ? SELECTED_BORDER_COLOR : (style?.borderColor ?? DEFAULT_COLOR),
  opacity: 1,
  dashArray: style?.dashPattern || undefined,
  weight: selected ? (style?.borderWidth ?? 2) + 2 : (style?.borderWidth ?? 2),
  fillColor: style?.fillColor ?? DEFAULT_COLOR,
  fillOpacity: style?.fillOpacity ?? 0.35,
});

export default function MapView({
  entities, styles, mapKey, selectedEntityId, openEntity, settings, selectedPOIIcon,
}: Props) {
  const layerRegistry = useRef<Map<string, L.Layer>>(new Map());

  const editState = useMapEditStore((s) => s.state);
  const editingEntityId = editState.status === "editing" ? editState.entityId : null;
  const isRoadEditMode = editState.status === "editing" && editState.kind === "road";

  // Ref so onEachFeature click handlers always read the live lock state
  // rather than the stale value captured when each layer was created.
  const lockedRef = useRef(isLocked(editState));
  useEffect(() => { lockedRef.current = isLocked(editState); }, [editState]);

  const styleByType = useMemo(() => new Map(styles.map((s) => [s.type, s])), [styles]);

  // Derive the type of the selected entity so the toolbar knows which
  // button set to show.
  const selectedEntityType = useMemo((): EntityKind | null => {
    if (!selectedEntityId) return null;
    const entity = entities.find((e) => e.id === selectedEntityId);
    if (!entity) return null;
    const entityType = entity.geometry.type;
    if (entityType === "LineString" || entityType === "MultiLineString") return "road";
    if (entityType === "Polygon" || entityType === "MultiPolygon") return "area";
    if (entityType === "Point" || entityType === "MultiPoint") return "poi";
    return null;
  }, [selectedEntityId, entities]);

  const poiFeatures = useMemo(
    () => buildFeatureCollection(entities, (e) => e.geometry.type === "Point" || e.geometry.type === "MultiPoint"),
    [entities]
  );

  // Exclude the road being edited so the buffered polygon disappears while
  // MapEditController shows the raw source lines instead.
  const roadFeatures = useMemo(() => {
    const base = buildFeatureCollection(entities, (e) => {
      if (e.geometry.type !== "LineString" && e.geometry.type !== "MultiLineString") return false;
      if (isRoadEditMode && e.id === editingEntityId) return false;
      return true;
    });
    return {
      type: "FeatureCollection" as const,
      // bufferMeters is total road width — halve it since turf.buffer adds
      // the given distance on each side of the line.
      features: base.features.map((f) => buffer(f, f.properties.bufferMeters / 2, { units: "meters" }) as MapFeature),
    };
  }, [entities, isRoadEditMode, editingEntityId]);

  const areaFeatures = useMemo(
    () => buildFeatureCollection(entities, (e) =>
      e.styleType !== "propertyborder" && (e.geometry.type === "Polygon" || e.geometry.type === "MultiPolygon")
    ),
    [entities]
  );

  // Rendered in a separate pane so it draws below areas and roads.
  const propertyBorderFeatures = useMemo(
    () => buildFeatureCollection(entities, (e) =>
      e.styleType === "propertyborder" && (e.geometry.type === "Polygon" || e.geometry.type === "MultiPolygon")
    ),
    [entities]
  );

  // Binds click handler and tooltip to each rendered layer.
  const onEachFeature = (feature: MapFeature, layer: L.Layer) => {
    if (!feature.properties?.id) return;

    // Register every rendered layer so MapEditController can find it by entity id.
    layerRegistry.current.set(feature.properties.id, layer);

    layer.on("click", (event: L.LeafletMouseEvent) => {
      if (lockedRef.current) return;
      if (event.originalEvent) L.DomEvent.stopPropagation(event);
      openEntity(feature.properties.id);
    });

    if (feature.properties.name) {
      layer.bindTooltip(feature.properties.name, {
        sticky: true, // tooltip will follow cursor
        direction: "top",
        offset: L.point(0, -5), // 5px higher
      });
    }
  };

  const pointToLayer = (feature: MapFeature, latlng: L.LatLng): L.Marker => {
    const iconName = feature.properties.icon ?? DEFAULT_POI_ICON;
    return L.marker(latlng, { icon: createPOIIcon(iconName) });
  };

  const styleFeature = (feature: MapFeature) => {
    const entity = entities.find((e) => e.id === feature.properties.id);
    const style = entity ? styleByType.get(entity.styleType) : undefined;
    const selected = selectedEntityId === feature.properties.id;
    return getStyle(style, selected);
  };

  // mapKey included so layers remount after a geometry save.
  const areaKey = useMemo(() => areaFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey, [areaFeatures, mapKey]);
  const roadKey = useMemo(() => roadFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey, [roadFeatures, mapKey]);
  const poiKey = useMemo(() => poiFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey, [poiFeatures, mapKey]);
  const propertyBorderKey = useMemo(() => propertyBorderFeatures.features.map((f) => f.properties.id).join(",") + "|" + mapKey, [propertyBorderFeatures, mapKey]);

  return (
    <div className="map-container" style={{ height: "100%", width: "100%" }}>
      <MapContainer
        // @ts-ignore
        center={[57.6226, 14.9276]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
      >
        <MapGeometryToolbar
          selectedEntityId={selectedEntityId}
          selectedEntityType={selectedEntityType}
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
          layerRegistry={layerRegistry}
          entities={entities}
          settings={settings}
          selectedPOIIcon={selectedPOIIcon}
        />
        <MapClickHandler
          onClearSelection={() => {
            if (lockedRef.current) return;
            openEntity(null);
          }}
        />
      </MapContainer>
    </div>
  );
}