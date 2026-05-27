import * as Turf from '@turf/turf';
import * as L from 'leaflet';
import {
    MAX_CLUSTER_SIZE,
    FIRE_BUFFER_IN_METER
} from '../../../SETTINGS';
import { Severity, Rule, clusterCache, ruler } from '../index';
import {
    compareLayers,
    getBBoxForCoords,
    fastIsOverlap,
    getActivePolygonFeatureFromLayer,
    hasSignificantPolygonOverlap,
} from './utils';
import type { PolygonFeature } from '../../types/geojson';
import { getGeoJsonChildLayer, getLayerLatLngRing } from '../../types/leafletHelpers';

const CHEAP_RULER_BUFFER: number = FIRE_BUFFER_IN_METER + 1; // We add a little extra to the buffer, to compensate for usign the approximation method from cheapruler

export const isBufferOverlappingRecursive = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    const layer = getGeoJsonChildLayer(entity.layer);
    if (!layer) {
        return { triggered: false };
    }

    // invalidate cache if coords have changed
    const ring = getLayerLatLngRing(layer);
    if (
        layer._leaflet_id != null &&
        ring &&
        clusterCache.coordsHaveChanged(
            layer._leaflet_id,
            ring.map((ll) => ({ lat: ll.lat, lng: ll.lng })),
        ) &&
        entity.layer._leaflet_id != null
    ) {
        clusterCache.invalidateCache(entity.layer._leaflet_id);
    }

    const checkedOverlappingLayers = new Set<string>();
    let totalArea = _getTotalAreaOfOverlappingEntities(
        entity.layer,
        layerGroup,
        checkedOverlappingLayers,
    );
    if (totalArea > MAX_CLUSTER_SIZE) {
        return {
            triggered: true,
            severity: Severity.High,
            shortMessage: `We need some space between these camps`,
            shouldShowFireBuffer: true,
        };
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

    const layerFeature = getActivePolygonFeatureFromLayer(layer);
    if (!layerFeature) {
        return 0;
    }

    let totalArea: number;
    //@ts-ignore
    if (clusterCache.areaIsCached(layer._leaflet_id)) {
        //@ts-ignore
        totalArea = clusterCache.getAreaCache(layer._leaflet_id);
    } else {
        totalArea = Turf.area(layerFeature);
        //@ts-ignore
        clusterCache.setAreaCache(layer._leaflet_id, totalArea);
    }

    // get an approximate bounding box with firebuffer padding to use for later calculations
    let boxBounds = getBBoxForCoords(layerFeature.geometry.coordinates[0]);
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
                    const otherFeature = getActivePolygonFeatureFromLayer(otherLayer);
                    if (!otherFeature) {
                        overlaps = false;
                    } else {
                        const buffer = Turf.buffer(layerFeature, FIRE_BUFFER_IN_METER, {
                            units: 'meters',
                        }) as PolygonFeature;
                        overlaps = hasSignificantPolygonOverlap(buffer, otherFeature);
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
