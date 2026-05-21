import L from 'leaflet';
import { loadDrawnMap } from './loadDrawnMap';
import { loadGeoJsonFeatureCollections } from './loadGeoJsonFeatureCollections';
import { getSoundStyle } from './layerStyles';
import { getSoundspotDescription, soundSpotType, soundPropertyKey, soundLayers } from '../utils/soundData';
import { filterFeatures } from './filterFeatures';
import { loadImageOverlay } from './loadImageOverlay';
import { addPowerGridTomap } from './_addPowerGrid';
import { addPointsOfInterestsTomap } from './_addPOI';

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
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/placement_areas.geojson');
	// Loads "propertyborder", "naturereserve", "friends", "forbidden", "friends"
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/borders.geojson');

	// Loads "fireroads"
	// with the fireroads as a reference, also load "publicplease" and "oktocamp" with a bigger buffer
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/fireroads.geojson', { buffer: 2.5 });
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/fireroads.geojson', {
		buffer: 3.5,
		propertyRenameFn: () => 'publicplease',
	});
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/fireroads.geojson', {
		buffer: 52.5,
		propertyRenameFn: () => 'oktocamp',
	});

	// Loads "minorroad"
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/walking_paths.geojson', { buffer: 1 });
	// Loads "plaza"
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/plazas.geojson');
	// Loads "neighbourhood"
	await loadGeoJsonFeatureCollections(map, 'type', './data/bl26/neighbourhoods.geojson');


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

	await addPointsOfInterestsTomap('./data/bl26/poi.json', map.groups.poi, undefined, _isCleanAndQuietMode);
	// await addPowerGridTomap(map.groups.powergrid);

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

	const aftermathOptions = {
		minZoom: 13,
		maxZoom: 21,
		minNativeZoom: 15,
		maxNativeZoom: 19,
		tms: false,
	};
	map.groups.aftermath25 = L.tileLayer('./data/bl25/aftermath/{z}/{x}/{y}.png', aftermathOptions);
	map.groups.aftermath24 = L.tileLayer('./data/bl24/aftermath/{z}/{x}/{y}.png', aftermathOptions);
	map.groups.aftermath23 = L.tileLayer('./data/bl23/aftermath/{z}/{x}/{y}.png', aftermathOptions);
	map.groups.aftermath22 = L.tileLayer('./data/bl22/aftermath/{z}/{x}/{y}.png', aftermathOptions);
};
