import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';

export const isOverlappingOrContained = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    let geoJson = entity.toGeoJSON();
    let overlap = false;

    // added "?" incase there is no layer for the rule that has been added.
    // e.g. no publicplease layer, but the rule is still there
    layerGroup?.eachLayer((layer) => {
        //@ts-ignore
        let otherGeoJson = layer.toGeoJSON();
        
        //Loop through all features if it is a feature collection
        if (otherGeoJson.features) {
            for (let i = 0; i < otherGeoJson.features.length; i++) {
                if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i]) ||
                    Turf.booleanContains(otherGeoJson.features[i], geoJson)) {
                    overlap = true;
                    return; // Break out of the inner loop
                }
            }
        } else if (Turf.booleanOverlap(geoJson, otherGeoJson) || Turf.booleanContains(otherGeoJson, geoJson)) {
            overlap = true;
        }

        if (overlap) {
            return; // Break out of the loop once an overlap is found
        }
    });

    return { triggered: overlap };
});
