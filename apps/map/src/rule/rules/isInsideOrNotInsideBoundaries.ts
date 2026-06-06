import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';

export const isInsideBoundaries = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => checkEntityBoundaries(layerGroup, severity, shortMsg, message, true);

export const isNotInsideBoundaries = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => checkEntityBoundaries(layerGroup, severity, shortMsg, message, false);

const checkEntityBoundaries = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string,
    shouldBeInside: boolean
) => new Rule(severity, shortMsg, message, (entity) => {
    const layers = layerGroup.getLayers();
    const entityGeoJson = entity.toGeoJSON();
    
    for (const layer of layers) {
        let otherGeoJson = layer.toGeoJSON();

        // Loop through all features if it is a feature collection
        if (otherGeoJson.features) {
            for (let i = 0; i < otherGeoJson.features.length; i++) {
                if (Turf.booleanContains(otherGeoJson.features[i], entityGeoJson)) {
                    return { triggered: shouldBeInside };
                }
            }
        } else if (Turf.booleanContains(otherGeoJson, entityGeoJson)) {
            return { triggered: shouldBeInside };
        }
    }

    return { triggered: !shouldBeInside };
});
