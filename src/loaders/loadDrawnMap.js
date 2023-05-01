import L from 'leaflet';

export const loadDrawnMap = async (map) => 
{
    map.createPane('drawnmap');
    map.getPane('drawnmap').style.zIndex = 250;
    map.getPane('drawnmap').style.pointerEvents = 'none';

    let response = await fetch('./data/drawnmap/farmland.geojson');
    let jsonData = await response.json();

    const farmland = L.geoJson(jsonData, {
                    style: 
                    {
                        color: '#fff7a6',
                        fillColor: '#fff7a6',
                        weight: 0,
                        opacity: 1,
                        fillOpacity: 1,
                    }, 
                    pane: 'drawnmap'});

    response = await fetch('./data/drawnmap/forest.geojson');
    jsonData = await response.json();

    const forest = L.geoJson(jsonData, {
                    style: 
                    {
                        color: '#acd47e',
                        fillColor: '#acd47e',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 1,
                    }, 
                    pane: 'drawnmap'});

    response = await fetch('./data/drawnmap/water.geojson');
    jsonData = await response.json();
    
    const water = L.geoJson(jsonData, {
                    style: 
                    {
                    color: '#addfff',
                    fillColor: '#addfff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1,
                    }, 
                    pane: 'drawnmap'});

    response = await fetch('./data/drawnmap/buildings.geojson');
    jsonData = await response.json();
    
    const buildings = L.geoJson(jsonData, {
                    style: 
                    {
                    color: 'darkgrey',
                    fillColor: 'grey',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1,
                    }, 
                    pane: 'drawnmap'});

    response = await fetch('./data/drawnmap/lakes.geojson');
    jsonData = await response.json();
    
    const lakes = L.geoJson(jsonData, {
                    style: 
                    {
                    color: '#addfff',
                    fillColor: '#addfff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 1,
                    }, 
                    pane: 'drawnmap'});

    let group = new L.FeatureGroup();
    group.addLayer(farmland);
    group.addLayer(forest);
    group.addLayer(water);
    group.addLayer(buildings);
    group.addLayer(lakes);

    map.groups.drawnmap = group;
};

