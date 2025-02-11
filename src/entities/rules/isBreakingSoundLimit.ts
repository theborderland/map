import * as Turf from '@turf/turf';
import { Severity, Rule } from '../rule';

export const isBreakingSoundLimit = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    if (entity.amplifiedSound === undefined) return { triggered: false };

    let geoJson = entity.toGeoJSON();
    let overlap = false;

    layerGroup.eachLayer((layer) => {
        //@ts-ignore
        let otherGeoJson = layer.toGeoJSON();
        let limitQuiet = 10;
        let limitLow = 120;
        let limitMediumLow = 2000;
        let limitMedium = 2000;

        //Loop through all features if it is a feature collection
        if (otherGeoJson.features) {
            for (let i = 0; i < otherGeoJson.features.length; i++) {
                if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i]) ||
                    Turf.booleanContains(otherGeoJson.features[i], geoJson)) {
                    if (otherGeoJson.features[i].properties.type == 'soundquiet' &&
                        entity.amplifiedSound > limitQuiet) {
                        overlap = true;
                        return;
                    } else if (otherGeoJson.features[i].properties.type == 'soundlow' &&
                        entity.amplifiedSound > limitLow) {
                        overlap = true;
                        return;
                    } else if (otherGeoJson.features[i].properties.type == 'soundmediumlow' &&
                        entity.amplifiedSound > limitMediumLow) {
                        overlap = true;
                        return;
                    } else if (otherGeoJson.features[i].properties.type == 'soundmedium' &&
                        entity.amplifiedSound > limitMedium) {
                        overlap = true;
                        return;
                    }
                }
            }
        } else if (Turf.booleanOverlap(geoJson, otherGeoJson) || Turf.booleanContains(otherGeoJson, geoJson)) {
            if (otherGeoJson.properties.type == 'soundquiet' && entity.amplifiedSound > limitQuiet) {
                overlap = true;
                return;
            } else if (otherGeoJson.properties.type == 'soundlow' && entity.amplifiedSound > limitLow) {
                overlap = true;
                return;
            } else if (otherGeoJson.properties.type == 'soundmediumlow' && entity.amplifiedSound > limitMediumLow) {
                overlap = true;
                return;
            } else if (otherGeoJson.properties.type == 'soundmedium' && entity.amplifiedSound > limitMedium) {
                overlap = true;
                return;
            }
        }

        if (overlap) {
            return; // Break out of the loop once an overlap is found
        }
    });

    return { triggered: overlap };
});
