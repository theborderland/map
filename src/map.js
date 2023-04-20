import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-hash-plus';
import '@geoman-io/leaflet-geoman-free';
// import 'leaflet-search';

import { loadGeoJsonFeatureCollections } from './loaders/loadGeoJsonFeatureCollections';
import { getStyleFunction } from './layerstyles';

import { loadPositionControl } from './utils/loadPositionControl';
import { loadImageOverlay } from './loaders/loadImageOverlay';
import { loadDrawnMap } from './loaders/loadDrawnMap';

import { addLegends } from './loaders/addLegends';
// import { addSearch } from './utils/searchControl';

import { Editor } from './editor';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true }).setView(
        [57.621111, 14.927857],
        17,
    );

    // Map feature layers, the below functions add
    map.groups = {};

    await loadGeoJsonFeatureCollections(map, getStyleFunction, 'type', './data/bl23/borders.geojson');
    await loadGeoJsonFeatureCollections(map, getStyleFunction, 'type', './data/bl23/placement.geojson');

    const editor = new Editor(map, map.groups);

    // Base layers
    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    map.groups.drawnmap = await loadDrawnMap(map);
    
    var baseLayers = { 'Satellite map': map.groups.googleSatellite, 'Drawn map': map.groups.drawnmap };

    // Extra layers
    map.groups.slopemap = await loadImageOverlay(map, './data/slopemap.png', [
        [57.6183258637506626, 14.9211877664388641],
        [57.6225237073944072, 14.9346879887464876],
    ]);
    map.groups.terrain = await loadImageOverlay(map, './data/terrain.png', [
        [57.6156422900704257, 14.9150971736724536],
        [57.6291230394961715, 14.9362178462290363],
    ]);

    // map.groups.poi_menu = (new L.LayerGroup()).addTo(map);
    // map.groups.power_menu = (new L.LayerGroup());

    var extraLayers = {
        Placement: map.groups.placement,
        Terrain: map.groups.terrain,
        'Slope map': map.groups.slopemap,
        // "Power": map.groups.power_menu,
    };

    // Add layer control and legends
    L.control.layers(baseLayers, extraLayers).addTo(map);
    addLegends(map);

    // Add map features
    // await loadTooltipZoom(map);
    L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);
    await loadPositionControl(map);
    L.control.polylineMeasure().addTo(map);

    // await addSearch(map);
    // let hash = new L.Hash(map);  // Makes the URL follow the map

    // Add editable layers
    await editor.addAPIEntities();

    // startTraking(map);
};
