import * as Turf from '@turf/turf';
import type { MapEntity } from './entity';

const MAX_SQM_FOR_ENTITY: number = 2000;

export class Rule {
    private _severity: 0 | 1 | 2 | 3;
    private _triggered: boolean;
    private _callback: (entity: MapEntity) => boolean;

    public readonly message: string;

    public get severity(): number {
        return this._triggered ? this._severity : 0;
    }

    public get triggered(): boolean {
        return this._triggered;
    }

    public checkRule(entity: MapEntity) {
        this._triggered = !this._callback(entity);
    }

    constructor(severity: Rule['_severity'], message: string, callback: Rule['_callback']) {
        this._severity = severity;
        this._triggered = false;
        this._callback = callback;

        this.message = message;
    }
}

const hasMissingFields = () =>
    new Rule(1, '', (entity) => {
        return !entity.name || !entity.description;
    });

const isWayTooBig = () =>
    new Rule(2, 'Are you aware that the area is very very large?', (entity) => {
        return entity.area > MAX_SQM_FOR_ENTITY;
    });

const isBiggerThanNeeded = () =>
    new Rule(1, 'Are you aware that the area is smaller than the calculated need?', (entity) => {
        return entity.area > entity.calculatedAreaNeeded * 1.5;
    });

const isSmallerThanNeeded = () =>
    new Rule(1, 'Are you aware that the area is much bigger than the calculated need?', (entity) => {
        return entity.area < entity.calculatedAreaNeeded;
    });

const isOverlapping = (layerGroup: any) =>
    new Rule(2, 'This area is overlapping a fire road, please fix that <3', (entity) => {
        return _isGeoJsonOverlappingLayergroup(entity.toGeoJSON(), layerGroup);
    });

const isBufferOverlapping = (layerGroup: any) =>
    new Rule(2, 'Too close to another area, please fix that <3', (entity) => {
        //Get the first feature of the buffer layer, since toGeoJSON() always returns a feature collection
        if (!entity.bufferLayer) {
            return true;
        }
        return _isGeoJsonOverlappingLayergroup(
            //@ts-ignore
            entity.bufferLayer.toGeoJSON().features[0],
            layerGroup as any,
        );
    });

const isInsideBoundaries = (layerGroup: any) =>
    new Rule(3, 'You have placed yourself outside our land, please fix that <3', (entity) => {
        const layers = layerGroup.getLayers();

        for (const layer of layers) {
            let otherGeoJson = layer.toGeoJSON();

            // Loop through all features if it is a feature collection
            if (otherGeoJson.features) {
                for (let i = 0; i < otherGeoJson.features.length; i++) {
                    if (Turf.booleanContains(otherGeoJson.features[i], entity.toGeoJSON())) {
                        return true;
                    }
                }
            } else if (Turf.booleanContains(otherGeoJson, entity.toGeoJSON())) {
                return true;
            }
        }

        return false;
    });

/** Utility function to generate rules to be used with the editor   */
export function generateRulesForEditor(groups: any, placementLayers: any): Array<Rule> {
    return [
        hasMissingFields(),
        isWayTooBig(),
        isBiggerThanNeeded(),
        isSmallerThanNeeded(),
        isOverlapping(groups.fireroad),
        isBufferOverlapping(placementLayers),
        isInsideBoundaries(groups.propertyborder),
        //isInsideBoundaries(groups.placementareas),
    ];
}

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
