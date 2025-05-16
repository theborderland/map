import * as Turf from '@turf/turf';
import { Severity, Rule } from '../index';
import { MapEntity } from '../../entities';
import { soundLimits, soundPropertyKey, soundSpotType } from '../../utils/soundData';

function checkIsOnSoundSpot(entity: MapEntity, entityFeature, otherFeature) {
    if(otherFeature.geometry.type === "Point"){
        return;
    }
    if(otherFeature.properties.type === soundSpotType){
        if(Turf.booleanOverlap(otherFeature, entityFeature) || Turf.booleanContains(otherFeature, entityFeature)){
            for(const [key, value] of Object.entries(soundLimits)){
                if(otherFeature.properties[soundPropertyKey] == key){
                    return entity.amplifiedSound < value * 0.1;
                }
            }
        }
    }
    return false;
}

export const isOnSoundSpot = (
    layerGroup: any, 
    severity: Severity, 
    shortMsg: string, 
    message: string
) => new Rule(severity, shortMsg, message, (entity) => {
    let entityGeoJson = entity.toGeoJSON();
    let triggered = false;
    layerGroup.eachLayer((layer) => {
        let layerGeoJson = layer.toGeoJSON();        
        if (layerGeoJson.features) {
            for (let i = 0; i < layerGeoJson.features.length; i++) {
                const feature = layerGeoJson.features[i];
                if (checkIsOnSoundSpot(entity, entityGeoJson, feature)) {
                    triggered = true;
                }
            }
        } else{
            if (checkIsOnSoundSpot(entity, entityGeoJson, layerGeoJson)) {
                triggered = true;
            }
        }
    });

    return { triggered };
});
