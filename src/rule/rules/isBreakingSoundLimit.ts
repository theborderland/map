import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';
import { MapEntity } from '../../entities';

const soundLimits = {
    "sound_c": 120,
    "sound_d": 2000,
    "sound_e": 2000
}

const soundPropertyKey = "soundlevel";

function breaksSoundRule(entity: MapEntity, entityFeature, otherFeature) {
    if(otherFeature.geometry.type === "Point"){
        // TODO: Check sound points
    } else if (Turf.booleanOverlap(entityFeature, otherFeature) || Turf.booleanContains(otherFeature, entityFeature)) {
        // Check sound zones
        for(const [key, value] of Object.entries(soundLimits)){
            if(otherFeature.properties[soundPropertyKey] == key && entity.amplifiedSound > value){
                return true;
            }
        }
    }
    return false;
}

export const isBreakingSoundLimit = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    if (entity.amplifiedSound === undefined) return { triggered: false };

    let entityGeoJson = entity.toGeoJSON();
    let triggered = false;
    layerGroup.eachLayer((layer) => {
        let layerGeoJson = layer.toGeoJSON();        
        if (layerGeoJson.features) {
            for (let i = 0; i < layerGeoJson.features.length; i++) {
                const feature = layerGeoJson.features[i];
                if (breaksSoundRule(entity, entityGeoJson, feature)) {
                    triggered = true;
                }
            }
        } else if (breaksSoundRule(entity, entityGeoJson, layerGeoJson)) {
            triggered = true;
        }
    });

    return { triggered };
});
