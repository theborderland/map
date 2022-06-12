import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import { loadZones } from './loaders/loadZones';
import { loadNatureReserve } from './loaders/loadNatureReserve';
import { loadSoundGuide } from './loaders/loadSoundGuide';
import { loadFireRoads } from './loaders/loadFireRoads';
import { loadCampClusters } from './loaders/loadCampClusters';
import { loadTooltipZoom, loadBoarderlandMarker } from './utils/loadTooltipZoom';
import { loadCampMarkers } from './utils/loadCampMarkers';
import { loadPositionControl } from './utils/loadPositionControl';
import { loadImageOverlay } from './loaders/loadImageOverlay';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21 }).setView([57.621111, 14.927857], 17);


    loadZones(map);
    loadNatureReserve(map);
    loadFireRoads(map);
    loadTooltipZoom(map);
    loadBoarderlandMarker(map);
    loadPositionControl(map);
    await loadCampClusters(map);
    await loadCampMarkers(map);
    let sound = await loadSoundGuide(map);
    let slopemap = await loadImageOverlay(map, './data/slopemap.png', [[57.6183258637506626, 14.9211877664388641], [57.6225237073944072,14.9346879887464876]]);
    let terrain = await loadImageOverlay(map, './data/terrain.png', [[57.6156422900704257, 14.9150971736724536], [57.6291230394961715,14.9362178462290363]]);
    L.control.scale({metric: true, imperial: false}).addTo(map);
    L.control.polylineMeasure().addTo(map);

    var baseLayers = {"Sound guide": sound, "Terrain": terrain, "Slope map": slopemap};
    L.control.layers(null, baseLayers).addTo(map);

    const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
};
