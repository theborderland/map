import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';

export const isInLowPowerArea = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    let geoJson = entity.toGeoJSON();
    let inLowPowerArea = false;

    // Check if entity overlaps or is contained in low power area
    layerGroup?.eachLayer((layer) => {
        //@ts-ignore
        let otherGeoJson = layer.toGeoJSON();
        
        // Handle both single features and feature collections
        if (otherGeoJson.features) {
            for (let i = 0; i < otherGeoJson.features.length; i++) {
                if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i]) ||
                    Turf.booleanContains(otherGeoJson.features[i], geoJson)) {
                    inLowPowerArea = true;
                    return;
                }
            }
        } else if (Turf.booleanOverlap(geoJson, otherGeoJson) || Turf.booleanContains(otherGeoJson, geoJson)) {
            inLowPowerArea = true;
        }

        if (inLowPowerArea) {
            return;
        }
    });

    return { triggered: inLowPowerArea };
});
