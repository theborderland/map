import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-copy-coordinates-control';
import '@geoman-io/leaflet-geoman-free';
import { addPowerGridTomap } from './_addPowerGrid';
import { addPointsOfInterestsTomap } from './_addPOI';
import { addQuarterLabelsToMap, addNeighbourhoodLabelsToMap, addPlazaLabelsToMap } from './_addLabels';
import { addLegends } from './_addLegends';

import { loadGeoJsonFeatureCollections } from '../loaders/loadGeoJsonFeatureCollections';

import { loadImageOverlay } from '../loaders/loadImageOverlay';

import { hash } from '../utils';
import { showNotification, showDrawer } from '../messages';
import { Editor } from '../editor';

/** Initializes the leaflet map and load data to create layers */
export const createMap = async () => {
    // Define the default visible map layers
    let visibleLayers = new Set(['Placement', 'Placement_map', 'POI']);

    // Create map
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true, attributionControl: false }).setView(
        [57.6226, 14.9276],
        16,
    );

    // Create map groups
    map.groups = {
        placement: new L.LayerGroup(),
        mapstuff: new L.LayerGroup(),
        neighbourhoods: new L.LayerGroup(),
        quarters: new L.LayerGroup(),
        plazas: new L.LayerGroup(),
        poi: new L.LayerGroup(),
        powergrid: new L.LayerGroup(),
        soundspots: new L.LayerGroup(),
    };

    // Add the Google Satellite layer
    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    // Load contours
    fetch('./data/analysis/contours.geojson')
        .then((response) => response.json())
        .then((response) => {
            L.geoJSON(response.features, { style: { color: '#ffffff', weight: 1, opacity: 0.5 } }).addTo(
                map.groups.mapstuff,
            );
        });

    // Load reference drawings
    // fetch('./data/analysis/references.geojson')
    //     .then((response) => response.json())
    //     .then((response) => {
    //         L.geoJSON(response.features, { style: { color: '#ffffff', weight: 1 } }).addTo(map.groups.mapstuff);
    //     });

    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/placement_areas.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/borders.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/roads_and_distances.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/plazas.geojson');
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl24/neighbourhoods.geojson');

    // Combine the Placement Area layers
    map.groups.propertyborder.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.propertyborder);
    map.groups.minorroad.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.minorroad);
    map.groups.fireroad.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.fireroad);
    // map.groups.publicplease.addTo(map.groups.mapstuff);
    // map.removeLayer(map.groups.publicplease);
    // map.groups.oktocamp.addTo(map.groups.mapstuff);
    // map.removeLayer(map.groups.oktocamp);
    //map.groups.closetosanctuary.addTo(map.groups.mapstuff);
    //map.removeLayer(map.groups.closetosanctuary);
    map.groups.area.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.area);
    map.groups.hiddenforbidden.addTo(map.groups.mapstuff);

    // Add known objects
    map.groups.container.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.container);
    map.groups.parking.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.parking);
    map.groups.toilet.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.toilet);
    map.groups.bridge.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.bridge);

    // Camp names layer - used by the editor to render names of placement
    map.groups.names = new L.LayerGroup();
    map.groups.names.addTo(map);

    // Combine and add sound guide
    map.groups.soundguide = new L.LayerGroup();
    map.groups.bluesoundzone.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.bluesoundzone);
    map.groups.greensoundzone.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.greensoundzone);
    map.groups.yellowsoundzone.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.yellowsoundzone);
    map.groups.orangesoundzone.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.orangesoundzone);
    map.groups.redsoundzone.addTo(map.groups.soundguide);
    //map.removeLayer(map.groups.redsoundzone);

    // TODO: Its unknown what this does
    map.on('overlayadd', function (eventLayer) {
        map.groups.names.setZIndex(101);
        if (eventLayer.name === 'Soundguide') {
            map.groups.bluesoundzone.bringToBack();
            map.groups.greensoundzone.bringToBack();
            map.groups.yellowsoundzone.bringToBack();
            map.groups.orangesoundzone.bringToBack();
            map.groups.redsoundzone.bringToBack();
        }
    });

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

    map.groups.plaza.addTo(map.groups.plazas);
    map.removeLayer(map.groups.plaza);
    map.groups.neighbourhood.addTo(map.groups.neighbourhoods);
    map.removeLayer(map.groups.neighbourhood);

    var availableLayers = {
        Placement_map: map.groups.mapstuff,
        POI: map.groups.poi,
        PowerGrid: map.groups.powergrid,
        Soundguide: map.groups.soundguide,
        Slope: map.groups.slopemap,
        Height: map.groups.heightmap,
        Terrain: map.groups.terrain,
        Plazas: map.groups.plazas,
        Placement: map.groups.placement,
        Names: map.groups.names,
        Neighbourhoods: map.groups.neighbourhoods,
        Quarters: map.groups.quarters,
        Aftermath22: map.groups.aftermath22,
        Aftermath23: map.groups.aftermath,
    };

    // Initialize the editor
    const editor = new Editor(map, map.groups);

    // Add the guide button
    const guideButton = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: () => {
            let btn = L.DomUtil.create('button', 'leaflet-bar help-button');
            btn.title = 'Guide to the placement process';
            btn.textContent = '⛑️';
            L.DomEvent.disableClickPropagation(btn);

            btn.onclick = () => {
                showDrawer({
                    file: 'guide-home',
                    position: 'end',
                    onClose: () => {
                        localStorage.setItem('hasSeenPlacementWelcome', 'true');
                    },
                });
            };

            return btn;
        },
    });
    map.addControl(new guideButton());

    // Add the measure tool
    let polylineMeasure = L.control.polylineMeasure({ measureControlLabel: '&#128207;', arrow: { color: '#0000' } });
    polylineMeasure.addTo(map);

    // Add the coordinates tool
    let coordinatesControl = new L.Control.Coordinates({
        position: 'topright',
        latitudeText: 'lat',
        longitudeText: 'lng',
        promptText: 'Current Coordinaes:',
        precision: 10,
    });
    coordinatesControl.addTo(map);
    console.log(coordinatesControl);

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

    // Link the map to the URL hash
    hash.map = map;

    // Force the URL hash to update on the initial load.
    hash.layers = visibleLayers;

    // Log the the lat and long to the console when clicking the map or a layer or marker
    map.on('click', function (e) {
        console.log(e.latlng);
        coordinatesControl.setCoordinates(e);
    });

    // Add points of interests to the map
    await addPointsOfInterestsTomap('poi.json', map.groups.poi);

    // Add the power grid to the map
    await addPowerGridTomap(map.groups.powergrid);

    // Add soundspots and add it to the soundguide layer
    await addPointsOfInterestsTomap('soundspots.json', map.groups.soundspots);
    map.groups.soundspots.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundspots);

    // Add text labels to the map
    addQuarterLabelsToMap(map.groups.quarters);
    addPlazaLabelsToMap(map.groups.plazas);
    addNeighbourhoodLabelsToMap(map.groups.neighbourhoods);

    // Add layer control and legends
    await addLegends(map, availableLayers, visibleLayers);

    // Load all entities from the API
    await editor.addAPIEntities();
    map.groups.placement.addTo(map);

    // Access the query string and zoom to entity if id is present
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        editor.gotoEntity(id);
    }

    // Done!
    showNotification('Loaded everything!', 'success');
};
