/**
 * Usage: visit page with coordinates or id as querystring parameters.
 * The coordinates should be in the format: latitude,longitude
 * For example 
 * getlocation.html?coords=57.62045050822002,14.923006296157837
 * getlocation.html?id=123
 * 
 * Most of this code was AI generated, because I was too lazy to write it myself.
 */

import * as turf from '@turf/turf';
import { MapEntity, MapEntityRepository } from './entities';

// This variable is used to determine if the camp is on the map based on the query string id
// If the id is present in the query string, it will be set to true and the camp name will be set accordingly
let isCampOnMap = false; 
let campName = '';
const _repository = new MapEntityRepository(() => {
        // Create an empty ruleset because we don't need any rules for this example
        return [];
    });
const geojsonData = { neighborhoods: null, plazas: null, POIs: null };
// Fields to be filled with data from the query string or GeoJSON files
// These fields are expected to be present in the HTML with the corresponding IDs
const _htmlFields = {
    camp_name: document.getElementById('camp_name'),
    neighborhood: document.getElementById('neighborhood'),
    closest_plaza: document.getElementById('closest_plaza'),
    distance_to_plaza: document.getElementById('distance_to_plaza'),
    direction_from_plaza: document.getElementById('direction_from_plaza'),
    closest_poi: document.getElementById('closest_poi'),
    distance_to_poi: document.getElementById('distance_to_poi'),
    direction_from_poi: document.getElementById('direction_from_poi')
};
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
    geoJsonFiles.forEach((file, idx) => {
        geojsonData[file.name] = promises[idx];
    });
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
        } else { // For polygons and MultiPolygons
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
const getPointFromCoordinates = async (coordinates) => {
    if (!coordinates) return null;

    const pointCoord = [coordinates[1], coordinates[0]]; // Turf and geojson needs it in lng, lat order
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
const getPointFromId = async (id) => {
    const entity = _repository.getEntityById(id);
    if (entity) {
        isCampOnMap = true;
        campName = entity.name;
        let feature = JSON.parse(entity.geoJson);
        return turf.center(feature);
    }
    return null;
}

/** Writes information from the GeoJSON data to a table in the HTML document.
 * The table will display the names of neighborhoods, plazas, and points of interest.
 * @param {Object} geojsonData - The GeoJSON data containing neighborhoods, plazas, and POIs.
 * @throws Will throw an error if the geojsonData is invalid or does not contain the expected structure.
 */
const displayGeoJsonInfo = geojsonData => {
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
const getLocationData = async (id, coordinates) => {
    let fields = {};
    Object.keys(_htmlFields).forEach(key => {
        fields[key] = '';
    });

    let point = await getPointFromId(id) || await getPointFromCoordinates(coordinates);
    if (!point) {
        console.error('No id (or camp not found) or coordinates provided in the query string.');
        return;
    }

    if (isCampOnMap) {
        fields.camp_name = campName;
    }

    fields.neighborhood = getNeighborhoodName(geojsonData.neighborhoods, point);

    const closestPlaza = getClosestDistance(geojsonData.plazas, point);
    fields.closest_plaza = closestPlaza.areaName;
    fields.distance_to_plaza = Math.round(closestPlaza.distance);
    fields.direction_from_plaza = getCardinalDirectionFromArea(closestPlaza.areaFeature, point);

    const closestPOI = getClosestDistance(geojsonData.POIs, point);
    fields.closest_poi = closestPOI.areaName;
    fields.distance_to_poi = Math.round(closestPOI.distance);
    fields.direction_from_poi = getCardinalDirectionFromArea(closestPOI.areaFeature, point);

    return fields;
}

/**
 * Handles CSV upload, processes each row to add new columns with location data from the fields object,
 * and triggers a download of the updated CSV.
 */
const handleCsvUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const text = await file.text();
        // Parse CSV using PapaParse for robust parsing
        const parsed = Papa.parse(text, { skipEmptyLines: true });
        if (!parsed.data || parsed.data.length === 0) return;

        // Parse header and rows
        const header = parsed.data[0];
        const rows = parsed.data;
        const fieldKeys = Object.keys(_htmlFields);
        const newHeader = header.concat(fieldKeys);

        // Find the index of the column with coordinates or id
        const locationColIdx = header.findIndex(h => h.trim().toLowerCase() === 'location / link on the placement map');

        // Process each row (skip header)
        const processedRows = [newHeader];
        for (let i = 1; i < rows.length; i++) {
            const cols = rows[i];
            let locationValue = cols[locationColIdx] || '';
            let id = null, coordinates = null;

            // Try to extract id or coordinates from the column value
            if (/id=(\d+)/i.test(locationValue)) {
                // Extract id from the string like "id=123"
                id = Number(locationValue.match(/id=(\d+)/i)[1]);
            } else if (/^[-.\d]+\s+[-.\d]+$/.test(locationValue)) {
                // Try to parse coordinates from a string like "57.62045050822002 14.923006296157837"
                // Split by whitespace and convert to numbers
                const parts = locationValue.trim().split(/\s+/).map(Number);
                if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    coordinates = parts;
                }
            }

            let rowFields = {};
            if (id !== null || coordinates !== null) {
                rowFields = await getLocationData(id, coordinates) || {};
            }

            // Append field values to row
            const newCols = fieldKeys.map(k => rowFields[k] ?? '');
            processedRows.push(cols.concat(newCols));
        }

        // Convert processedRows to CSV using PapaParse
        const csv = Papa.unparse(processedRows);

        // Create and download new CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: file.name.slice(0, -4) + '_updated' + file.name.slice(-4)
        });
        a.click();
        URL.revokeObjectURL(a.href);
    };

    input.click();
}

const initialize = async () => {
    await _repository.loaded;
    await loadData();
    displayGeoJsonInfo(geojsonData);

    const urlParams = new URLSearchParams(window.location.search);
    const hasCoords = urlParams.has('coords');
    const hasId = urlParams.has('id');
    let locationData = {};
    if (hasId) {
        const id = Number(urlParams.get('id'));
        locationData = await getLocationData(id);
    } else if (hasCoords) {
        const coords = urlParams.get('coords') ? urlParams.get('coords').split(',').map(Number) : [];
        locationData = await getLocationData(null, coords);
    }
    // Fill HTML fields with the location data
    if (locationData) {
        Object.keys(_htmlFields).forEach(key => {
            _htmlFields[key].value = locationData[key] || '';
        });
    } else {
        console.error('No valid location data found.');
    }

}

initialize();


// Add trigger CSV upload to button
document.getElementsByTagName('button')[0].onclick = handleCsvUpload;