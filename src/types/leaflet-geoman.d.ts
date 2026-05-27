import 'leaflet';

/** Leaflet / Geoman internals and editor-only options used across the map. */
declare module 'leaflet' {
    interface LayerOptions {
        snapIgnore?: boolean;
        snapDistance?: number;
        entityId?: number;
        isCampSnapOutline?: boolean;
    }

    interface Layer {
        _leaflet_id?: number;
        _rings?: unknown[];
        /** Polygon: ring array; polyline: flat LatLng list. */
        _latlngs?: LatLng[] | LatLng[][];
        toGeoJSON?: () => GeoJSON.GeoJsonObject;
    }

    interface GeoJSON {
        _layers?: Record<number, Layer>;
        _leaflet_id?: number;
        pm?: { enable(options?: object): void; disable(): void };
    }

    interface Marker {
        _latlng?: LatLng;
        _tooltip?: Tooltip & { _content?: string };
    }

    interface Path {
        dragging?: { enable(): void; disable(): void };
    }

    interface Polygon {
        dragging?: { enable(): void; disable(): void };
    }
}
