import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import { loadZones } from './loaders/loadZones';
import { loadNatureReserve } from './loaders/loadNatureReserve';
import { loadSoundGuide } from './loaders/loadSoundGuide';
import { loadSlopeMap } from './loaders/loadSlopeMap';
import { loadFireRoads } from './loaders/loadFireRoads';
import { loadCampClusters } from './loaders/loadCampClusters';
import { loadTooltipZoom, loadBoarderlandMarker } from './utils/loadTooltipZoom';
import { loadCampMarkers } from './utils/loadCampMarkers';
import { loadPositionControl } from './utils/loadPositionControl';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21 }).setView([57.621111, 14.927857], 17);


    loadZones(map);
    loadNatureReserve(map);
    loadFireRoads(map);
    loadCampClusters(map);
    loadTooltipZoom(map);
    loadBoarderlandMarker(map);
    loadCampMarkers(map);
    loadPositionControl(map);
    let sound = await loadSoundGuide(map);
    let slope = await loadSlopeMap(map);
    L.control.scale({metric: true, imperial: false}).addTo(map);
    L.control.polylineMeasure().addTo(map);

    var baseLayers = {"Sound guide": sound, "Slope": slope};
    L.control.layers(null, baseLayers).addTo(map);

    const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
};
