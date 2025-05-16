import L from 'leaflet';
import { getStyle } from './_layerStyles';
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
 * @param {Object} operations - (Optional) Operations to perform on the features
 * @param {number} operations.buffer - (Optional) Buffer radius to add around the features
 * @param {Function} operations.propertyRenameFn - (Optional) Function to rename groupByProperty value
 * @param {Function} operations.styleFn - (Optional) Function to style the features
 * @returns {Promise<void>}
 */
export const loadGeoJsonFeatureCollections = async (
    map: L.Map & { groups: any },
    groupByProperty: string,
    filename: string,
    operations: {
        buffer?: number;
        propertyRenameFn?: (value: string) => string;
        styleFn?: (value: string, feature: any) => L.PathOptions;
    } = {},
) => {
    const response = await fetch(filename);
    const geojsonData = await response.json();

    // Add optional buffer to the features
    if (operations.buffer > 0) {
        for (let i = 0; i < geojsonData.features.length; i++) {
            if (geojsonData.features[i].geometry.coordinates.length === 0) {
                continue; // needs to have coordinates
            }
            // Add a buffer to the feature
            geojsonData.features[i] = Turf.buffer(geojsonData.features[i], operations.buffer, {
                units: 'meters',
            });
        }
    }
    if (operations.propertyRenameFn) {
        geojsonData.features.forEach((feature) => {
            feature.properties[groupByProperty] = operations.propertyRenameFn(feature.properties[groupByProperty]);
        });
    }
    // Find unique names
    const uniqueNames = new Set<string>(geojsonData.features.map((feature) => feature.properties[groupByProperty]));

    //Create groups per type
    uniqueNames.forEach((value) => {
        const geojsonLayer = L.geoJSON(geojsonData, {
            filter: filterByProperty(groupByProperty, value),
            style: operations.styleFn ? (feature) => operations.styleFn(value, feature) : () => getStyle(value),
        });

        map.groups[value] = geojsonLayer;
    });
};

function filterByProperty(property, value) {
    return function (feature) {
        return feature.properties[property] === value && feature.geometry.coordinates.length > 0; // needs to have coordinates to be added.
    };
}
