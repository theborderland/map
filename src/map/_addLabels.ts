import * as L from 'leaflet';
import * as Turf from '@turf/turf';

/**
 * Adds labels to polygon features at their centroids.
 *
 * Expects the features to have a `name` property and an optional `tagline` property.
 *
 * @param layerGroup The layer group to add the labels to
 * @param json GeoJSON with polygon features
 * @param color Text color
 * @param size Text size
 */
export const addPolygonFeatureLabelOverlayToMap = (
    layerGroup: L.LayerGroup,
    json: L.GeoJSON,
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
        let rotation = feature.properties.rotation || 0;
        addLabelToFeature(layerGroup, feature, name, color, size, rotation);
        let tagline = feature.properties.tagline;
        if (!tagline) continue; // Skip features without taglines
        const offset = [0, -1.25];
        addLabelToFeature(layerGroup, feature, tagline, color, size * 0.25, rotation, offset);
    }
};

function addLabelToFeature(
    layerGroup: L.LayerGroup,
    feature: any,
    label: string,
    color: string,
    size: number,
    rotation?: number,
    offset?: number[],
) {
    const centre = Turf.centerOfMass(feature.geometry);
    let [lng, lat] = centre.geometry.coordinates;
    if (offset) {
        lng += offset[0] * size;
        lat += offset[1] * size;
    }
    var latLngBounds = L.latLngBounds([
        [lat - size * 0.5, lng - size * 0.5 * label.length],
        [lat + size * 0.5, lng + size * 0.5 * label.length],
    ]);
    const elem = createSVGTextElement(label, 'bradleyHand', color, rotation);
    L.svgOverlay(elem, latLngBounds, {
        opacity: 1,
        interactive: false,
    }).addTo(layerGroup);
}

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
