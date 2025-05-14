import * as L from 'leaflet';
import * as Turf from '@turf/turf';
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
    size = size / 3000;

    const geoJson = json.toGeoJSON();
    for (let feature of geoJson['features']) {
        if (feature.geometry.type !== 'Polygon' && feature.geometry.type !== 'MultiPolygon') {
            continue; // Skip non-polygon features
        }
        let name = feature.properties.name;
        if (!name) continue; // Skip features without names

        const centre = Turf.centerOfMass(feature.geometry);
        const [lng, lat] = centre.geometry.coordinates;

        let rotation = feature.properties.rotation || 0;

        var latLngBounds = L.latLngBounds([
            [lat - size * 0.5, lng - size * 0.5 * name.length],
            [lat + size * 0.5, lng + size * 0.5 * name.length],
        ]);
        const elem = createSVGTextElement(name, 'bradleyHand', color, rotation);
        L.svgOverlay(elem, latLngBounds, {
            opacity: 1,
            interactive: false,
        }).addTo(layerGroup);
    }
};

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
