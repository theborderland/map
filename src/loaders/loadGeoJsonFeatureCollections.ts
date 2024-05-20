import L from 'leaflet';
import { getStyleFunction } from './_layerStyles';

// This class is used to load GeoJSON data and create a layer per unique value of a property. Used for example by the placement
// layer that has different "type" properties that can easily go into different layers.
// groupByProperty is the property to group by
// styleFunction is a function that returns the style for a feature, so that different styles can be applied to different groups
// filename is the name of the file to load
// map is the map to add the layers to
export const loadGeoJsonFeatureCollections = async (map, groupByProperty, filename) => {
    const response = await fetch(filename);
    const geojsonData = await response.json();

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
        return feature.properties[property] === value;
    };
}
