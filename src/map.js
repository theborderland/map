import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-hash-plus';
import '@geoman-io/leaflet-geoman-free';
// import 'leaflet-search';

import { loadZones, loadZoneNames } from './loaders/loadZones';
// import { loadNatureReserve } from './loaders/loadNatureReserve';
// import { loadSoundGuide } from './loaders/loadSoundGuide';
// import { loadFireRoads } from './loaders/loadFireRoads';
// import { loadCampClusters } from './loaders/loadCampClusters';
// import { loadTooltipZoom } from './utils/loadTooltipZoom';
// import { loadBoarderlandMarker, loadDiscoDiffusion } from './utils/misc';
// import { loadCampNames, loadClusterNames } from './utils/loadCampMarkers';
import { loadPositionControl } from './utils/loadPositionControl';
import { loadImageOverlay } from './loaders/loadImageOverlay';
import { loadDrawnMap } from './loaders/loadDrawnMap';
// import { addLegends } from './loaders/addLegends';
// import { addSearch } from './utils/searchControl';
// import { loadPoi } from './loaders/loadPoi';
// import { startTracking } from './loaders/loadTrackers';
// import { loadPowerZoneNames, loadPowerClustersNames, loadPowerCampNames, loadPowerBoarderlandMarker } from './utils/power';
import { Editor } from './editor';
import { EntityDataAPI } from './api';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true }).setView(
        [57.621111, 14.927857],
        17,
    );

    const editor = new Editor(map);

    // Map feature layers
    map.groups = {};
    map.groups.zones = (await loadZones(map)).addTo(map);

    // map.groups.zoneNames = (await loadZoneNames(map)).addTo(map);
    // map.groups.natureReserve = (await loadNatureReserve(map)).addTo(map);
    // map.groups.fireRoads = (await loadFireRoads(map)).addTo(map);

    // Toggable layers
    // map.groups.boarderlandMarker = (await loadBoarderlandMarker(map));
    // map.groups.clusters = (await loadCampClusters(map)).addTo(map);
    // map.groups.clusterNames = (await loadClusterNames(map)).addTo(map);
    // map.groups.campNames = (await loadCampNames(map));
    // map.groups.poi = (await loadPoi(map)).addTo(map);
    // map.groups.powerZoneNames = (await loadPowerZoneNames(map));
    // map.groups.powerClustersNames = (await loadPowerClustersNames(map));
    // map.groups.powerCampNames = (await loadPowerCampNames(map));
    // map.groups.powerBoarderlandMarker = (await loadPowerBoarderlandMarker(map));

    // Base layers
    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
    map.groups.drawnmap = await loadDrawnMap(map);
    var baseLayers = { 'Satellite map': map.groups.googleSatellite, 'Drawn map': map.groups.drawnmap };

    // Extra layers
    // map.groups.sound = await loadSoundGuide(map);
    map.groups.slopemap = await loadImageOverlay(map, './data/slopemap.png', [
        [57.6183258637506626, 14.9211877664388641],
        [57.6225237073944072, 14.9346879887464876],
    ]);
    map.groups.terrain = await loadImageOverlay(map, './data/terrain.png', [
        [57.6156422900704257, 14.9150971736724536],
        [57.6291230394961715, 14.9362178462290363],
    ]);
    // map.groups.hippo = await loadImageOverlay(map, './img/hippo.png', [[57.62241, 14.92153], [57.61908,14.93346]]);
    // map.groups.discoDiffusion = await loadDiscoDiffusion(map);
    // map.groups.poi_menu = (new L.LayerGroup()).addTo(map);
    // map.groups.power_menu = (new L.LayerGroup());
    var extraLayers = {
        // "Areas": map.groups.clusters,
        // "Sound guide": map.groups.sound,
        Terrain: map.groups.terrain,
        'Slope map': map.groups.slopemap,
        // "POI": map.groups.poi_menu,
        // "Power": map.groups.power_menu,
        // "Hippo": map.groups.hippo
    };

    // if (new Date('2022-07-28') < new Date())
    // {
    //     extraLayers["Friday Forecast"] = map.groups.discoDiffusion;
    // }

    // Add layer control and legends
    L.control.layers(baseLayers, extraLayers).addTo(map);
    // addLegends(map);

    // Add map features
    // await loadTooltipZoom(map);
    L.control.scale({ metric: true, imperial: false }).addTo(map);
    await loadPositionControl(map);
    L.control.polylineMeasure().addTo(map);
    // await addSearch(map);
    // let hash = new L.Hash(map);  // Makes the URL follow the map

    // Add editable layers
    await editor.addAPIEntities();

    // startTraking(map);
};
