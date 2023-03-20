import L from 'leaflet';
import 'leaflet.locatecontrol';
import 'leaflet.polylinemeasure';
import 'leaflet-hash-plus';
import '@geoman-io/leaflet-geoman-free';
// import 'leaflet-search';

import { loadZones, loadZoneNames } from './loaders/loadZones';
// import { loadNatureReserve } from './loaders/loadNatureReserve';
// import { loadSoundGuide } from './loaders/loadSoundGuide';
// import { loadFireRoads } from './loaders/loadFireRoads';
// import { loadCampClusters } from './loaders/loadCampClusters';
// import { loadTooltipZoom } from './utils/loadTooltipZoom';
// import { loadBoarderlandMarker, loadDiscoDiffusion } from './utils/misc';
// import { loadCampNames, loadClusterNames } from './utils/loadCampMarkers';
import { loadPositionControl } from './utils/loadPositionControl';
import { loadImageOverlay } from './loaders/loadImageOverlay';
import { loadDrawnMap } from './loaders/loadDrawnMap';
// import { addLegends } from './loaders/addLegends';
// import { addSearch } from './utils/searchControl';
// import { loadPoi } from './loaders/loadPoi';
// import { startTracking } from './loaders/loadTrackers';
// import { loadPowerZoneNames, loadPowerClustersNames, loadPowerCampNames, loadPowerBoarderlandMarker } from './utils/power';

export const createMap = async () => {
    const map = L.map('map', { zoomControl: false, maxZoom: 21, drawControl: true }).setView([57.621111, 14.927857], 17);
    
    // Disable edit mode on all layers by default
    L.PM.setOptIn(true);

    // To enable edit mode on a layer, use:
    // layer.options.pmIgnore = false;
    // L.PM.reInitLayer(layer); 
    
    // Map feature layers
    map.groups = {};
    map.groups.zones = (await loadZones(map)).addTo(map);
    // map.groups.zoneNames = (await loadZoneNames(map)).addTo(map);
    // map.groups.natureReserve = (await loadNatureReserve(map)).addTo(map);
    // map.groups.fireRoads = (await loadFireRoads(map)).addTo(map);

    // Toggable layers
    // map.groups.boarderlandMarker = (await loadBoarderlandMarker(map));
    // map.groups.clusters = (await loadCampClusters(map)).addTo(map);
    // map.groups.clusterNames = (await loadClusterNames(map)).addTo(map);
    // map.groups.campNames = (await loadCampNames(map));
	// map.groups.poi = (await loadPoi(map)).addTo(map);
	// map.groups.powerZoneNames = (await loadPowerZoneNames(map));
    // map.groups.powerClustersNames = (await loadPowerClustersNames(map));
    // map.groups.powerCampNames = (await loadPowerCampNames(map));
    // map.groups.powerBoarderlandMarker = (await loadPowerBoarderlandMarker(map));
   
    // Base layers
    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
    map.groups.drawnmap = await loadDrawnMap(map);
    var baseLayers = {"Satellite map": map.groups.googleSatellite, "Drawn map": map.groups.drawnmap};

    // Extra layers
    // map.groups.sound = await loadSoundGuide(map);
    map.groups.slopemap = await loadImageOverlay(map, './data/slopemap.png', [[57.6183258637506626, 14.9211877664388641], [57.6225237073944072,14.9346879887464876]]);
    map.groups.terrain = await loadImageOverlay(map, './data/terrain.png', [[57.6156422900704257, 14.9150971736724536], [57.6291230394961715,14.9362178462290363]]);
    // map.groups.hippo = await loadImageOverlay(map, './img/hippo.png', [[57.62241, 14.92153], [57.61908,14.93346]]);
    // map.groups.discoDiffusion = await loadDiscoDiffusion(map);
    // map.groups.poi_menu = (new L.LayerGroup()).addTo(map);
    // map.groups.power_menu = (new L.LayerGroup());
    var extraLayers = {
                        // "Areas": map.groups.clusters,
                        // "Sound guide": map.groups.sound,
                        "Terrain": map.groups.terrain,
                        "Slope map": map.groups.slopemap
                        // "POI": map.groups.poi_menu,
                        // "Power": map.groups.power_menu,
                        // "Hippo": map.groups.hippo
                      };

    // if (new Date('2022-07-28') < new Date())
    // {
    //     extraLayers["Friday Forecast"] = map.groups.discoDiffusion;
    // }

    // Add layer control and legends
    L.control.layers(baseLayers, extraLayers).addTo(map);
    // addLegends(map);

    // Add map features
    // await loadTooltipZoom(map);
    L.control.scale({metric: true, imperial: false}).addTo(map);
    await loadPositionControl(map);
    L.control.polylineMeasure().addTo(map);
    // await addSearch(map);
    // let hash = new L.Hash(map);  // Makes the URL follow the map
    
    // add Leaflet-Geoman controls with some options to the map  
    map.pm.addControls({  
        position: 'bottomleft',  
        drawPolygon: true,
        drawCircle: false,
        drawMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawCircleMarker: false,
        drawText: false,
        removalMode: false,
        editControls: false,
    });

    map.pm.setPathOptions({
        color: 'cyan',
        fillColor: 'green',
        fillOpacity: 0.4,
    });

    var layerBeingEdited = null;
    var justClicked  = null;

    // Event fired when a layer is created first time. Automatically save this layer to the API? Maybe some info needs to be filled out first?
    map.on('pm:create', (geomanCreateEvent) => {
        console.log({geomanCreateEvent});

        geomanCreateEvent.layer.options.pmIgnore = false;
        L.PM.reInitLayer(geomanCreateEvent.layer); 

        //Add a click event to the layer that was just created
        geomanCreateEvent.layer.on('click', (clickOnAShape) => 
        {
            justClicked = true;
            console.log({clickOnAShape});
            if (layerBeingEdited != null)
            {
                map.pm.disableGlobalEditMode();
            }

            clickOnAShape.target.pm.enable({ editMode : true });
            layerBeingEdited = clickOnAShape.target;
        });
    });

    let isEditing = false;

    map.on('pm:drawstart', (geomanDrawstartEvent) => {
        console.log({geomanDrawstartEvent});
    });

    // Event fired when a layer is done drawing. Calculate stuff for the layer here? Sqm, if its overlapping another layer etc.
    map.on('pm:drawend', (geomanDrawendEvent) => {
        console.log({geomanDrawendEvent});
    });

    //Add a click event to the map to disable edit mode on all layers
    map.on('click', (onMapClick) => 
    {
        console.log({onMapClick});
        console.log( "drawmode: " + map.pm.globalDrawModeEnabled() );
        console.log( "editmode: " + map.pm.globalEditModeEnabled() );
        console.log( "isEditing: " + isEditing );
        console.log( "justClicked: " + justClicked );
        console.log( "layerBeingEdited: " + layerBeingEdited );

        if (layerBeingEdited != null && !justClicked)
        {
            layerBeingEdited = null;
            // layerBeingEdited.pm.disable();
            map.pm.disableGlobalEditMode();
        }

        justClicked = false;
    });

    // startTraking(map);
};
