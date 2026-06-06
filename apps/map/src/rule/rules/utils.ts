import * as L from 'leaflet';

export function compareLayers(layer1: L.Layer, layer2: L.Layer): boolean {
    //@ts-ignore
    return layer1._leaflet_id === layer2._leaflet_id;
}

export function getBBoxForCoords(coords: Array<Array<number>>): Array<number> {
    // input coords -> [lat,lng]...
    const bbox = [null, null, null, null]; // west,south,east,north
    let firstCoord = true;
    for (let coord of coords) {
        if (firstCoord) {
            bbox[0] = coord[0];
            bbox[2] = coord[0];
            bbox[1] = coord[1];
            bbox[3] = coord[1];
            firstCoord = false;
        } else {
            //lngs
            if (coord[0] < bbox[0]) bbox[0] = coord[0];
            if (coord[0] > bbox[2]) bbox[2] = coord[0];
            // lats
            if (coord[1] < bbox[1]) bbox[1] = coord[1];
            if (coord[1] > bbox[3]) bbox[3] = coord[1];
        }
    }
    return bbox;
}

export function fastIsOverlap(layerBBox: Array<number>, otherBBox: Array<number>) {
    // input  bounding boxes: [west,south,east,north]
    // Takes two bounding boxes and returns true if the bounding boxes overlap.
    // If the bounding boxes do not overlap then the polygins contained in eahc bounding box also do not.
    // this is a fast way to precheck overlaps
    // check if approx bounding boxes overlap
    if (otherBBox[0] > layerBBox[2] ||
        otherBBox[2] < layerBBox[0] ||
        otherBBox[3] < layerBBox[1] ||
        otherBBox[1] > layerBBox[3]) {
        return false;
    }
    return true;
}