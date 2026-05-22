import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';
import { MapEntity } from '../../entities';
import { soundLimits, soundPropertyKey, soundSpotType } from '../../utils/soundData';

function checkIsOnSoundSpot(entity: MapEntity, entityFeature: any, otherFeature: any): boolean {
    if (otherFeature.geometry.type === "Point") {
        return false;
    }
    if (otherFeature.properties.type === soundSpotType) {
        return (Turf.booleanOverlap(otherFeature, entityFeature) || Turf.booleanContains(otherFeature, entityFeature));
        // if (Turf.booleanOverlap(otherFeature, entityFeature) || Turf.booleanContains(otherFeature, entityFeature)){
        //     for(const [key, value] of Object.entries(soundLimits)){
        //         if(otherFeature.properties[soundPropertyKey] == key){
        //             return entity.amplifiedSound < value * 0.1;
        //         }
        //     }
        // }
    }
    return false;
}

export const isOnSoundSpot = (
    layerGroup: any,
    severity: Severity,
    shortMsg: string,
    message: string,
    skipFor: (entity: MapEntity) => boolean = () => false
) => new Rule(severity, shortMsg, message, (entity) => {
    if (skipFor(entity)) {
        return { triggered: false };
    }
    let entityGeoJson = entity.toGeoJSON();
    let triggered = false;
    
    layerGroup.eachLayer((layer) => {
        let layerGeoJson = layer.toGeoJSON();
        if (layerGeoJson.features) {
            for (let i = 0; i < layerGeoJson.features.length; i++) {
                const feature = layerGeoJson.features[i];
                triggered = checkIsOnSoundSpot(entity, entityGeoJson, feature);
            }
        } else {
            triggered = checkIsOnSoundSpot(entity, entityGeoJson, layerGeoJson);
        }
    });
    return { triggered };
});
