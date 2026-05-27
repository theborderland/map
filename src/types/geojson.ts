import type { Feature, FeatureCollection, Geometry, Polygon } from 'geojson';

/** GeoJSON Feature with Polygon geometry (camps, zones, buffers). */
export type PolygonFeature = Feature<Polygon>;

export type GeoJsonFeatureInput = Feature | FeatureCollection | undefined;

export type { Feature, FeatureCollection, Geometry, Polygon };
