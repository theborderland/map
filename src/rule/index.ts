import * as Turf from '@turf/turf';
import * as L from 'leaflet';
import CheapRuler from 'cheap-ruler';
import type { MapEntity } from '../entities/entity';
import { ClusterCache } from '../entities/ClusterCache';
import * as Rules from './rules';
import { FIRE_BUFFER_IN_METER } from '../../SETTINGS';

export const clusterCache = new ClusterCache(); // instantiate here and use it as a global cache when calculating clusters
export const ruler = new CheapRuler(57.5, 'meters');
export enum Severity {
    None = 0,
    Low = 1,
    Medium = 2,
    High = 3,
}

export class Rule {
    private _severity: Severity;
    private _triggered: boolean;
    private _callback: (entity: MapEntity) => { triggered: boolean; shortMessage?: string; message?: string };

    public message: string;
    public shortMessage: string;

    public get severity(): Severity {
        return this._triggered ? this._severity : Severity.None;
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

    constructor(severity: Severity, shortMessage: string, message: string, callback: Rule['_callback']) {
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
        Rules.isBiggerThanNeeded(),
        Rules.isCalculatedAreaTooBig(),
        Rules.hasLargeEnergyNeed(),
        Rules.hasMissingFields(),
        // Rules.hasManyCoordinates(),
        // Rules.isBreakingSoundLimit(
        //     groups.soundguide,
        //     2,
        //     'Making too much noise?',
        //     'Seems like you wanna play louder than your neighbors might expect? Check the sound guider layer!',
        // ),
        Rules.isOverlapping(
            placementLayers,
            Severity.Medium,
            'Overlapping other area!',
            'Your area is overlapping someone elses, plz fix <3',
        ),
        Rules.isOverlappingOrContained(
            groups.slope,
            Severity.Low,
            'Slope warning!',
            'Your area is in slopey or uneven terrain, make sure to check the slope map layer to make sure that you know what you are doing :)',
        ),
        Rules.isOverlappingOrContained(
            groups.fireroad,
            Severity.High,
            'Touching fireroad!',
            'Plz move this area away from the fire road!',
        ),
        Rules.isNotInsideBoundaries(
            groups.propertyborder,
            Severity.High,
            'Outside border!',
            'You have placed yourself outside our land, please fix that <3',
        ),
        Rules.isOverlappingOrContained(
            groups.hiddenforbidden,
            Severity.High,
            'Inside forbidden zone!',
            'You are inside a zone that can not be used this year.',
        ),
        Rules.isBufferOverlappingRecursive(
            placementLayers,
            Severity.High,
            'Too large/close to others!',
            'For fire safety, we need to add a bit of open space (' +
                FIRE_BUFFER_IN_METER +
                'm2) between these camps (or if not next to any camps, this camp simply too big)',
        ),
        Rules.isNotInsideBoundaries(
            groups.neighbourhood,
            Severity.Medium,
            'Outside placement areas.',
            'You are outside the main placement area (yellow border). Make sure you know what you are doing.',
        ),
        Rules.isOverlappingOrContained(
            groups.publicplease,
            Severity.Low,
            'Close to fire road',
            'You are adjucant to a fire road, please use this space for public offerings and not just for sleeping',
        ),
        Rules.isOverlappingOrContained(
            groups.minorroad,
            Severity.Medium,
            'Blocking a path',
            'You are possibly blocking a path for walking around (the black dotted lines). Keep it clean if possible or plan accordingly!',
        ),
        // Special notification when close to sanctuary
        Rules.isOverlappingOrContained(
            groups.closetosanctuary,
            Severity.Low,
            'Close to the  sanctuary',
            'This area is in the viscinity of the sanctuary, please be mindful of what energy your camp is releasing and how it may effect the santuarcy',
        ),
        // Special notification when on the western meadow
        Rules.isOverlappingOrContained(
            groups.redsoundzone,
            Severity.Low,
            'In the western meadow',
            "You're in the western meadow, please be extra careful of keeping the land in good condition and do not put your overnight camp here unless necessary, public dreams are prefered",
        ),
    ];
}

// Function not used?
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
