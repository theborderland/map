import * as L from 'leaflet';

/** GeoJSON group with Leaflet’s internal child-layer map (used for drag / edit). */
export type GeoJsonLayerGroup = L.GeoJSON & {
    _layers: Record<number, L.Layer>;
    _leaflet_id: number;
};

/** Child polygon layer Geoman edits inside a camp GeoJSON group. */
export function getGeoJsonChildLayer(group: L.GeoJSON): L.Path | undefined {
    const g = group as GeoJsonLayerGroup;
    if (!g._layers || g._leaflet_id == null) {
        return undefined;
    }
    return g._layers[g._leaflet_id - 1] as L.Path | undefined;
}

/** Outer ring coords for cluster-cache invalidation (`layer._latlngs[0]` on polygons). */
export function getLayerLatLngRing(layer: L.Layer): L.LatLng[] | undefined {
    const latlngs = layer._latlngs;
    if (!latlngs?.length) {
        return undefined;
    }
    const first = latlngs[0];
    if (first && typeof first === 'object' && 'lat' in first) {
        return latlngs as L.LatLng[];
    }
    return latlngs[0] as L.LatLng[];
}

/** Geoman draw/edit working layer with vertex list. */
export type PmWorkingLayer = L.Layer & { _latlngs?: L.LatLng[] };

export function getWorkingLayerLatLngs(workingLayer: L.Layer): L.LatLng[] | undefined {
    return (workingLayer as PmWorkingLayer)._latlngs;
}
