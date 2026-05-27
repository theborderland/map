import * as L from 'leaflet';
import * as Turf from '@turf/turf';
import {
    MIN_CAMP_AREA_OVERLAP_SQM,
    MIN_CAMP_OVERLAP_AREA_SQM,
    SNAP_EDGE_TOLERANCE_METERS,
} from '../../../SETTINGS';
import type {
    Feature,
    FeatureCollection,
    GeoJsonFeatureInput,
    PolygonFeature,
} from '../../types/geojson';

export function compareLayers(layer1: L.Layer, layer2: L.Layer): boolean {
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

/** First valid polygon feature from a Leaflet layer or GeoJSON group. */
export function getPolygonFeatureFromLayer(layer: L.Layer): PolygonFeature | null {
    return getPolygonFeatureFromGeoJson(layer.toGeoJSON?.());
}

/** Polygon Geoman is editing — last child layer; drops stale copies in the group. */
export function getActivePolygonFeatureFromLayer(layer: L.Layer): PolygonFeature | null {
    const group = layer as L.GeoJSON;
    const childLayers = group.getLayers?.();
    if (childLayers && childLayers.length > 1) {
        const keep = childLayers[childLayers.length - 1] as L.Layer;
        for (let i = 0; i < childLayers.length - 1; i++) {
            group.removeLayer(childLayers[i]);
        }
        return getPolygonFeatureFromLayer(keep);
    }
    if (childLayers?.length === 1) {
        return getPolygonFeatureFromLayer(childLayers[0] as L.Layer);
    }

    const gj = layer.toGeoJSON?.();
    return getPolygonFeatureFromGeoJson(gj, true);
}

export function getPolygonFeatureFromGeoJson(
    gj: GeoJsonFeatureInput | GeoJSON.GeoJsonObject,
    preferLast = false,
): PolygonFeature | null {
    if (!gj || typeof gj !== 'object' || !('type' in gj)) {
        return null;
    }

    let feature: Feature | undefined;
    if (gj.type === 'Feature') {
        feature = gj as Feature;
    } else if (gj.type === 'FeatureCollection' && (gj as FeatureCollection).features?.length) {
        const collection = gj as FeatureCollection;
        const polygons = collection.features.filter(
            (f) => f.geometry?.type === 'Polygon' && f.geometry.coordinates?.[0]?.length,
        );
        if (polygons.length) {
            feature = preferLast ? polygons[polygons.length - 1] : polygons[0];
        } else {
            feature = preferLast
                ? collection.features[collection.features.length - 1]
                : collection.features[0];
        }
    }

    if (!feature?.geometry || feature.geometry.type !== 'Polygon') {
        return null;
    }

    const ring = feature.geometry.coordinates?.[0];
    if (!ring?.length || ring.length < 4) {
        return null;
    }

    return feature as PolygonFeature;
}

function shrinkPolygonForOverlapTest(
    feature: PolygonFeature,
    insetMeters: number,
): PolygonFeature | null {
    try {
        const shrunk = Turf.buffer(feature, -insetMeters, { units: 'meters' });
        if (!shrunk?.geometry || shrunk.geometry.type !== 'Polygon') {
            return null;
        }
        if (Turf.area(shrunk) < 0.1) {
            return null;
        }
        return shrunk as PolygonFeature;
    } catch {
        return null;
    }
}

/** True when two polygons share interior overlap, not just a snapped shared edge. */
export function hasSignificantPolygonOverlap(
    a: PolygonFeature,
    b: PolygonFeature,
    minAreaSqMeters: number = MIN_CAMP_OVERLAP_AREA_SQM,
    edgeToleranceMeters: number = SNAP_EDGE_TOLERANCE_METERS,
): boolean {
    const shrunkA = shrinkPolygonForOverlapTest(a, edgeToleranceMeters);
    const shrunkB = shrinkPolygonForOverlapTest(b, edgeToleranceMeters);

    if (shrunkA && shrunkB) {
        try {
            const intersection = Turf.intersect(Turf.featureCollection([shrunkA, shrunkB]));
            if (intersection) {
                return Turf.area(intersection) > minAreaSqMeters;
            }
            return false;
        } catch {
            return false;
        }
    }

    // Too small to shrink — only flag clear containment, not edge contact
    if (Turf.booleanContains(a, b) || Turf.booleanContains(b, a)) {
        try {
            const smaller = Turf.area(a) <= Turf.area(b) ? a : b;
            const larger = smaller === a ? b : a;
            return Turf.area(smaller) > minAreaSqMeters && Turf.booleanContains(larger, smaller);
        } catch {
            return false;
        }
    }

    return false;
}

/** Camp overlaps a clearance/restriction zone (fireroad, slope, etc.), not merely touching its edge. */
export function campOverlapsClearanceZone(
    camp: PolygonFeature,
    zone: PolygonFeature,
    zoneInsetMeters: number = SNAP_EDGE_TOLERANCE_METERS,
): boolean {
    const insetZone = shrinkPolygonForOverlapTest(zone, zoneInsetMeters);
    if (!insetZone) {
        return false;
    }
    return hasSignificantPolygonOverlap(camp, insetZone, MIN_CAMP_OVERLAP_AREA_SQM, 0);
}

/**
 * Camp-vs-camp: true if polygons share any area (not allowed).
 * Adjacent camps that only touch along an edge/vertex are OK (≈0 m² intersection).
 */
function intersectionHasPolygonArea(
    intersection: Feature | FeatureCollection | null,
    minAreaSqMeters: number,
): boolean {
    if (!intersection) {
        return false;
    }

    if (intersection.type === 'FeatureCollection') {
        return intersection.features.some(
            (f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon',
        ) && Turf.area(intersection) > minAreaSqMeters;
    }

    if (!intersection.geometry) {
        return false;
    }

    const { type } = intersection.geometry;
    if (type === 'Polygon' || type === 'MultiPolygon') {
        return Turf.area(intersection) > minAreaSqMeters;
    }

    return false;
}

export function campsShareForbiddenAreaOverlap(
    a: PolygonFeature,
    b: PolygonFeature,
    minOverlapAreaSqMeters: number = MIN_CAMP_AREA_OVERLAP_SQM,
): boolean {
    try {
        if (Turf.booleanDisjoint(a, b)) {
            return false;
        }
    } catch {
        // continue with intersection test
    }

    try {
        const intersection = Turf.intersect(Turf.featureCollection([a, b]));
        if (intersectionHasPolygonArea(intersection, minOverlapAreaSqMeters)) {
            return true;
        }
    } catch {
        // disjoint or edge-only contact
    }

    if (Turf.booleanContains(a, b) || Turf.booleanContains(b, a)) {
        try {
            const smaller = Turf.area(a) <= Turf.area(b) ? a : b;
            const larger = smaller === a ? b : a;
            return (
                Turf.area(smaller) > minOverlapAreaSqMeters &&
                Turf.booleanContains(larger, smaller)
            );
        } catch {
            return false;
        }
    }

    return false;
}
