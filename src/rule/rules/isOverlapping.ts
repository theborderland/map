import * as L from 'leaflet';
import { Severity, Rule } from '../index';
import {
    compareLayers,
    getBBoxForCoords,
    fastIsOverlap,
    getActivePolygonFeatureFromLayer,
    campsShareForbiddenAreaOverlap,
    getPolygonFeatureFromGeoJson,
} from './utils';
import { MapEntity } from '../../entities';
import type { PolygonFeature } from '../../types/geojson';

export const isOverlapping = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    return { triggered: _campsOverlap(entity, layerGroup) };
});

function getCampPolygonForRules(entity: MapEntity): PolygonFeature | null {
    entity.pruneStalePolygonLayers();
    const geoJson = entity.toGeoJSON();
    if (geoJson.geometry.type === 'Polygon') {
        return geoJson;
    }
    return getPolygonFeatureFromGeoJson(geoJson);
}

/** True if this camp shares area with another camp (touching without overlapping is OK). */
function _campsOverlap(entity: MapEntity, layerGroup: L.GeoJSON): boolean {
    const campFeature = getCampPolygonForRules(entity);
    if (!campFeature) {
        return false;
    }

    const bBox = getBBoxForCoords(campFeature.geometry.coordinates[0]);
    let overlap = false;

    layerGroup.eachLayer((otherLayer) => {
        if (overlap) {
            return;
        }
        if (compareLayers(entity.layer, otherLayer)) {
            return;
        }
        const otherEntityId = otherLayer.options?.entityId;
        // Ignore Geoman draw/temp layers — only compare saved camps
        if (otherEntityId == null) {
            return;
        }
        if (otherEntityId === entity.id) {
            return;
        }

        const otherFeature = getActivePolygonFeatureFromLayer(otherLayer);
        if (!otherFeature) {
            return;
        }

        const otherBBox = getBBoxForCoords(otherFeature.geometry.coordinates[0]);
        if (!fastIsOverlap(bBox, otherBBox)) {
            return;
        }

        if (campsShareForbiddenAreaOverlap(campFeature, otherFeature)) {
            overlap = true;
        }
    });

    return overlap;
}
