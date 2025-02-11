import * as Turf from '@turf/turf';
import * as L from 'leaflet';
import { Severity, Rule } from '../index';
import { compareLayers, getBBoxForCoords, fastIsOverlap } from './utils';

export const isOverlapping = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    return { triggered: _isLayerOverlappingOrContained(entity.layer, layerGroup) };
});

/** Utility function to calculate the ovelap between a layer and layergroup */
function _isLayerOverlappingOrContained(layer: L.Layer, layerGroup: L.GeoJSON): boolean {
    //NOTE: Only checks overlaps, not if its inside or covers completely
    //@ts-ignore
    let layerGeoJson = layer.toGeoJSON();
    let bBox = getBBoxForCoords(layerGeoJson.features[0].geometry.coordinates[0]);
    //@ts-ignore
    let overlap = false;
    let i = 0;
    layerGroup.eachLayer((otherLayer) => {
        if (overlap) {
            return;
        }
        if (compareLayers(layer, otherLayer)) {
            return;
        }
        //@ts-ignore
        let otherGeoJson = otherLayer.toGeoJSON();
        //@ts-ignore
        let otherBBox = getBBoxForCoords(otherGeoJson.features[0].geometry.coordinates[0]);
        if (fastIsOverlap(bBox, otherBBox)) {
            // Might overlap
            if (Turf.booleanOverlap(layerGeoJson.features[0], otherGeoJson.features[0]) ||
                Turf.booleanContains(layerGeoJson.features[0], otherGeoJson.features[0])) {
                overlap = true;
            }
        }
    });
    return overlap;
}

