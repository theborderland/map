import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-copy-coordinates-control';
import '@geoman-io/leaflet-geoman-free';
import { LocateControl } from 'leaflet.locatecontrol';
import { addLegends } from './_addLegends';
import { hash, ButtonsFactory } from '../utils';
import { Editor } from '../editor';
import { addPolygonFeatureLabelOverlayToMap } from './_addLabels';
import { loadBaseLayers } from '../loaders/loadBaseLayers';

/** Initializes the leaflet map and load data to create layers */
export const createMap = async (_isCleanAndQuietMode) => {
    const LAYER_NAMES = {
        warnings: 'Warnings colors',
        placement: 'Camps',
        names: 'Camp names',
        mapstuff: 'Roads etc.',
        neighbourhoods: 'Neighbourhoods',
        plazas: 'Plazas',
        poi: 'Places of Interest',
        powergrid: 'Power grid',
        soundguide: 'Soundguide',
        aftermath22: "Aftermath '22",
        aftermath23: "Aftermath '23",
        aftermath24: "Aftermath '24",
        aftermath25: "Aftermath '25",
        slopemap: 'Slope',
        heightmap: 'Height',
        terrain: 'Terrain',
        drawnmap: 'Handdrawn',
    }

    // Define the default layers to be visible on load if no layers are specified in the URL hash
    let defaultLayers = new Set([
        LAYER_NAMES.warnings,
        LAYER_NAMES.placement,
        LAYER_NAMES.mapstuff,
        LAYER_NAMES.poi,
        LAYER_NAMES.neighbourhoods,
        LAYER_NAMES.plazas,
        LAYER_NAMES.names,
    ]);
    let visibleLayers = new Set([]);

    // Create map
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true, attributionControl: false }).setView(
        [57.6226, 14.9276],
        16,
    );

    map.setMaxBounds([
        [57.3, 14.6],
        [58, 15.2],
    ]);

    // Create map groups
    map.groups = {
        placement: new L.LayerGroup(),
        mapstuff: new L.LayerGroup(),
        neighbourhoods: new L.LayerGroup(),
        plazas: new L.LayerGroup(),
        poi: new L.LayerGroup(),
        powergrid: new L.LayerGroup(),
        soundspots: new L.LayerGroup(),
        soundguide: new L.LayerGroup(),
        names: new L.LayerGroup(),
    };
    
    // Load all layers and stuff
    await loadBaseLayers(map, _isCleanAndQuietMode);

    // Bring the sound guide layer to the back when it is added so the placement and POI is "on top"
    map.on('overlayadd', function (eventLayer) {
        map.groups.names.setZIndex(101);
        if (eventLayer.name === 'Soundguide') {
            soundLayers.forEach((layer) => {
                map.groups[layer].bringToBack();
            });
        }
    });
    const soundLayers = ['sound_e', 'sound_d', 'sound_c'];
    soundLayers.forEach((layer) => {
        map.groups[layer].addTo(map.groups.soundguide);
    });

    map.groups.plaza.addTo(map.groups.plazas);
    map.removeLayer(map.groups.plaza);
    map.groups.neighbourhood.addTo(map.groups.neighbourhoods);
    map.removeLayer(map.groups.neighbourhood);
    // Add labels to each neighborhood polygon
    addPolygonFeatureLabelOverlayToMap(map.groups.neighbourhoods, map.groups.neighbourhood, 'white', 1);
    addPolygonFeatureLabelOverlayToMap(map.groups.plazas, map.groups.plaza, 'white', 0.2);

    var availableLayers = [
        // Type determines in which group the layer appears in the layerControl.
        { name: LAYER_NAMES.warnings, layer: L.layerGroup(), type: 'Misc.' }, // Dummy layer for toggling warnings
        { name: LAYER_NAMES.placement, layer: map.groups.placement, type: 'Placement' },
        { name: LAYER_NAMES.names, layer: map.groups.names, type: 'Placement' },
        { name: LAYER_NAMES.mapstuff, layer: map.groups.mapstuff, type: 'Placement' },
        { name: LAYER_NAMES.neighbourhoods, layer: map.groups.neighbourhoods, type: 'Placement' },
        { name: LAYER_NAMES.plazas, layer: map.groups.plazas, type: 'Placement' },
        { name: LAYER_NAMES.poi, layer: map.groups.poi, type: 'Placement' },
        { name: LAYER_NAMES.powergrid, layer: map.groups.powergrid, type: 'Placement' },
        { name: LAYER_NAMES.soundguide, layer: map.groups.soundguide, type: 'Placement' },
        { name: LAYER_NAMES.slopemap, layer: map.groups.slopemap, type: 'Background' },
        { name: LAYER_NAMES.heightmap, layer: map.groups.heightmap, type: 'Background' },
        { name: LAYER_NAMES.terrain, layer: map.groups.terrain, type: 'Background' },
        { name: LAYER_NAMES.drawnmap, layer: map.groups.drawnmap, type: 'Background' },
        { name: LAYER_NAMES.aftermath22, layer: map.groups.aftermath22, type: 'Background' },
        { name: LAYER_NAMES.aftermath23, layer: map.groups.aftermath23, type: 'Background' },
        { name: LAYER_NAMES.aftermath24, layer: map.groups.aftermath24, type: 'Background' },
        { name: LAYER_NAMES.aftermath25, layer: map.groups.aftermath25, type: 'Background' },
    ];

    // Make all layers in the URL hash visible on load
    map.on('hashmetainit', function (initState) {
        hash.decode(initState.meta);
        // Find all layers in the URL hash that also exist in availableLayers, and add them to visibleLayers
        availableLayers.filter(layer => hash.layers.includes(layer.name)).forEach(layer => { visibleLayers.add(layer.name); });

        if (visibleLayers.size === 0) {
            // Add the default layers to the map
            visibleLayers = new Set(defaultLayers);
        }
        availableLayers.filter(layer => visibleLayers.has(layer.name)).forEach((layer) => map.addLayer(layer.layer));
    });

    // Add any visible layers to in the URL hash
    map.on('overlayadd', function (event) {
        visibleLayers.add(event.name);
        hash.layers = visibleLayers;
        if (event.name === LAYER_NAMES.warnings) {
            editor.hideWarningColors(false);
        }
    });

    // Remove any hidden layers from the URL hash
    map.on('overlayremove', function (event) {
        visibleLayers.delete(event.name);
        hash.layers = visibleLayers;
        if (event.name === LAYER_NAMES.warnings) {
            editor.hideWarningColors(true);
        }
    });

    // Link the map to the URL hash
    hash.map = map;

    // Force the URL hash to update on the initial load.
    hash.layers = visibleLayers;

    // Log the the lat and long to the console when clicking the map or a layer or marker
    map.on('click', function (e) {
        console.log(e.latlng);
        coordinatesControl?.setCoordinates(e);
    });

    let coordinatesControl;
    // Do not add any controls if the map is in "clean and quiet" mode.
    if (!_isCleanAndQuietMode) {
        map.addControl(ButtonsFactory.guide());
        map.addControl(ButtonsFactory.download(map));

        // Add the measure tool
        map.addControl(L.control.polylineMeasure({ measureControlLabel: '&#128207;', arrow: { color: '#0000' } }));

        // Add the coordinates tool
        coordinatesControl = new L.Control.Coordinates({
            position: 'topright',
            latitudeText: 'lat',
            longitudeText: 'lng',
            promptText: 'Current Coordinates:',
            precision: 10,
        });
        map.addControl(coordinatesControl);

        // Add the "Show your location" controls
        map.addControl(new LocateControl({
            strings: {
                title: 'Show your location',
            },
            locateOptions: {
                watch: true,
                enableHighAccuracy: true,
            },
            keepCurrentZoomLevel: true
        }));

        // Add layer control and legends
        let layerControl = addLegends(map, availableLayers, visibleLayers);
        map.addControl(layerControl);
    }

    // Add a stopwatch to measure loading time
    const stopwatch = {
        start: performance.now(),
        stop: null,
        log: function () {
            this.stop = performance.now();
            console.log(`Map loading time: ${(this.stop - this.start).toFixed(2)} ms`);
        }
    };

    // To speed up the loading time, remove camp name layer while loading entities
    const hasNamesLayer = visibleLayers.has(LAYER_NAMES.names);
    if (hasNamesLayer) {
        map.removeLayer(availableLayers.find(layer => layer.name === LAYER_NAMES.names).layer);
    }

    // Load all entities from the API
    let hideWarningColors = !visibleLayers.has(LAYER_NAMES.warnings) ;
    const editor = new Editor(map, hideWarningColors, _isCleanAndQuietMode);
    await editor.addAPIEntities();

    if (hasNamesLayer) {
        map.addLayer(availableLayers.find(layer => layer.name === LAYER_NAMES.names).layer);
    }
    // Finally, add all layers that should be visible
    visibleLayers.forEach(layerName => {
        const layer = availableLayers.find(layer => layer.name === layerName);
        if (layer) {
            map.addLayer(layer.layer);
        }
    });

    // Placement layer is special.
    // Even though it might not be visible by default, it is always shown because we add it when loading entities.
    // So to hide it, we need to add it explicitly only to remove it again.
    if (!visibleLayers.has(LAYER_NAMES.placement)) {
        let placementLayer = availableLayers.find(layer => layer.name === LAYER_NAMES.placement).layer;
        map.addLayer(placementLayer);
        map.removeLayer(placementLayer);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const id = Number(urlParams.get('id'));
    if (id) {
        if (_isCleanAndQuietMode) {
            editor.ClearControls();
            visibleLayers.add(LAYER_NAMES.drawnmap);
            visibleLayers.delete(LAYER_NAMES.names);
        }
        // Zoom to entity if id is present
        if (id) editor.gotoEntity(id);
    }

    // Done!
    //await showNotification('Loaded everything!', 'success');
    stopwatch.log();
};
