import { useCallback, useMemo, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, Pane, useMapEvent } from "react-leaflet";
import { buffer } from "@turf/turf";
import L from "leaflet";
import type { EntityRecord, StyleRecord } from "../db/types";
import "@geoman-io/leaflet-geoman-free";
import { GeomanControls } from "react-leaflet-geoman-v2";
import { useMapStore } from "../store/mapStore";
import MapCustomControls from "./MapCustomControls";

const DEFAULT_COLOR = "#2563eb";
const SELECTED_BORDER_COLOR = "#fff";

interface Props {
  entities: EntityRecord[];
  styles: StyleRecord[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string) => void;
  onClearSelection: () => void;
}

function MapClickHandler({ onClearSelection }: { onClearSelection: () => void }) {
  useMapEvent("click", () => {
    onClearSelection();
  });
  return null;
}

const featureToEntity = (entity: EntityRecord) => ({
  type: "Feature",
  properties: {
    id: entity.id,
    name: entity.name,
    styleType: entity.styleType,
    geometryType: entity.geometry.type,
  },
  geometry: entity.geometry,
});

const getStyle = (style: StyleRecord | undefined, selected: boolean, geometryType: string) => {
  const common = {
    color: selected ? SELECTED_BORDER_COLOR : style?.borderColor ?? DEFAULT_COLOR,
    opacity: 1,
    dashArray: style?.dashPattern || undefined,
  };

  if (geometryType === "Point") {
    return {
      ...common,
      radius: 7,
      fillColor: style?.fillColor ?? DEFAULT_COLOR,
      weight: style?.borderWidth ?? 2,
      fillOpacity: style?.fillOpacity ?? 0.75,
    };
  }

  return {
    ...common,
    weight: selected ? (style?.borderWidth ?? 2) + 2 : style?.borderWidth ?? 2,
    fillColor: style?.fillColor ?? DEFAULT_COLOR,
    fillOpacity: style?.fillOpacity ?? 0.35,
  };
};

export default function MapView({
  entities,
  styles,
  selectedEntityId,
  onSelectEntity,
  onClearSelection }: Props) {
  const { isEditing, canChangeSelection } = useMapStore();

  const handleSelectEntity = useCallback((entityId: string) => {
    if (!canChangeSelection()) return;
    onSelectEntity(entityId)
  }, [canChangeSelection, onSelectEntity])

  const handleClearSelection = useCallback(() => {
    if (!canChangeSelection()) return;
    onClearSelection()
  }, [canChangeSelection, onClearSelection])

  const layerRegistry = useRef<Map<string, L.Layer>>(new Map())

  const styleByType = useMemo(
    () => new Map(styles.map((style) => [style.type, style])),
    [styles]
  );

  const poiFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: entities.filter((entity) => entity.geometry.type === "Point").map(featureToEntity),
    }),
    [entities]
  );

  const roadFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: entities
        .filter((entity) => entity.geometry.type === "LineString" || entity.geometry.type === "MultiLineString")
        .map(featureToEntity)
        .map((entity) => {
          if (entity.properties.styleType !== "fireroad") return entity;
          return buffer(entity as any, 2.5, { units: "meters" });
        }),
    }),
    [entities]
  );

  const areaFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: entities.filter((entity) =>
        entity.styleType !== "propertyborder" && (
          entity.geometry.type === "Polygon" ||
          entity.geometry.type === "MultiPolygon"
        )
      ).map(featureToEntity),
    }),
    [entities]
  );
  // Property borders are rendered separately to ensure they appear below other areas and roads.
  const propertyBorderFeatures = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: entities.filter((entity) =>
        entity.styleType === "propertyborder" && (
          entity.geometry.type === "Polygon" ||
          entity.geometry.type === "MultiPolygon"
        )
      ).map(featureToEntity),
    }),
    [entities]
  );

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (!feature.properties?.id) return;

    layerRegistry.current.set(feature.properties.id, layer)

    layer.on("click", (event: L.LeafletMouseEvent) => {
      if (event.originalEvent) L.DomEvent.stopPropagation(event);
      handleSelectEntity(feature.properties.id)
    });

    if (feature.properties.name) {
      layer.bindTooltip(feature.properties.name);
    }
  };

  const pointToLayer = (feature: any, latlng: L.LatLng) => {
    const entity = entities.find((item) => item.id === feature.properties.id);
    const style = entity ? styleByType.get(entity.styleType) : undefined;
    const selected = selectedEntityId === feature.properties.id;
    return L.circleMarker(latlng, {
      ...getStyle(style, selected, "Point"),
      pane: "pois",
    });
  };

  const styleFeature = (feature: any) => {
    const entity = entities.find((item) => item.id === feature.properties.id);
    const style = entity ? styleByType.get(entity.styleType) : undefined;
    const selected = selectedEntityId === feature.properties.id;
    return getStyle(style, selected, feature.properties.geometryType);
  };

  return (
    <div
      className={isEditing ? 'is-editing' : ''}
      style={{ height: '100%', width: '100%' }}
    >
      <MapContainer
        center={[57.6226, 14.9276]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        className={isEditing ? 'is-editing' : ''}
      >
        <MapCustomControls
          selectedEntityId={selectedEntityId}
          layerRegistry={layerRegistry}
        />
        <GeomanControls
          options={{
            editMode: false,
            dragMode: false,
            rotateMode: false,
            cutPolygon: false,
            removalMode: false
          }}
          globalOptions={{ snappable: false }}
        />
        <TileLayer
          url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
        />
        <Pane name="property-borders">
          {/* Render property borders in a separate pane to ensure they are below other areas and roads. */}
          <GeoJSON
            data={propertyBorderFeatures}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="areas">
          <GeoJSON
            data={areaFeatures}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="roads">
          <GeoJSON
            data={roadFeatures}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <Pane name="pois">
          <GeoJSON
            data={poiFeatures}
            style={styleFeature}
            pointToLayer={pointToLayer}
            onEachFeature={onEachFeature}
          />
        </Pane>
        <MapClickHandler onClearSelection={handleClearSelection} />
      </MapContainer>
    </div>
  );
}
