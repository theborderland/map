import L from 'leaflet';
import { getStyleFunction } from './_layerStyles';
import * as Turf from '@turf/turf';

// This class is used to load GeoJSON data and create a layer per unique value of a property. Used for example by the placement
// layer that has different "type" properties that can easily go into different layers.
// groupByProperty is the property to group by
// styleFunction is a function that returns the style for a feature, so that different styles can be applied to different groups
// filename is the name of the file to load
// map is the map to add the layers to
export const loadGeoJsonFeatureCollections = async (map, groupByProperty, filename, buffer = 0, newType = undefined) => {
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
                units: 'meters'
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
        return feature.properties[property] === value
            && feature.geometry.coordinates.length > 0; // needs to have coordinates to be added.
    };
}
