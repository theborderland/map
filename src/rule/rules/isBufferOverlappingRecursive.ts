import * as Turf from '@turf/turf';
import * as L from 'leaflet';
import {
    MAX_CLUSTER_SIZE,
    FIRE_BUFFER_IN_METER
} from '../../../SETTINGS';
import { Severity, Rule, clusterCache, ruler } from '../index';
import { compareLayers, getBBoxForCoords, fastIsOverlap } from './utils';

const CHEAP_RULER_BUFFER: number = FIRE_BUFFER_IN_METER + 1; // We add a little extra to the buffer, to compensate for usign the approximation method from cheapruler

export const isBufferOverlappingRecursive = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    //@ts-ignore
    const layer = entity.layer._layers[Object.keys(entity.layer._layers)[0]];

    // invalidate cache if coords have changed
    //@ts-ignore
    clusterCache.coordsHaveChanged(layer._leaflet_id, layer._latlngs[0]) &&
        clusterCache.invalidateCache(entity.layer._leaflet_id);
        
    const checkedOverlappingLayers = new Set<string>();
    let totalArea = _getTotalAreaOfOverlappingEntities(entity.layer, layerGroup, checkedOverlappingLayers);
    if (totalArea > MAX_CLUSTER_SIZE) {
        return { triggered: true, severity: Severity.High, shortMessage: `We need some space between these camps` };
    }
    return { triggered: false };
});

function _getTotalAreaOfOverlappingEntities(
    layer: L.Layer,
    layerGroup: L.LayerGroup,
    checkedOverlappingLayers: Set<string>
): number {
    //@ts-ignore
    if (checkedOverlappingLayers.has(layer._leaflet_id)) {
        return 0;
    } else {
        //@ts-ignore
        checkedOverlappingLayers.add(layer._leaflet_id);
    }

    let totalArea: number;
    //@ts-ignore
    if (clusterCache.areaIsCached(layer._leaflet_id)) {
        //@ts-ignore
        totalArea = clusterCache.getAreaCache(layer._leaflet_id);
    } else {
        //@ts-ignore
        totalArea = Turf.area(layer.toGeoJSON());
        //@ts-ignore
        clusterCache.setAreaCache(layer._leaflet_id, totalArea);
    }

    // get an approximate bounding box with firebuffer padding to use for later calculations
    //@ts-ignore
    /* you can get bounds like so:
    const bounds = layer.getBounds()
    let boxBounds = [bounds._southWest.lng,bounds._southWest.lat,bounds._northEast.lng,bounds._northEast.lat]
    However, layer.getBounds is not updated when moving the layer. Need to call layer.geoJson for an udpated bounds.
    */
    //@ts-ignore
    let boxBounds = getBBoxForCoords(layer.toGeoJSON().features[0].geometry.coordinates[0]);
    //@ts-ignore
    const bBox = ruler.bufferBBox(boxBounds, CHEAP_RULER_BUFFER); // add buffer padding to box


    //@ts-ignore
    layerGroup.eachLayer((otherLayer) => {
        if (!compareLayers(layer, otherLayer)) {
            let overlaps; // becomes true if the two layers overlap

            //@ts-ignore
            if (clusterCache.overlapIsCached(layer._leaflet_id, otherLayer._leaflet_id)) {
                //@ts-ignore
                overlaps = clusterCache.getOverlapCache(layer._leaflet_id, otherLayer._leaflet_id);
            } else {
                // Overlap is not cached -> calculate it
                //@ts-ignore
                const otherBounds = otherLayer.getBounds();
                let otherBoxBounds = [
                    otherBounds._southWest.lng,
                    otherBounds._southWest.lat,
                    otherBounds._northEast.lng,
                    otherBounds._northEast.lat,
                ];
                //@ts-ignore
                const otherBbox = otherBoxBounds; // We already padded layer. No need to pad otherLayer also

                // check if approx bounding boxes overlap
                if (!fastIsOverlap(bBox, otherBbox)) {
                    // bounding boxes do not overlap so polygons also dont overlap
                    overlaps = false;
                    //@ts-ignore
                    clusterCache.setOverlapCache(layer._leaflet_id, otherLayer._leaflet_id, overlaps);
                } else {
                    // bounding boxes overlap so polygons might overlap. Time to do the expensive calculations
                    //@ts-ignore
                    const otherLayerGeoJSON = otherLayer.toGeoJSON();
                    let otherLayerPolygon;
                    if (otherLayerGeoJSON.type === 'Feature') {
                        otherLayerPolygon = otherLayerGeoJSON.geometry;
                    } else if (otherLayerGeoJSON.type === 'FeatureCollection') {
                        otherLayerPolygon = otherLayerGeoJSON.features[0];
                    } else {
                        // Unsupported geometry type
                        throw new Error('unsupported geometry');
                    }

                    //@ts-ignore
                    let buffer = Turf.buffer(layer.toGeoJSON(), FIRE_BUFFER_IN_METER, {
                        units: 'meters',
                    }) as Turf.helpers.FeatureCollection<Turf.helpers.Polygon>;
                    if (Turf.booleanOverlap(buffer.features[0], otherLayerPolygon) ||
                        Turf.booleanContains(buffer.features[0], otherLayerPolygon)) {
                        overlaps = true;
                    } else {
                        overlaps = false;
                    }
                    //@ts-ignore
                    clusterCache.setOverlapCache(layer._leaflet_id, otherLayer._leaflet_id, overlaps);
                }
            }
            if (overlaps) {
                totalArea += _getTotalAreaOfOverlappingEntities(otherLayer, layerGroup, checkedOverlappingLayers);
            }
        }
    });

    return totalArea;
}
