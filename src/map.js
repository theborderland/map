import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-hash-plus';
import { loadZones } from './loaders/loadZones';
import { loadNatureReserve } from './loaders/loadNatureReserve';
import { loadSoundGuide } from './loaders/loadSoundGuide';
import { loadFireRoads } from './loaders/loadFireRoads';
import { loadCampClusters } from './loaders/loadCampClusters';
import { loadTooltipZoom, loadBoarderlandMarker } from './utils/loadTooltipZoom';
import { loadCampMarkers } from './utils/loadCampMarkers';
import { loadPositionControl } from './utils/loadPositionControl';
import { loadImageOverlay } from './loaders/loadImageOverlay';
import { loadDrawnMap } from './loaders/loadDrawnMap';
import { addLegends } from './loaders/addLegends';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21 }).setView([57.621111, 14.927857], 17);

    await loadZones(map);
    await loadNatureReserve(map);
    await loadFireRoads(map);
    await loadTooltipZoom(map);
    await loadBoarderlandMarker(map);
    await loadPositionControl(map);
    await loadCampClusters(map);
    await loadCampMarkers(map);

    L.control.scale({metric: true, imperial: false}).addTo(map);
    L.control.polylineMeasure().addTo(map);
    let hash = new L.Hash(map);  // Makes THE URL follow the map

    //Add sound guide, slope map and terrain map to layer control
    let sound = await loadSoundGuide(map);
    let slopemap = await loadImageOverlay(map, './data/slopemap.png', [[57.6183258637506626, 14.9211877664388641], [57.6225237073944072,14.9346879887464876]]);
    let terrain = await loadImageOverlay(map, './data/terrain.png', [[57.6156422900704257, 14.9150971736724536], [57.6291230394961715,14.9362178462290363]]);
    var extraLayers = {"Sound guide": sound, "Terrain": terrain, "Slope map": slopemap};
    
    
    //Base layers
    const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
    
    let drawnmap = await loadDrawnMap(map);

    var baseLayers = {"Satellite map": googleSatellite, "Drawn map": drawnmap};

    L.control.layers(baseLayers, extraLayers).addTo(map);

    addLegends(map);
};
