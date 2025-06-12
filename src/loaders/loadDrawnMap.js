import L from 'leaflet';
/*
USAGE: 
await loadDrawnMap(map);
map.addLayer(map.groups.drawnmap);
*/

let getStyle = (color) => {
    return {
        stroke: false,
        fillColor: color,
        weight: 0,
        opacity: 1,
        fillOpacity: 1,
    };
};
const geoJsonFiles = [
    { url: './data/drawnmap/roads.geojson', color: '#b3bcc3' },
    { url: './data/drawnmap/farmland.geojson', color: '#8fc981' },
    { url: './data/drawnmap/grass.geojson', color: '#8fc981' },
    { url: './data/drawnmap/forest.geojson', color: '#27763d' },
    { url: './data/drawnmap/buildings.geojson', color: '#fef2cb' },
    { url: './data/drawnmap/lakes.geojson', color: '#8fdaed' },
    { url: './data/drawnmap/water.geojson', color: '#8fdaed' },
];

export const loadDrawnMap = async (map) => {
    map.createPane('drawnmap');
    map.getPane('drawnmap').style.zIndex = 250;
    map.getPane('drawnmap').style.pointerEvents = 'none';

    const layers = [];
    for (const { url, color } of geoJsonFiles) {
        const response = await fetch(url);
        const jsonData = await response.json();
        const layer = L.geoJson(jsonData, {
            style: getStyle(color),
            pane: 'drawnmap'
        });
        layers.push(layer);
    }

    let group = new L.FeatureGroup();
    layers.forEach(layer => group.addLayer(layer));
    map.groups.drawnmap = group;
};

