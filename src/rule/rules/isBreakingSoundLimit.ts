import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';
import { MapEntity } from '../../entities';
import { soundLimits, soundPropertyKey, soundSpotType } from '../../utils/soundData';

function breaksSoundRule(entity: MapEntity, entityFeature, otherFeature) {
    if (otherFeature.geometry.type === "Point") {
        return;
    }

    if (otherFeature.properties.type === soundSpotType) {
        if (Turf.booleanOverlap(otherFeature, entityFeature) || Turf.booleanContains(otherFeature, entityFeature)) {
            for (const [key, value] of Object.entries(soundLimits)) {
                if (otherFeature.properties[soundPropertyKey] == key) {
                    return { point: entity.amplifiedSound > value };
                }
            }
        }
    } else if (Turf.booleanOverlap(entityFeature, otherFeature) || Turf.booleanContains(otherFeature, entityFeature)) {
        // In sound zone
        for (const [key, value] of Object.entries(soundLimits)) {
            if (otherFeature.properties[soundPropertyKey] == key && entity.amplifiedSound > value) {
                return { zone: true };
            }
        }
    }
    return;
}

/**
 * Checks if an entity is breaking a sound limit
 * 
 * Check's both soundspots and zones. 
 * A soundspots result will take precedence over a zone result.
 * 
 */
export const isBreakingSoundLimit = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    if (entity.amplifiedSound != null && entity.amplifiedSound > 0) return { triggered: false };

    let entityGeoJson = entity.toGeoJSON();
    let { point, zone } = { point: undefined, zone: false };
    layerGroup.eachLayer((layer) => {
        let layerGeoJson = layer.toGeoJSON();
        if (layerGeoJson.features) {
            for (let i = 0; i < layerGeoJson.features.length; i++) {
                const feature = layerGeoJson.features[i];
                let result = breaksSoundRule(entity, entityGeoJson, feature);
                if (result) {
                    if (result.point !== undefined) point = result.point;
                    if (result.zone !== undefined) zone = result.zone;
                }
            }
        } else {
            let result = breaksSoundRule(entity, entityGeoJson, layerGeoJson);
            if (result) {
                if (result.point !== undefined) point = result.point;
                if (result.zone !== undefined) zone = result.zone;
            }
        }
    });

    if (point !== undefined) {
        // Sound spot takes precedence over zone
        return { triggered: point };
    } else {
        return { triggered: zone };
    }
});
