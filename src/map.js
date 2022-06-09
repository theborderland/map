import L from 'leaflet';
import 'leaflet.locatecontrol';
import { loadZones } from './loaders/loadZones';

import { loadNatureReserve } from './loaders/loadNatureReserve';
import { loadFireRoads } from './loaders/loadFireRoads';
import { loadCampClusters } from './loaders/loadCampClusters';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false }).setView([57.621111, 14.927857], 17);

    // Add Leaflet-locatecontrol plugin
    L.control.locate({ setView: 'once', keepCurrentZoomLevel: true, returnToPrevBounds: true, drawCircle: true, flyTo: true }).addTo(map);

    // map.createPane('labels');
    // map.getPane('labels').style.zIndex = 650; // This pane is above markers but below popups
    // map.getPane('labels').style.pointerEvents = 'none'; // Layers in this pane are non-interactive and do not obscure mouse/touch events

    //ZONES
    await loadZones(map);

    //NATURE RESERVE
    await loadNatureReserve(map);

    //FIRE ROADS
    await loadFireRoads(map);
    //CAMP CLUSTERS
    await loadCampClusters(map);

    //MAP BASE LAYER
    // var mapBoxtiles = L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw', {
    //     maxZoom: 20,
    //     attribution: 'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    //     id: 'mapbox/satellite-v9',
    //     tileSize: 512,
    //     zoomOffset: -1
    // }).addTo(map);

    const googleSatellite = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
};
