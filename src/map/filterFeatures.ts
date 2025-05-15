import L from 'leaflet';

/**
 * Creates a new GeoJSON layer containing only features that match the given condition
 *
 * @param layer - The source GeoJSON layer to filter
 * @param condition - A function that takes a GeoJSON feature and returns true if it should be kept
 * @returns A new GeoJSON layer with only the features that match the condition
 */
export function filterFeatures(layer: L.GeoJSON, condition: (feature: GeoJSON.Feature) => boolean): L.GeoJSON {
    // Get the original GeoJSON data
    const originalData = layer.toGeoJSON();

    // Filter the features based on the condition
    const filteredFeatures = 'features' in originalData ? originalData.features.filter(condition) : [];

    // Create a new FeatureCollection with the filtered features
    const filteredData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: filteredFeatures,
    };

    // Create a new GeoJSON layer with the filtered data
    // Use the same style and options as the original layer if possible
    const newLayer = L.geoJSON(filteredData, {
        style: layer.options.style,
        pointToLayer: layer.options.pointToLayer,
        onEachFeature: layer.options.onEachFeature,
    });

    return newLayer;
}
