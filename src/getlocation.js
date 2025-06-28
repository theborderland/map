/**
 * Usage: visit page with coordinates as querystring parameters.
 * The coordinates should be in the format: latitude,longitude
 * For example getlocation.html?coords=57.62045050822002,14.923006296157837
 * 
 * Most of this code was AI generated, because I was too lazy to write it myself.
 */

import * as turf from '@turf/turf';
import { MapEntity, MapEntityRepository } from './entities';

// This variable is used to determine if the camp is on the map based on the query string id
// If the id is present in the query string, it will be set to true and the camp name will be set accordingly
let isCampOnMap = false; 
let campName = '';
let _repository = new MapEntityRepository(() => {
        // Create an empty ruleset because we don't need any rules for this example
        return [];
    });

// Fields to be filled with data from the query string or GeoJSON files
// These fields are expected to be present in the HTML with the corresponding IDs
const fields = {
        camp_name: document.getElementById('camp_name'),
        neighborhood: document.getElementById('neighborhood'),
        closest_plaza: document.getElementById('closest_plaza'),
        distance_to_plaza: document.getElementById('distance_to_plaza'),
        direction_from_plaza: document.getElementById('direction_from_plaza'),
        closest_poi: document.getElementById('closest_poi'),
        distance_to_poi: document.getElementById('distance_to_poi'),
        direction_from_poi: document.getElementById('direction_from_poi')
    };

// Ensure all fields are present
Object.entries(fields).forEach(([key, field]) => {
    if (!field) {
        console.error(`Field with id '${key}' is missing in the HTML. Please ensure all fields are present with the correct IDs.`);
    }
}); 

/**
 * Loads GeoJSON data from specified URLs and returns an object containing the data.
 * @returns {Promise<Object>} An object containing the loaded GeoJSON data.
 */
const loadData = async () => {
    let geoJsonFiles = [
        { url: './data/bl25/neighbourhoods.geojson', name: 'neighborhoods' },
        { url: './data/bl25/Plazas_BL25_export.geojson', name: 'plazas' },
        { url: './data/bl25/poi/customPOIforJOMO.geojson', name: 'POIs' }
    ];
    const promises = await Promise.all(geoJsonFiles.map(file => getGeoJsonData(file.url)));
    const geojsonData = {};
    geoJsonFiles.forEach((file, idx) => {
        geojsonData[file.name] = promises[idx];
    });
    return geojsonData;
};

/** Fetches GeoJSON data from a given URL.
 * @param {string} url - The URL to fetch the GeoJSON data from.
 * @returns {Promise<Object>} The parsed GeoJSON data.
 * @throws Will throw an error if the fetch operation fails or the response is not valid JSON.
 */
const getGeoJsonData = async (url) => {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        throw error;
    }
};

/** Finds the neighborhood name for a given point in a GeoJSON object.
 * @param {Object} geojson - The GeoJSON object containing neighborhood features.
 * @param {Object} point - The point to check, in GeoJSON format.
 * @returns {string} The name of the neighborhood containing the point, or an empty string if not found.
 * @throws Will throw an error if the GeoJSON object is invalid or does not contain features.
 */
const getNeighborhoodName = (geojson, point) =>
    geojson.features.find(f => turf.booleanPointInPolygon(point, f))?.properties.name || '';

/** Calculates the closest distance from a point to any feature in a GeoJSON object.
 * @param {Object} geojson - The GeoJSON object containing features to check against.
 * @param {Object} point - The point to measure distance from, in GeoJSON format.
 * @returns {Object} An object containing the closest area name, distance, and the area feature.
 * @throws Will throw an error if the GeoJSON object is invalid or does not contain features.
 */
const getClosestDistance = (geojson, point) => {
    let minDistance = Infinity;
    let areaName = '';
    let areaFeature = null;

    for (const feature of geojson.features) {
        let distance = Infinity;
        if (feature.geometry.type === 'Point') {
            distance = turf.distance(point, feature, { units: 'meters' });
        } else if (
            feature.geometry.type === 'Polygon' ||
            feature.geometry.type === 'MultiPolygon'
        ) {
            distance = turf.pointToPolygonDistance(point, feature, { units: 'meters' });
        }
        if (distance < minDistance) {
            minDistance = distance;
            areaName = feature.properties.name || '(No name)';
            areaFeature = feature;
        }
    }
    minDistance = minDistance < 0 ? 0 : Math.round(minDistance);
    return { 
        areaName: areaName.replace(/\n/g, ' '), 
        distance: minDistance,
        areaFeature
    };
}

/** Determines the cardinal direction from a given area feature to a point.
 * @param {Object} areaFeature - The GeoJSON feature representing the area.
 * @param {Object} pt - The point to determine the direction to, in GeoJSON format.
 * @returns {string} The cardinal direction (N, NE, E, SE, S, SW, W, NW) from the area to the point.
 * @throws Will throw an error if the areaFeature is invalid or does not contain a valid geometry.
 */
const getCardinalDirectionFromArea = (areaFeature, pt) => {
    const center = turf.center(areaFeature);
    const areaCoords = center.geometry.coordinates;
    const bearing = turf.bearing(turf.point(areaCoords), pt);
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    /**
     * Calculates the index of a compass direction based on the given bearing.
     * The bearing is normalized to a value between 0 and 359 degrees, then divided by 45
     * to map it to one of 8 compass directions (N, NE, E, SE, S, SW, W, NW).
     * For a bearing of 90 degrees (East), idx will be 2
     */
    const idx = Math.round((((bearing % 360) + 360) % 360) / 45);
    return directions[idx];
};

/** Retrieves a point from the query string 'coords' parameter.
 * It checks if the 'coords' parameter is present, parses it, and checks if the point is within any polygon in the MapEntity repository.
 * If a matching polygon is found, it sets the camp name and returns the point.
 * @returns {Promise<Object|null>} A GeoJSON point object if 'coords' is found and a matching polygon is identified, or null if not.
 */
const getPointFromQueryString = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has('coords')) {
        return null;
    }
    const coords = urlParams.get('coords') ? urlParams.get('coords').split(',').map(Number) : [];
    const pointCoord = [coords[1], coords[0]]; // Turf and geojson needs it in lng, lat order
    const point = turf.point(pointCoord);
    let entities = await _repository.entities();
    const found = entities.find(entity => {
        try {
            return turf.booleanPointInPolygon(point, JSON.parse(entity.geoJson));
        } catch { return false; }
    });
    if (found) {
        isCampOnMap = true;
        campName = found.name;
    }

    return point;
}

/** Retrieves a center point from the MapEntity that corresponds to the query string 'id' parameter.
 * If an entity is found, it sets the camp name and returns the point.
 * @returns {MapEntity|null} A GeoJSON point object if an 'id' and MapEntity are found, or null if not.
 */
const getPointFromIdInQueryString = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = Number(urlParams.get('id'));
    if (id) {
        await _repository.loaded;
        const entity = _repository.getEntityById(id);
        if (entity) {
            isCampOnMap = true;
            campName = entity.name;
            let feature = JSON.parse(entity.geoJson);
            return turf.center(feature);
        }
    }
    return null;
}

/** Writes information from the GeoJSON data to a table in the HTML document.
 * The table will display the names of neighborhoods, plazas, and points of interest.
 * @param {Object} geojsonData - The GeoJSON data containing neighborhoods, plazas, and POIs.
 * @throws Will throw an error if the geojsonData is invalid or does not contain the expected structure.
 */
const writeInfoToTables = geojsonData => {
    const mainDiv = document.getElementById("main");
    const table = document.createElement("table");
    const keys = Object.keys(geojsonData);

    // Header
    table.appendChild(Object.assign(document.createElement("tr"),
        { innerHTML: keys.map(k => `<th>${k}</th>`).join('') }));

    // Rows
    const maxRows = Math.max(...keys.map(k => geojsonData[k]?.features?.length || 0));
    for (let i = 0; i < maxRows; i++) {
        table.appendChild(Object.assign(document.createElement("tr"), {
            innerHTML: keys.map(k =>
                `<td>${geojsonData[k]?.features?.[i]?.properties?.name || ''}</td>`
            ).join('')
        }));
    }
    mainDiv.appendChild(table);
};

/** Main function to process location data from the query string and GeoJSON files.
 * It retrieves the point from the query string, loads the GeoJSON data,
 * finds the neighborhood, closest plaza, and closest point of interest,
 * and writes the information to the HTML fields and tables.
 * @returns {Promise<void>} A promise that resolves when the processing is complete.
 * @throws Will throw an error if the GeoJSON data cannot be loaded or if the point cannot be determined.
 */
const doStuff = async () => {
    const geojsonData = await loadData();

    let point = await getPointFromIdInQueryString() || await getPointFromQueryString();
    if (!point) {
        console.error('No id or coordinates provided in the query string.');
        return;
    }

    if (isCampOnMap) {
        fields.camp_name.value = campName;
    }

    let neighborhoodName = getNeighborhoodName(geojsonData.neighborhoods, point);
    fields.neighborhood.value = neighborhoodName;

    const closestPlaza = getClosestDistance(geojsonData.plazas, point);
    fields.closest_plaza.value = closestPlaza.areaName;
    fields.distance_to_plaza.value = Math.round(closestPlaza.distance);
    fields.direction_from_plaza.value = getCardinalDirectionFromArea(closestPlaza.areaFeature, point);
    
    const closestPOI = getClosestDistance(geojsonData.POIs, point);
    fields.closest_poi.value = closestPOI.areaName;
    fields.distance_to_poi.value = Math.round(closestPOI.distance);
    fields.direction_from_poi.value = getCardinalDirectionFromArea(closestPOI.areaFeature, point);

    writeInfoToTables(geojsonData);
}

doStuff();
