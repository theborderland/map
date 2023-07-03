import * as Turf from '@turf/turf';
import type { MapEntity } from './entity';
import { Geometry } from 'geojson';
import { GeoJSON } from 'leaflet';
import * as L from 'leaflet';

const MAX_CLUSTER_SIZE: number = 1250;
const MAX_POWER_NEED: number = 8000;
const MAX_POINTS_BEFORE_WARNING: number = 10;
const FIRE_BUFFER_IN_METER: number = 5;

export class Rule {
    private _severity: 0 | 1 | 2 | 3;
    private _triggered: boolean;
    private _callback: (entity: MapEntity) => { triggered: boolean, shortMessage?: string, message?: string };

    public message: string;
    public shortMessage: string;

    public get severity(): number {
        return this._triggered ? this._severity : 0;
    }

    public get triggered(): boolean {
        return this._triggered;
    }

    public checkRule(entity: MapEntity) {
        const result = this._callback(entity);
        this._triggered = result.triggered;
        if (result.shortMessage) this.shortMessage = result.shortMessage;
        if (result.message) this.message = result.message;
    }

    constructor(severity: Rule['_severity'], shortMessage: string, message: string, callback: Rule['_callback']) {
        this._severity = severity;
        this._triggered = false;
        this._callback = callback;

        this.shortMessage = shortMessage;
        this.message = message;
    }
}

/** Utility function to generate a rule generator function to be used with the editor */
export function generateRulesForEditor(groups: any, placementLayers: any): () => Array<Rule> {
    return () => [
        isBiggerThanNeeded(),
        isSmallerThanNeeded(),
        isCalculatedAreaTooBig(),
        hasLargeEnergyNeed(),
        hasMissingFields(),
        // hasManyCoordinates(),
        isBreakingSoundLimit(groups.soundguide, 2, 'Making too much noise?', 'Seems like you wanna play louder than your neighbors might expect? Check the sound guider layer!'),
        isOverlapping(placementLayers, 2, 'Overlapping other area!','Your area is overlapping someone elses, plz fix <3'),
        // isOverlappingOrContained(groups.slope, 1, 'Slope warning!','Your area is in slopey or uneven terrain, make sure to check the slope map layer to make sure that you know what you are doing :)'),
        // isOverlappingOrContained(groups.fireroad, 3, 'Touching fireroad!','Plz move this area away from the fire road!'),
        // isNotInsideBoundaries(groups.propertyborder, 3, 'Outside border!','You have placed yourself outside our land, please fix that <3'),
        isInsideBoundaries(groups.hiddenforbidden, 3, 'Inside forbidden zone!', 'You are inside a zone that can not be used this year.'),
        // isBufferOverlappingRecursive(placementLayers, 3, 'Too large/close to others!','This area is either in itself too large, or too close to other areas. Make it smaller or move it further away.'),
        // isNotInsideBoundaries(groups.highprio, 2, 'Outside placement areas.', 'You are outside the main placement area (yellow border). Make sure you know what you are doing.'),
    ];
}

const hasManyCoordinates = () =>
    new Rule(1, 'Many points.', 'You have added many points to this shape. Bear in mind that you will have to set this shape up in reality as well.', (entity) => {
        const geoJson = entity.toGeoJSON();
        //Dont know why I have to use [0] here, but it works
        return {triggered: geoJson.geometry.coordinates[0].length > MAX_POINTS_BEFORE_WARNING};
    });

const hasLargeEnergyNeed = () =>
    new Rule(1, 'Powerful.', 'You need a lot of power, make sure its not a typo.', (entity) => {
        return {triggered: entity.powerNeed > MAX_POWER_NEED};
    });

const hasMissingFields = () =>
    new Rule(2, 'Missing info', 'Fill in name, description, contact info, power need and sound amplification please.', (entity) => {
        return {triggered: !entity.name || !entity.description || !entity.contactInfo || entity.powerNeed === -1 || entity.amplifiedSound === -1};
    });

const isCalculatedAreaTooBig = () =>
    new Rule(3, 'Too many ppl/vehicles!', 'Calculated area need is bigger than the maximum allowed area size! Make another area to fix this.', (entity) => {
        return {triggered: entity.calculatedAreaNeeded > MAX_CLUSTER_SIZE};
    });

const isBiggerThanNeeded = () =>
    new Rule(2, 'Bigger than needed?', 'Your area is quite big for the amount of people/vehicles and extras you have typed in.', (entity) => {
        
        return {triggered: entity.area > calculateReasonableArea(entity.calculatedAreaNeeded), message: `Your area is <b>${entity.area - entity.calculatedAreaNeeded}m² bigger</b> than the suggested area size. Consider making it smaller.`};
    });

function calculateReasonableArea(calculatedNeed: number): number {
  // Define constants for the power function
  const a = 0.5; // Controls the initial additional area
  const b = -0.2; // Controls the rate of decrease of the additional area

  // Calculate the additional area percentage using a power function
  const additionalArea = a * Math.pow(calculatedNeed, b);

  // Clamp the additional area between 0 and a
  const clampedAdditionalArea = Math.max(0, Math.min(additionalArea, a));

  // Calculate the allowed area
  const allowedArea = Math.min(calculatedNeed * (1 + clampedAdditionalArea), MAX_CLUSTER_SIZE);
  
  return allowedArea;
}

const isSmallerThanNeeded = () =>
    new Rule(
        1,
        'Too small.',
        'Considering the amount of people, vehicles and extras you have, this area is probably too small.',
        (entity) => {
            let calculatedNeed = entity.calculatedAreaNeeded;
            if (entity.area < calculatedNeed) {
                return { triggered: true, 
                    shortMessage: 'Too small.', 
                    message: `Considering the amount of people, vehicles and extras you have, this area is probably too small. Consider adding at least ${Math.ceil(calculatedNeed - entity.area)}m² more.`};
            }
            else {
                return { triggered: false };
            }
        }
    );

const isOverlapping = (layerGroup: any, severity: Rule["_severity"], shortMsg: string, message: string) =>
    new Rule(severity, shortMsg,message, (entity) => {
        return {triggered: _isGeoJsonOverlappingLayergroup(entity.toGeoJSON(), layerGroup) };
    });

const isOverlappingOrContained = (layerGroup: any, severity: Rule["_severity"], shortMsg: string, message: string) =>
    new Rule(severity, shortMsg,message, (entity) => {

        let geoJson = entity.toGeoJSON();
        let overlap = false;

        layerGroup.eachLayer((layer) => {
            //@ts-ignore
            let otherGeoJson = layer.toGeoJSON();

            //Loop through all features if it is a feature collection
            if (otherGeoJson.features) {
                for (let i = 0; i < otherGeoJson.features.length; i++) {
                    if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i]) || Turf.booleanContains(otherGeoJson.features[i], geoJson)) {
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

        return { triggered: overlap};
    });

const isInsideBoundaries = (layerGroup: any, severity: Rule["_severity"], shortMsg: string, message: string) =>
    checkEntityBoundaries(layerGroup, severity, shortMsg, message, true);

const isNotInsideBoundaries = (layerGroup: any, severity: Rule["_severity"], shortMsg: string, message: string) =>
    checkEntityBoundaries(layerGroup, severity, shortMsg, message, false);

const checkEntityBoundaries = (
    layerGroup: any,
    severity: Rule["_severity"],
    shortMsg: string,
    message: string,
    shouldBeInside: boolean
    ) =>
        new Rule(severity, shortMsg, message, (entity) => {
            const layers = layerGroup.getLayers();

            for (const layer of layers) {
                let otherGeoJson = layer.toGeoJSON();

                // Loop through all features if it is a feature collection
                if (otherGeoJson.features) {
                    for (let i = 0; i < otherGeoJson.features.length; i++) {
                        if (Turf.booleanContains(otherGeoJson.features[i], entity.toGeoJSON())) {
                            return {triggered: shouldBeInside};
                        }
                    }
                } else if (Turf.booleanContains(otherGeoJson, entity.toGeoJSON())) {
                    return {triggered: shouldBeInside};
                }
            }

            return {triggered: !shouldBeInside};
        });

/** Utility function to calculate the ovelap between a geojson and layergroup */
function _isGeoJsonOverlappingLayergroup(
    geoJson: Turf.helpers.Feature<any, Turf.helpers.Properties> | Turf.helpers.Geometry,
    layerGroup: L.GeoJSON,
): boolean {
    //NOTE: Only checks overlaps, not if its inside or covers completely

    let overlap = false;
    layerGroup.eachLayer((layer) => {
        //@ts-ignore
        let otherGeoJson = layer.toGeoJSON();

        //Loop through all features if it is a feature collection
        if (otherGeoJson.features) {
            for (let i = 0; i < otherGeoJson.features.length; i++) {
                if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i])) {
                    overlap = true;
                    return; // Break out of the inner loop
                }
            }
        } else if (Turf.booleanOverlap(geoJson, otherGeoJson)) {
            overlap = true;
        }

        if (overlap) {
            return; // Break out of the loop once an overlap is found
        }
    });

    return overlap;
}

const isBufferOverlappingRecursive = (layerGroup: any, severity: Rule["_severity"], shortMsg: string, message: string) =>
    new Rule(severity, shortMsg, message, (entity) => {
        const checkedOverlappingLayers = new Set<string>();
        
        let totalArea = _getTotalAreaOfOverlappingEntities(entity.layer, layerGroup, checkedOverlappingLayers);

        if ( totalArea > MAX_CLUSTER_SIZE) {
            return {triggered: true, shortMessage: `Cluster too big: ${Math.round(totalArea).toString()}m²`};
        }
        return {triggered: false};
    });

function _getTotalAreaOfOverlappingEntities(layer: L.Layer, layerGroup: L.LayerGroup, checkedOverlappingLayers: Set<string>): number {
    //@ts-ignore
    if (checkedOverlappingLayers.has(layer._leaflet_id))
    {
        return 0;
    }
    else
    {
        //@ts-ignore
        checkedOverlappingLayers.add(layer._leaflet_id);
    }
    
    //@ts-ignore
    let totalArea = Turf.area(layer.toGeoJSON());
    
    //@ts-ignore
    let buffer = Turf.buffer(layer.toGeoJSON(), FIRE_BUFFER_IN_METER, { units: 'meters' }) as Turf.helpers.FeatureCollection<Turf.helpers.Polygon>;

    layerGroup.eachLayer((otherLayer) => {
        if (!_compareLayers(layer, otherLayer))
        {
            //@ts-ignore
            const otherLayerGeoJSON = otherLayer.toGeoJSON();
            let otherLayerPolygon;
            if (otherLayerGeoJSON.type === 'Feature') {
                otherLayerPolygon = otherLayerGeoJSON.geometry;
            } else if (otherLayerGeoJSON.type === 'FeatureCollection') {
                otherLayerPolygon = otherLayerGeoJSON.features[0];
            } else {
                // Unsupported geometry type
                return;
            }

            //@ts-ignore
            if (Turf.booleanOverlap(buffer.features[0], otherLayerPolygon)) { //&& !checkedOverlappingLayers.has(otherLayer._leaflet_id)
                //@ts-ignore
                totalArea += _getTotalAreaOfOverlappingEntities(otherLayer, layerGroup, checkedOverlappingLayers);
                return;
            }
        }
    });

    return totalArea;
}

function _compareLayers(layer1: L.Layer, layer2: L.Layer): boolean {
    //@ts-ignore
    return layer1._leaflet_id === layer2._leaflet_id;
}

const isBreakingSoundLimit = (layerGroup: any, severity: Rule["_severity"], shortMsg: string, message: string) =>
    new Rule(severity, shortMsg,message, (entity) => {

        if (entity.amplifiedSound === undefined) return {triggered: false};
        
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
                    if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i]) || Turf.booleanContains(otherGeoJson.features[i], geoJson)) {
                        if (otherGeoJson.features[i].properties.type == "soundquiet" && entity.amplifiedSound > limitQuiet) {
                            overlap = true;
                            return; 
                        } else if (otherGeoJson.features[i].properties.type == "soundlow" && entity.amplifiedSound > limitLow) {
                            overlap = true;
                            return; 
                        } else if (otherGeoJson.features[i].properties.type == "soundmediumlow" && entity.amplifiedSound > limitMediumLow) {
                            overlap = true;
                            return; 
                        } else if (otherGeoJson.features[i].properties.type == "soundmedium" && entity.amplifiedSound > limitMedium) {
                            overlap = true;
                            return; 
                        }
                    }
                }
            } else if (Turf.booleanOverlap(geoJson, otherGeoJson) || Turf.booleanContains(otherGeoJson, geoJson)) {
                if (otherGeoJson.properties.type == "soundquiet" && entity.amplifiedSound > limitQuiet) {
                    overlap = true;
                    return; 
                } else if (otherGeoJson.properties.type == "soundlow" && entity.amplifiedSound > limitLow) {
                    overlap = true;
                    return; 
                } else if (otherGeoJson.properties.type == "soundmediumlow" && entity.amplifiedSound > limitMediumLow) {
                    overlap = true;
                    return; 
                } else if (otherGeoJson.properties.type == "soundmedium" && entity.amplifiedSound > limitMedium) {
                    overlap = true;
                    return; 
                }
            }

            if (overlap) {
                return; // Break out of the loop once an overlap is found
            }
        });

        return { triggered: overlap};
    });
