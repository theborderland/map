import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import { loadZones } from './loaders/loadZones';
import { loadNatureReserve } from './loaders/loadNatureReserve';
import { loadFireRoads } from './loaders/loadFireRoads';
import { loadCampClusters } from './loaders/loadCampClusters';
import { loadTooltipZoom, loadBoarderlandMarker } from './utils/loadTooltipZoom';
import { loadCampMarkers } from './utils/loadCampMarkers';
import { loadPositionControl } from './utils/loadPositionControl';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21 }).setView([57.621111, 14.927857], 17);


    await loadZones(map);
    await loadNatureReserve(map);
    await loadFireRoads(map);
    await loadCampClusters(map);
    await loadTooltipZoom(map);
    await loadBoarderlandMarker(map);
    await loadCampMarkers(map);
    await loadPositionControl(map);
    L.control.scale({metric: true, imperial: false}).addTo(map);
    L.control.polylineMeasure().addTo(map);

    const googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
};
