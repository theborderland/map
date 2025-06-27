import * as turf from '@turf/turf';

/**
 * Usage: visit page with coordinates as querystring parameters.
 * The coordinates should be in the format: latitude,longitude
 * For example getlocation.html?coords=57.62045050822002,14.923006296157837
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

const getGeoJsonData = async (url) => {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        throw error;
    }
};

const getNeighborhoodName = (geojson, point) =>
    geojson.features.find(f => turf.booleanPointInPolygon(point, f))?.properties.name || '';

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

const getPointFromQueryString = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const coords = urlParams.get('coords') ? urlParams.get('coords').split(',').map(Number) : [];
    const pointCoord = [coords[1], coords[0]]; // lng, lat order
    return turf.point(pointCoord);
}

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

const processLocationData = async () => {
    const geojsonData = await loadData();

    const fields = {
        neighborhood: document.getElementById('neighborhood'),
        closest_plaza: document.getElementById('closest_plaza'),
        distance_to_plaza: document.getElementById('distance_to_plaza'),
        direction_from_plaza: document.getElementById('direction_from_plaza'),
        closest_poi: document.getElementById('closest_poi'),
        distance_to_poi: document.getElementById('distance_to_poi'),
        direction_from_poi: document.getElementById('direction_from_poi')
    };
    const point = getPointFromQueryString();

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

processLocationData();
