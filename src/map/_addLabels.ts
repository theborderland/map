import * as L from 'leaflet';

export const addQuarterLabelsToMap = async (layerGroup: L.LayerGroup) => {
    let json = await (await fetch('./data/bl25/labels/quarters.json')).json();
    addLabelOverlayToMap(json, layerGroup, 'white', 0.001);
};
export const addPlazaLabelsToMap = async (layerGroup: L.LayerGroup) => {
    let json = await (await fetch('./data/bl25/labels/plazas.json')).json();
    addLabelOverlayToMap(json, layerGroup, 'white', 0.0015);
};
export const addNeighbourhoodLabelsToMap = async (layerGroup: L.LayerGroup) => {
    let json = await (await fetch('./data/bl25/labels/neighbourhoods.json')).json();
    addLabelOverlayToMap(json, layerGroup, 'white', 0.003);
    let jsonNonCamp = await (await fetch('./data/bl25/labels/non-camp-neighbourhoods.json')).json();
    addLabelOverlayToMap(jsonNonCamp, layerGroup, 'white', 0.003);
};

/**
 * Adds labels to polygon features at their centroids
 * @param json GeoJSON with polygon features
 * @param layerGroup The layer group to add the labels to
 * @param color Text color
 * @param size Text size
 */
export const addPolygonFeatureLabelOverlayToMap = (
    json: L.GeoJSON,
    layerGroup: L.LayerGroup,
    color: string,
    size: number,
) => {
    // Process each polygon feature in the GeoJSON
    const geoJson = json.toGeoJSON();
    console.log(geoJson);

    for (let feature of geoJson['features']) {
        if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
            continue; // Skip non-polygon features
        }

        // Get the name property from the feature
        let name = feature.properties.name;
        if (!name) continue; // Skip features without names

        // Get size and rotation from properties or use defaults
        let thisSize = feature.properties.size || size;
        let rotation = feature.properties.rotation || 0;

        // Calculate the centroid of the polygon
        let centroid: [number, number];

        if (feature.geometry.type === 'Polygon') {
            centroid = calculatePolygonCentroid(feature.geometry.coordinates[0]);
        } else {
            // MultiPolygon
            // For MultiPolygon, use the centroid of the largest polygon
            let largestPolygon = feature.geometry.coordinates[0];
            let maxArea = calculatePolygonArea(largestPolygon);

            for (let i = 1; i < feature.geometry.coordinates.length; i++) {
                const area = calculatePolygonArea(feature.geometry.coordinates[i]);
                if (area > maxArea) {
                    maxArea = area;
                    largestPolygon = feature.geometry.coordinates[i];
                }
            }

            centroid = calculatePolygonCentroid(largestPolygon[0]);
        }

        const [lng, lat] = centroid;

        // Create bounds for the SVG overlay
        var latLngBounds = L.latLngBounds([
            [lat - thisSize * 0.5, lng - thisSize * 0.5],
            [lat + thisSize * 0.5, lng + thisSize * 0.5],
        ]);

        // Create the SVG text element
        const elem = createSVGTextElement(name, 'bradleyHand', color, rotation);

        // Add SVG text to map
        L.svgOverlay(elem, latLngBounds, {
            opacity: 1,
            interactive: false,
        }).addTo(layerGroup);
    }
};

/**
 * Calculates the centroid of a polygon
 * @param coordinates Array of [lng, lat] coordinates forming a polygon
 * @returns [lng, lat] centroid coordinates
 */
function calculatePolygonCentroid(coordinates: number[][]): [number, number] {
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < coordinates.length; i++) {
        sumX += coordinates[i][0];
        sumY += coordinates[i][1];
    }

    return [sumX / coordinates.length, sumY / coordinates.length];
}

/**
 * Calculates the approximate area of a polygon
 * @param coordinates Array of coordinates forming a polygon
 * @returns Approximate area value
 */
function calculatePolygonArea(coordinates: number[][][]): number {
    // Simple approximation of area by counting points
    return coordinates[0].length;
}

const addLabelOverlayToMap = (json: JSON, layerGroup: L.LayerGroup, color: string, size: number) => {
    // load overlay data from json and adds it to layergroup

    for (let place of json['features']) {
        // go through each marker in the file
        let thisSize = place.properties.size || size; // grab size from json if present. Else default to function argument.
        let rotation = place.properties.rotation || 0;
        let name = place.properties.name;
        const lng = place.geometry.coordinates[0];
        const lat = place.geometry.coordinates[1];
        // Draw svg with bounds, and translating svg so that it centers on marker.
        var latLngBounds = L.latLngBounds([
            [lat - thisSize * 0.5, lng - thisSize * 0.5],
            [lat + thisSize * 0.5, lng + thisSize * 0.5],
        ]);
        const elem = createSVGTextElement(name, 'bradleyHand', color, rotation);
        // add svg text to map
        L.svgOverlay(elem, latLngBounds, {
            opacity: 1,
            interactive: false,
        }).addTo(layerGroup);
    }
};

function createSVGTextElement(text: string, font: string, color: string, rotation: number) {
    // creates and returns svg element
    // If using a custom font like bradleyHand you need to load them in index.css first.

    const elem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    elem.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    // text is split at the newline symbol e..g "hello\nthere" becomes two lines: "hello" and "there"
    let innerText: string = '';
    const splitString = text.split('\n');
    for (let split of splitString) {
        innerText += `<tspan x="0" dy=".6em">${split}</tspan>`; // a line of text
    }
    elem.innerHTML = `<text transform="rotate(${rotation})" id="text" fill="${color}"font-family="${font}" x="0" y="0" fill="white" >${innerText}</text>`;

    // we need to calculate the bounding box of the text in order to set viewbox of the svg. We need to calculate this or we might set viewbox too small or too big.
    // The bounding box cannot be calculated before element is added to dom so we do that:
    document.body.appendChild(elem);
    const bbox: SVGRect = elem.getBBox(); // get bounding box

    // Remove the SVG element from the DOM now that we have calculated bounding box. The element will be added correctly by leaflet later
    elem.remove();
    // set viewbox to be the same as bounding box
    elem.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);

    return elem;
}
