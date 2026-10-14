import L, { PathOptions } from 'leaflet';
import 'leaflet.pattern';
import { loadDrawnMap } from './loadDrawnMap';
import { loadGeoJsonFeatureCollections } from './loadGeoJsonFeatureCollections';
import { getKidzoneStyle, getSoundStyle } from './layerStyles';
import { getSoundspotDescription, soundSpotType, soundPropertyKey, soundLayers } from '../utils/soundData';
import { filterFeatures } from './filterFeatures';
import { loadImageOverlay } from './loadImageOverlay';
import { addPowerGridTomap } from './_addPowerGrid';
import { addPointsOfInterestsTomap } from './_addPOI';
import * as Turf from '@turf/turf';
import { loadApiLayers } from './loadApiLayers';

export const loadBaseLayers = async (map: any, _isCleanAndQuietMode?: boolean) => {
    // Add the Google Satellite layer if online, otherwise load the drawn map
    //if (!window.navigator.onLine) {
    //console.log("offline, loading local drawn map");
    await loadDrawnMap(map);
    //map.addLayer(map.groups.drawnmap);
    //} else{
    map.groups.googleSatellite = L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 21,
        maxNativeZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    }).addTo(map);
    //}

    // Load contours
    fetch('./data/analysis/contours_simplified.geojson')
        .then((response) => response.json())
        .then((response) => {
            L.geoJSON(response.features, { style: { color: '#ffffff', weight: 1, opacity: 0.5 } }).addTo(
                map.groups.mapstuff,
            );
        });

        // Load low power area (for rules only, not visible)
        map.groups.lowpowerarea = new L.LayerGroup();
        await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/low_power_area.geojson');
        // Loads "propertyborder", "naturereserve", "friends", "forbidden", "friends"
        await loadGeoJsonFeatureCollections(map, 'type', './data/borders.geojson');
        await loadGeoJsonFeatureCollections(map, 'type', './data/slopes.geojson');

    // Areas, roads, POIs, styles and rules all come from the API.
    // Creates map.groups[<styleType>] (fireroad, neighbourhood, plaza, ...) and map.apiRuleZones.
    await loadApiLayers(map, _isCleanAndQuietMode);

    // Derive forbidden camping areas from the API's neighbourhood property.
    map.groups.hiddenforbidden = filterFeatures(
        map.groups.neighbourhood,
        (feature) => feature.properties?.camping_allowed === false,
    );

    // Loads kids zones with feature-specific fill colors
    await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/kids_zones.geojson', {
        propertyRenameFn: () => 'kidszones',
        styleFn: (_value: string, feature: any) => getKidzoneStyle(feature),
    });

    // should probably move this someplace else..
    var stripes = new L.StripePattern({
        patternContentUnits: 'objectBoundingBox',
        patternUnits: 'objectBoundingBox',
        weight: 0.02,
        spaceWeight: 0.02,
        height: 0.04,
        angle: 45,
        color: '#2666cd',
        opacity: 0.5,
        spaceColor: '#757575',
        spaceOpacity: 0.8
    });
    stripes.addTo(map);
    function pattern(): PathOptions {
        return {
            color: '#2666cd',
            fillPattern: stripes,
            fillOpacity: 1
        };
    }

    await loadGeoJsonFeatureCollections(map, 'type', './data/waterProtectedZone.geojson', {
        styleFn: (_value: string, feature: any) => pattern(),
    });

    // Load sound areas
    await loadGeoJsonFeatureCollections(map, soundPropertyKey, 'https://alversjomaps.vercel.app/geoapi/maps/map2?features=polygons', {
        styleFn: (_value: string, feature: any) => getSoundStyle(feature),
    });
    soundLayers.forEach((layer) => {
        map.groups[layer].addTo(map.groups.soundguide);
    });

    // Soundspots have to be added as a Feature, in order to have properties (For isBreakingSoundLimit)
    await loadGeoJsonFeatureCollections(map, "type", 'https://alversjomaps.vercel.app/geoapi/maps/map2?features=points', {
        propertyRenameFn: () => soundSpotType,
        buffer: 10,
        styleFn: (_value: string, feature: any) => getSoundStyle(feature),
    });
    map.groups[soundSpotType].addTo(map.groups.soundguide);
    map.removeLayer(map.groups[soundSpotType]);

    // Add soundspots to the soundguide layer, needs to be after the feature which adds buffer, otherwise they are not clickable.
    await addPointsOfInterestsTomap('https://alversjomaps.vercel.app/geoapi/maps/map2?features=points', map.groups.soundspots, {
        description: getSoundspotDescription,
        link: '#page:soundspot',
    }, _isCleanAndQuietMode);

    map.groups.soundspots.addTo(map.groups.soundguide);
    map.removeLayer(map.groups.soundspots);

    await addPowerGridTomap(map.groups.powergrid);

    map.groups.terrain = await loadImageOverlay(map, './data/terrain.png', [
        [57.6156422900704257, 14.9150971736724536],
        [57.6291230394961715, 14.9362178462290363],
    ]);

    map.groups.heightmap = L.tileLayer('./data/analysis/height/{z}/{x}/{y}.jpg', {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 16,
        maxNativeZoom: 17,
        tms: false,
    });

    map.groups.slopemap = L.tileLayer('./data/analysis/slope/{z}/{x}/{y}.png', {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 16,
        maxNativeZoom: 17,
        tms: false,
    });

    const aftermathOptions26 = {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 15,
        maxNativeZoom: 21,
        tms: false,
    };
    const aftermathOptions = {
        minZoom: 13,
        maxZoom: 21,
        minNativeZoom: 15,
        maxNativeZoom: 19,
        tms: false,
    };
    map.groups.aftermath26 = L.tileLayer('https://tiles.openaerialmap.org/6a82fe4909bfcbdf0ea094f2/0/6a82fe4909bfcbdf0ea094f3/{z}/{x}/{y}.png', aftermathOptions26);
    map.groups.aftermath25 = L.tileLayer('./data/bl25/aftermath/{z}/{x}/{y}.png', aftermathOptions);
    map.groups.aftermath24 = L.tileLayer('./data/bl24/aftermath/{z}/{x}/{y}.png', aftermathOptions);
    map.groups.aftermath23 = L.tileLayer('./data/bl23/aftermath/{z}/{x}/{y}.png', aftermathOptions);
    map.groups.aftermath22 = L.tileLayer('./data/bl22/aftermath/{z}/{x}/{y}.png', aftermathOptions);
};