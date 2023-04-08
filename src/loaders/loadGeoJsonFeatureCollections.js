import L from 'leaflet';

export const loadGeoJsonFeatureCollections = async (map, styleFunction, groupByProperty, filename) => {
  const response = await fetch(filename);
  const geojsonData = await response.json();

  // Find unique names
  const uniqueNames = new Set(geojsonData.features.map(feature => feature.properties[groupByProperty]));

  //Create groups per type
  uniqueNames.forEach(value => {
    const geojsonLayer = L.geoJSON(geojsonData, {
      filter: filterByProperty(groupByProperty, value),
      style: styleFunction(value),
    }).addTo(map);

    map.groups[value] = geojsonLayer;
  });
};

function filterByProperty(property, value) {
  return function (feature) {
    return feature.properties[property] === value;
  };
}