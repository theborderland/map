import L from 'leaflet';

// Styles for roads, areas and POIs now come from the API (see api/styles.ts).
// Only the external soundguide is still styled here.
const baseStyle: L.PathOptions = {
    opacity: 1, 
    fillOpacity: 0,
    weight: 1.5,
    dashArray: '5',
};

export function getSoundStyle(feature: GeoJSON.Feature): L.PathOptions {
    return {
        ...baseStyle,
        color: feature.properties?.fill,
        fillOpacity: 0.4,
        weight: 2, // border width
    };
}

export function getKidzoneStyle(feature: GeoJSON.Feature): L.PathOptions {
    return {
        color: feature.properties?.fill,
        opacity: 0.5,
        fillColor: feature.properties?.fill,
        fillOpacity: 0.3,
    };
}

/**
 * Gives back a style definition based on the given type/name of a geojson feature
 */
export function getStyle(name: string): L.PathOptions | undefined {
    switch (name) {
        case 'naturereserve':
            return {
                ...baseStyle,
                color: '#00b521',
                weight: 3,
            };
        case 'propertyborder':
            return {
                ...baseStyle,
                color: '#e77409',
                weight: 1,
            };
        case 'friends':
            return {
                ...baseStyle,
                color: 'turquoise',
            };
        case 'forbidden':
            return {
                ...baseStyle,
                color: 'red',
                fillOpacity: 0.5,
            };
        case 'hiddenforbidden':
            return {
                color: 'black',
                fillOpacity: 1,
                weight: 0,
            };
    }
}