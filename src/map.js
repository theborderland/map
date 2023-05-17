import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import '@geoman-io/leaflet-geoman-free';

import { showBetaMsg } from './betaMsg';

import { loadPoiFromGoogleCsv } from './loaders/loadPoiFromGoogleCsv';
import { loadGeoJsonFeatureCollections } from './loaders/loadGeoJsonFeatureCollections';
import { getStyleFunction } from './layerstyles';

import { loadImageOverlay } from './loaders/loadImageOverlay';

import { addLegends } from './loaders/addLegends';

import { Editor } from './editor';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true, attributionControl: false })
    .setView([57.6226, 14.9276], 16);
    
    map.groups = {};

    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);

    await loadPoiFromGoogleCsv(map);

    showBetaMsg();

    new L.Hash(map);  // Makes the URL follow the map.

    //Load placenames
    fetch('./data/bl23/placenames.geojson').then(response => response.json()).then(response => {
      L.geoJSON(response.features, {style: {"color": "#ffffff", "weight": 2}}).addTo(map);
    });

    //Load contours
    fetch('./data/analysis/contours.geojson').then(response => response.json()).then(response => {
      L.geoJSON(response.features, {style: {"color": "#ffffff", "weight": 1, "opacity": 0.5}}).addTo(map);
    });
    
    //Load reference drawings
    fetch('./data/bl23/references.geojson').then(response => response.json()).then(response => {
      L.geoJSON(response.features, {style: {"color": "#ffffff", "weight": 1}}).addTo(map);
    });

    await loadGeoJsonFeatureCollections(map, getStyleFunction, 'type', './data/bl23/borders.geojson');
    await loadGeoJsonFeatureCollections(map, getStyleFunction, 'type', './data/bl23/placement.geojson');
    
    //Set up the soundguide layers added from placement.geojson
    map.groups.soundguide = new L.LayerGroup();
    map.groups.soundhigh.addTo(map.groups.soundguide);
    map.groups.soundmedium.addTo(map.groups.soundguide);
    map.groups.soundmediumlow.addTo(map.groups.soundguide);
    map.groups.soundlow.addTo(map.groups.soundguide);
    map.groups.soundquiet.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundhigh);
    map.removeLayer(map.groups.soundmedium);
    map.removeLayer(map.groups.soundmediumlow);
    map.removeLayer(map.groups.soundlow);
    map.removeLayer(map.groups.soundquiet);


    //Initialize the editor (it loads it data at the end)
    const editor = new Editor(map, map.groups);

    // Extra layers
    map.groups.terrain = await loadImageOverlay(map, './data/terrain.png', [
        [57.6156422900704257, 14.9150971736724536],
        [57.6291230394961715, 14.9362178462290363],
    ]);

    map.groups.heightmap = L.tileLayer('./data/analysis/height/{z}/{x}/{y}.jpg', {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 16,
        maxNativeZoom: 17,
        tms: false
    });

    map.groups.slopemap = L.tileLayer('./data/analysis/slope/{z}/{x}/{y}.png', {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 16,
        maxNativeZoom: 17,
        tms: false
    });

    map.groups.power = new L.LayerGroup();
    map.groups.sound = new L.LayerGroup();
    map.groups.clean = new L.LayerGroup();
    map.groups.names = new L.LayerGroup();

    var extraLayers = {
        Slope: map.groups.slopemap,
        Height: map.groups.heightmap,
        Soundguide: map.groups.soundguide,
        Terrain: map.groups.terrain,
        Placement: map.groups.placement,
        Names: map.groups.names,
        POI: map.groups.poi,
        Check_Power: map.groups.power,
        Check_Sound: map.groups.sound,
        Check_Clean: map.groups.clean,
    };

    map.on('overlayadd', function (eventLayer) 
    {
        if (eventLayer.name === 'Check_Power') editor.setLayerFilter('power', false);
        else if (eventLayer.name === 'Check_Sound') editor.setLayerFilter('sound', false);
        else if (eventLayer.name === 'Check_Clean') editor.setLayerFilter('cleancolors', false);

        if (eventLayer.name === 'Soundguide') {
            map.groups.soundhigh.bringToBack();
            map.groups.soundmedium.bringToBack();
            map.groups.soundmediumlow.bringToBack();
            map.groups.soundlow.bringToBack();
            map.groups.soundquiet.bringToBack();
        }
    });

    map.on('overlayremove', function (eventLayer) 
    {
        if (eventLayer.name === 'Check_Power' || eventLayer.name === 'Check_Sound' || eventLayer.name === 'Check_Clean') editor.setLayerFilter('severity', false);
    });

    // Add layer control and legends
    L.control.layers(undefined, extraLayers).addTo(map);

    addLegends(map);

    // Add map features
    // L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);
    
    // Reactivate closer to BL. Double check this functionality, reportedly buggy.
    // L.control.locate({ setView: 'once', keepCurrentZoomLevel: true,	returnToPrevBounds: true, drawCircle: true,	flyTo: true}).addTo(map);
    
    let polylineMeasure = L.control.polylineMeasure({measureControlLabel: '&#128207;', arrow: {color: '#0000',} });
    polylineMeasure.addTo(map);
   
    //Load all entities from the API
    await editor.addAPIEntities();
    
    //Access the query string and zoom to entity if id is present
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        editor.gotoEntity(id);
    }
};
