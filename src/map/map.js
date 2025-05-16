import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-copy-coordinates-control';
import '@geoman-io/leaflet-geoman-free';
import ToKML from '@maphubs/tokml';
import { addPowerGridTomap } from './_addPowerGrid';
import { addPointsOfInterestsTomap } from './_addPOI';
import { addLegends } from './_addLegends';
import { loadGeoJsonFeatureCollections } from '../loaders/loadGeoJsonFeatureCollections';
import { loadImageOverlay } from '../loaders/loadImageOverlay';
import { hash, ButtonsFactory } from '../utils';
import { showNotification, showDrawer } from '../messages';
import { Editor } from '../editor';
import { filterFeatures } from './filterFeatures';
import { addPolygonFeatureLabelOverlayToMap } from './_addLabels';
import { getSoundStyle } from '../loaders/_layerStyles';
import { getSoundspotDescription, soundSpotType } from '../utils/soundData';

/** Initializes the leaflet map and load data to create layers */
export const createMap = async () => {
    // Define the default visible map layers
    let visibleLayers = new Set([
        'Placement',
        'Placement_map',
        'POI',
        'Neighbourhoods',
        'Plazas',
        'Names',
    ]);

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

    // Loads: "slope", "parking", "closetosanctuary"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/placement_areas.geojson');
    // Loads "propertyborder", "naturereserve", "friends", "forbidden", "friends"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/borders.geojson');

    // Loads "fireroad"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/Fireroads_BL25_export.geojson', { buffer: 2.5 });
    // Loads "publicplease", "oktocamp"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/Fireroads_BL25_export.geojson', {
        buffer: 3.5,
        propertyRenameFn: () => 'publicplease',
    });
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/Fireroads_BL25_export.geojson', {
        buffer: 52.5,
        propertyRenameFn: () => 'oktocamp',
    });

    // Loads "minorroad"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/Minorroads_BL25_export.geojson', { buffer: 1 });
    // Loads "plaza"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/Plazas_BL25_export.geojson');
    // Loads "neighbourhood"
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl25/neighbourhoods.geojson');


    // Loads sound_c, sound_d, sound_e
    await loadGeoJsonFeatureCollections(map, 'soundlevel', './data/bl25/soundguide.geojson', {
        styleFn: getSoundStyle,
    });
    // Add soundspots and add it to the soundguide layer
    await addPointsOfInterestsTomap('./data/bl25/poi/soundspots.json', map.groups.soundspots, {
        description: getSoundspotDescription,
        link: '#page:soundspot',
    });
    map.groups.soundspots.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundspots);
    // Soundspots have to be added as a Feature as well, in order to have properties (For isBreakingSoundLimit)
    await loadGeoJsonFeatureCollections(map, "type", './data/bl25/poi/soundspots.json', {
        propertyRenameFn: () => soundSpotType,
        buffer: 10,
        styleFn: getSoundStyle,
    });
    map.groups[soundSpotType].addTo(map.groups.soundguide);
    map.removeLayer(map.groups[soundSpotType]);


    // Combine the Placement Area layers
    map.groups.propertyborder.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.propertyborder);
    map.groups.minorroad.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.minorroad);
    map.groups.fireroad.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.fireroad);
    map.groups.publicplease.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.publicplease);
    map.groups.oktocamp.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.oktocamp);
    //map.groups.closetosanctuary.addTo(map.groups.mapstuff);
    //map.removeLayer(map.groups.closetosanctuary);
    // map.groups.area.addTo(map.groups.mapstuff);
    // map.removeLayer(map.groups.area);
    // map.groups.hiddenforbidden.addTo(map.groups.mapstuff);

    // Add known objects
    // Objects have no rules, they just draw small guiding shapes on the map
    map.groups.parking.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.parking);
    map.groups.bridge.addTo(map.groups.mapstuff);
    map.removeLayer(map.groups.bridge);

    //Create a layer group for areas where camping is not allowed
    map.groups.hiddenforbidden = filterFeatures(
        map.groups.neighbourhood,
        (feature) => feature.properties && feature.properties.camping_allowed === false,
    );

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

    map.groups.aftermath24 = L.tileLayer('./data/bl24/aftermath/{z}/{x}/{y}.png', {
        minZoom: 0,
        maxZoom: 21,
        minNativeZoom: 0,
        maxNativeZoom: 19,
        tms: false,
    });

    // Load and add the after match layer for borderland 23
    map.groups.aftermath23 = L.tileLayer('./data/bl23/aftermath/{z}/{x}/{y}.png', {
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
    // Add labels to each neighborhood polygon
    addPolygonFeatureLabelOverlayToMap(map.groups.neighbourhoods, map.groups.neighbourhood, 'white', 1);
    addPolygonFeatureLabelOverlayToMap(map.groups.plazas, map.groups.plaza, 'white', 0.2);

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
        Aftermath22: map.groups.aftermath22,
        Aftermath23: map.groups.aftermath23,
        Aftermath24: map.groups.aftermath24,
    };

    // Initialize the editor
    const editor = new Editor(map, map.groups);

    // Add the guide button
    map.addControl(
        ButtonsFactory.guide(() => {
            showDrawer({
                file: 'guide-home',
                position: 'end',
                onClose: () => {
                    localStorage.setItem('hasSeenPlacementWelcome', 'true');
                },
            });
        }),
    );

    // Add the download button
    map.addControl(
        ButtonsFactory.download(async () => {
            const quit = !confirm(
                'This will download all the current map information as several KML and GeoJSON files, are you sure?',
            );
            if (quit) {
                return;
            }
            const exportableLayers = [
                ['mapstuff'],
                ['poi'],
                ['powergrid'],
                ['soundguide'],
                ['plazas'],
                ['names'],
                ['neighbourhoods'],
                ['placement'],
            ];
            showNotification('Downloading map data...');
            for (const [groupName] of exportableLayers) {
                try {
                    const layer = map.groups[groupName];
                    const geojson = layer.toGeoJSON();
                    var kml = ToKML(geojson, {
                        documentName: groupName,
                        name: 'name',
                        description: 'description',
                    });
                    for (const [data, filetype] of [
                        [kml, '.kml'],
                        [JSON.stringify(geojson), '.geojson'],
                    ]) {
                        const link = document.createElement('a');
                        const uri = 'data:text/kml;charset=utf-8,' + encodeURIComponent(data);
                        link.download = groupName + filetype;
                        link.target = '_blank';
                        link.href = uri;
                        link.click();
                        console.log('Downloading map data from layergroup ' + groupName);
                        await new Promise((r) => setTimeout(r, 500));
                    }
                } catch (err) {
                    console.error(err);
                    console.warn('Failed to download map data from layergroup ' + groupName);
                }
            }
        }),
    );

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
    await addPointsOfInterestsTomap('./data/bl25/poi/poi.json', map.groups.poi);

    // Add the power grid to the map
    await addPowerGridTomap(map.groups.powergrid);

    // Add layer control and legends
    await addLegends(map, availableLayers, visibleLayers);

    // To speed up the loading time, remove camp name layer while loading entities
    map.removeLayer(availableLayers['Names']);
    // Load all entities from the API
    await editor.addAPIEntities();
    map.addLayer(availableLayers['Names']);

    // Access the query string and zoom to entity if id is present
    const urlParams = new URLSearchParams(window.location.search);
    const id = Number(urlParams.get('id'));
    if (id) {
        editor.gotoEntity(id);
    }

    // Done!
    await showNotification('Loaded everything!', 'success');
};
