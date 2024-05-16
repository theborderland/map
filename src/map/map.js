import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import '@geoman-io/leaflet-geoman-free';

import { addLegends } from './_addLegends';

import { loadPoiFromGoogleCsv } from '../loaders/loadPoiFromGoogleCsv';
import { loadGeoJsonFeatureCollections } from '../loaders/loadGeoJsonFeatureCollections';

import { loadImageOverlay } from '../loaders/loadImageOverlay';

import { hash } from '../utils';
import { showNotification, showDrawer } from '../messages';
import { Editor } from '../editor';

/** Initializes the leaflet map and load data to create layers */
export const createMap = async () => {
    // Define the default visible map layers
    let visibleLayers = new Set(['Placement', 'Placement_map']);

    // Create map
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true, attributionControl: false }).setView(
        [57.6226, 14.9276],
        16,
    );

    // Create map groups
    map.groups = {
        placement: new L.LayerGroup(),
        mapstuff: new L.LayerGroup(),
    };

    // Add the Google Satellite layer
    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    // FIXME: Re-add
    await loadPoiFromGoogleCsv(map);

    //  Load place names
    fetch('./data/bl23/placenames.geojson')
        .then((response) => response.json())
        .then((response) => {
            L.geoJSON(response.features, { style: { color: '#ffffff', weight: 2 } }).addTo(map.groups.mapstuff);
        });

    // Load contours
    fetch('./data/analysis/contours.geojson')
        .then((response) => response.json())
        .then((response) => {
            L.geoJSON(response.features, { style: { color: '#ffffff', weight: 1, opacity: 0.5 } }).addTo(
                map.groups.mapstuff,
            );
        });

    // Load reference drawings
    fetch('./data/bl23/references.geojson')
        .then((response) => response.json())
        .then((response) => {
            L.geoJSON(response.features, { style: { color: '#ffffff', weight: 1 } }).addTo(map.groups.mapstuff);
        });

    await loadGeoJsonFeatureCollections(map, 'type', './data/fire.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl23/borders.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl23/placement.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/fire.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/roads.geojson');

    // Combine the Sound guide layers
    map.groups.soundguide = new L.LayerGroup();
    map.groups.soundhigh.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundhigh);
    map.groups.soundmedium.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundmedium);
    map.groups.soundmediumlow.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundmediumlow);
    map.groups.soundlow.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundlow);
    map.groups.soundquiet.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundquiet);

    // TODO: Its unknown what this does
    map.on('overlayadd', function (eventLayer) {
        if (eventLayer.name === 'Soundguide') {
            map.groups.soundhigh.bringToBack();
            map.groups.soundmedium.bringToBack();
            map.groups.soundmediumlow.bringToBack();
            map.groups.soundlow.bringToBack();
            map.groups.soundquiet.bringToBack();
        }
    });

    // Combine the Placement Guide layers
    map.groups.fireroad.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.fireroad);
    map.groups.road.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.road);
    map.groups.propertyborder.addTo(map.groups.mapstuff);
    map.groups.highprio.addTo(map.groups.mapstuff);
    map.groups.lowprio.addTo(map.groups.mapstuff);
    map.groups.hiddenforbidden.addTo(map.groups.mapstuff);
    map.groups.container.addTo(map.groups.mapstuff);
    map.groups.parking.addTo(map.groups.mapstuff);
    map.groups.toilet.addTo(map.groups.mapstuff);
    map.groups.bridge.addTo(map.groups.mapstuff);

    // Area names layer
    map.groups.names = new L.LayerGroup();
    map.groups.names.addTo(map);

    // Load and add the terrain layer
    map.groups.terrain = await loadImageOverlay(map, './data/terrain.png', [
        [57.6156422900704257, 14.9150971736724536],
        [57.6291230394961715, 14.9362178462290363],
    ]);

    // Load and add the height map layer
    map.groups.heightmap = L.tileLayer('./data/analysis/height/{z}/{x}/{y}.jpg', {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 16,
        maxNativeZoom: 17,
        tms: false,
    });

    // Load and add the slop map layer
    map.groups.slopemap = L.tileLayer('./data/analysis/slope/{z}/{x}/{y}.png', {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 16,
        maxNativeZoom: 17,
        tms: false,
    });

    // Load and add the after match layer for borderland 23
    map.groups.aftermath = L.tileLayer('./data/bl23/aftermath/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 21,
        minNativeZoom: 0,
        maxNativeZoom: 20,
        tms: false,
    });

    // Load and add the after match layer for borderland 22
    map.groups.aftermath22 = L.tileLayer('./data/bl22/aftermath/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 21,
        minNativeZoom: 0,
        maxNativeZoom: 20,
        tms: false,
    });

    map.groups.power = new L.LayerGroup();
    map.groups.sound = new L.LayerGroup();
    map.groups.clean = new L.LayerGroup();

    var availableLayers = {
        Placement: map.groups.placement,
        Placement_map: map.groups.mapstuff,
        POI: map.groups.poi,
        Soundguide: map.groups.soundguide,
        Slope: map.groups.slopemap,
        Height: map.groups.heightmap,
        Terrain: map.groups.terrain,
        Aftermath22: map.groups.aftermath22,
        Aftermath23: map.groups.aftermath,
        // Names: map.groups.names,
        // Check_Power: map.groups.power,
        // Check_Sound: map.groups.sound,
        // Check_Clean: map.groups.clean,
    };

    // Initialize the editor
    const editor = new Editor(map, map.groups);

    // Add the measure tool
    let polylineMeasure = L.control.polylineMeasure({ measureControlLabel: '&#128207;', arrow: { color: '#0000' } });
    polylineMeasure.addTo(map);

    // Make all layers in the URL hash visible on load
    map.on('hashmetainit', function (initState) {
        hash.decode(initState.meta);
        hash.layers.filter((name) => name in availableLayers).forEach((layerName) => visibleLayers.add(layerName));
        visibleLayers.forEach((layer) => map.addLayer(availableLayers[layer]));
    });

    // Add any visible layers to in the URL hash
    map.on('overlayadd', function (event) {
        visibleLayers.add(event.name);
        hash.layers = visibleLayers;
    });

    // Remove any hidden layers from the URL hash
    map.on('overlayremove', function (event) {
        visibleLayers.delete(event.name);
        hash.layers = visibleLayers;
    });

    // ON LOAD

    // Load all entities from the API
    await editor.addAPIEntities();
    // Link the map to the URL hash
    hash.map = map;

    // Force the URL hash to update on the initial load.
    hash.layers = visibleLayers;


    // Access the query string and zoom to entity if id is present
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        editor.gotoEntity(id);
    }

    // Log the the lat and long to the console when clicking the map or a layer or marker
    // map.on('click', function (e) {
    //     console.log(e.latlng);
    // });

    // Add layer control and legends
    await addLegends(map, availableLayers);

    // Done!
    showNotification('Loaded everything!', 'success');
};
