import L from 'leaflet';
import { getStyleFunction } from './_layerStyles';
import * as Turf from '@turf/turf';

/**
 * Loads GeoJSON data and creates a layer per unique value of a property.
 * Used for example by the placement layer that has different "type" values that can be mapped to different layers.
 *
 * Note this mutates the map object.
 *
 * @param {Object} map - The map to add the layers to
 * @param {string} groupByProperty - The property to group by
 * @param {string} filename - The name of the file to load
 * @param {number} buffer - (Optional) Buffer radius to add around the features
 * @returns {Promise<void>}
 */
export const loadGeoJsonFeatureCollections = async (
    map,
    groupByProperty,
    filename,
    buffer = 0,
    newType = undefined,
) => {
    const response = await fetch(filename);
    const geojsonData = await response.json();

    // Add optional buffer to the features
    if (buffer > 0) {
        for (let i = 0; i < geojsonData.features.length; i++) {
            if (geojsonData.features[i].geometry.coordinates.length === 0) {
                continue; // needs to have coordinates
            }
            // Add a buffer to the feature
            geojsonData.features[i] = Turf.buffer(geojsonData.features[i], buffer, {
                units: 'meters',
            });
        }
    }
    if (newType) {
        geojsonData.features.forEach((feature) => {
            feature.properties.type = newType;
        });
    }
    // Find unique names
    const uniqueNames = new Set<string>(geojsonData.features.map((feature) => feature.properties[groupByProperty]));

    //Create groups per type
    uniqueNames.forEach((value) => {
        const geojsonLayer = L.geoJSON(geojsonData, {
            filter: filterByProperty(groupByProperty, value),
            style: getStyleFunction(value),
        });

        map.groups[value] = geojsonLayer;
    });
};

function filterByProperty(property, value) {
    return function (feature) {
        return feature.properties[property] === value && feature.geometry.coordinates.length > 0; // needs to have coordinates to be added.
    };
}
