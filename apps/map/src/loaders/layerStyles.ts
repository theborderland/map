import L from 'leaflet';

interface PathOptions extends L.PathOptions {
    opacity?: number;
    fillOpacity?: number;
    weight?: number;
    dashArray?: string;
    color?: string;
}

// Styles for roads, areas and POIs now come from the API (see api/styles.ts).
// Only the external soundguide is still styled here.
const baseStyle: PathOptions = {
    opacity: 1,
    fillOpacity: 0,
    weight: 1.5,
    dashArray: '5',
};

export function getSoundStyle(feature: GeoJSON.Feature): PathOptions {
    return {
        ...baseStyle,
        color: feature.properties?.fill,
        fillOpacity: 0.4,
        weight: 2, // border width
    };
}

export function getKidzoneStyle(feature: GeoJSON.Feature): PathOptions {
    return {
        color: feature.properties?.fill,
        opacity: 0.5,
        fillColor: feature.properties?.fill,
        fillOpacity: 0.3,
    };
}

