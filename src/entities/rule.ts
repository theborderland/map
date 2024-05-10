import * as Turf from '@turf/turf';
import type { MapEntity } from './entity';
import { Geometry } from 'geojson';
import { GeoJSON } from 'leaflet';
import * as L from 'leaflet';
import CheapRuler from 'cheap-ruler';
const MAX_CLUSTER_SIZE: number = 1250;
const MAX_POWER_NEED: number = 8000;
const MAX_POINTS_BEFORE_WARNING: number = 10;
const FIRE_BUFFER_IN_METER: number = 5;
const CHEAP_RULER_BUFFER: number= FIRE_BUFFER_IN_METER+1; // We add a little extra to the buffer, to compensate for usign the approximation method from cheapruler

const ruler = new CheapRuler(57.5, 'meters')

class ClusterCache{
    // Class to cache overlap and area calculations of entities.
    // Since moving or redrawing a entity creates a new leaflet_id we dont have to worry about invalidating cache results.
    private areaCache: {[key:number]:number} = {}
    private overlapCache: {[key:number]:{[key:number]:Boolean}} ={}// a dict with a dict of booleans eg. x[1][2] = true
    

    private coordsCache:{[key:string]:Array<{[key:string]:number}>} = {}
    public coordsHaveChanged(layerID:any,coords:Array<{[key:string]:number}>){
        //Input: coords -> layer._latlng[0]
        // Returns true  if coords are still the same for layerID and caches new coords if not
        // can be used to check if layerID should be cache invalidated
        let haveChanged = false
        
        if(!(layerID in this.coordsCache) || this.coordsCache[layerID].length == 0 || !(this.coordsCache[layerID].length ==coords.length) ){
            haveChanged =  true
        }else{
            // they have the same length and this length is not 0
            for(let i=0;i<this.coordsCache[layerID].length;i++){
                if(!(this.coordsCache[layerID][i].lat ==coords[i].lat && this.coordsCache[layerID][i].lng ==coords[i].lng )){
              
                    haveChanged = true
                    break;
                }
            }
        }
        if(haveChanged){
            // have changed so we update cached value
            const coordsClone = [] // references to objects in arrays change together so we need to do this cloning
            for(let i=0;i<coords.length;i++){
                coordsClone.push({lat:coords[i].lat,lng:coords[i].lng})
            }
            this.coordsCache[layerID] = coordsClone
            return true
            
        }else{
            return false
        }
    }   
    public areaIsCached(layerID:number):Boolean{
        return layerID in this.areaCache
    }
    public getAreaCache(layerID:number):number{
        return this.areaCache[layerID]
    }
    public setAreaCache(layerID:number,value:number){
        this.areaCache[layerID] = value
    }
    public overlapIsCached(layerID1:number,layerID2:number):Boolean{
        return (layerID1 in this.overlapCache) && (layerID2 in this.overlapCache[layerID1])
    }
    public getOverlapCache(layerID1:number,layerID2:number):Boolean{
        return this.overlapCache[layerID1][layerID2]
    }
    public setOverlapCache(layerID1:number,layerID2:number,value:Boolean){
        for (let layerIDS of [[layerID1,layerID2],[layerID2,layerID1]]){
            if (!( layerIDS[0] in this.overlapCache)){
                this.overlapCache[layerIDS[0]] = {}
            }
            this.overlapCache[layerIDS[0]][layerIDS[1]] = value
        }
    }
    public invalidateCache(layerID:number){
        // call this when changes hav been made to a layer meaning we want to calculate anew.
        if (layerID in this.overlapCache){
            for (let otherLayerID in this.overlapCache[layerID]){
                if(this.overlapCache[otherLayerID] && layerID in this.overlapCache[otherLayerID] ){
                    delete this.overlapCache[otherLayerID][layerID]
                }
            }
        }
        delete this.overlapCache[layerID]
        if (layerID in this.areaCache) {
            delete this.areaCache[layerID]
        }
    }
    
}
const clusterCache = new ClusterCache(); // instantiate here and use it as a global cache when calculating clusters
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
        // isBiggerThanNeeded(),
        // isSmallerThanNeeded(),
        // isCalculatedAreaTooBig(),
        hasLargeEnergyNeed(),
        // hasMissingFields(),
        // hasManyCoordinates(),
        // isBreakingSoundLimit(groups.soundguide, 2, 'Making too much noise?', 'Seems like you wanna play louder than your neighbors might expect? Check the sound guider layer!'),
        // isOverlapping(placementLayers, 2, 'Overlapping other area!','Your area is overlapping someone elses, plz fix <3'),
        // isOverlappingOrContained(groups.slope, 1, 'Slope warning!','Your area is in slopey or uneven terrain, make sure to check the slope map layer to make sure that you know what you are doing :)'),
        // isOverlappingOrContained(groups.fireroad, 3, 'Touching fireroad!','Plz move this area away from the fire road!'),
        // isNotInsideBoundaries(groups.propertyborder, 3, 'Outside border!','You have placed yourself outside our land, please fix that <3'),
        // isInsideBoundaries(groups.hiddenforbidden, 3, 'Inside forbidden zone!', 'You are inside a zone that can not be used this year.'),
        isBufferOverlappingRecursive(placementLayers, 3, 'Too large/close to others!','This area is either in itself too large, or too close to other areas. Make it smaller or move it further away.'),
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
        //@ts-ignore
        const layer = entity.layer._layers[Object.keys(entity.layer._layers)[0]]

        // invalidate cache if coords have changed
        //@ts-ignore
        clusterCache.coordsHaveChanged(layer._leaflet_id,layer._latlngs[0] ) && clusterCache.invalidateCache(entity.layer._leaflet_id)
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

    let totalArea:number;
    //@ts-ignore
    if (clusterCache.areaIsCached(layer._leaflet_id)){
        //@ts-ignore
        totalArea = clusterCache.getAreaCache(layer._leaflet_id)
    }else{
        //@ts-ignore
        totalArea = Turf.area(layer.toGeoJSON());
        //@ts-ignore
        clusterCache.setAreaCache(layer._leaflet_id,totalArea)
    }

    // get an approximate bounding box with firebuffer padding to use for later calculations
    //@ts-ignore
    const bounds = layer.getBounds()
    let boxBounds = [bounds._southWest.lng,bounds._southWest.lat,bounds._northEast.lng,bounds._northEast.lat]
    //@ts-ignore
    const bBox = ruler.bufferBBox(boxBounds, CHEAP_RULER_BUFFER);
    
    //@ts-ignore
    layerGroup.eachLayer((otherLayer) => {
        if (!_compareLayers(layer, otherLayer))
        {
            let overlaps; // becomes true if the two layers overlap
            //@ts-ignore
            if(clusterCache.overlapIsCached(layer._leaflet_id,otherLayer._leaflet_id)){
                //@ts-ignore
                overlaps = clusterCache.getOverlapCache(layer._leaflet_id,otherLayer._leaflet_id)
            }
            else{
                // Overlap is not cached -> calculate it

                // approximate bounding box
                //@ts-ignore
                const otherBounds = otherLayer.getBounds()
                let otherBoxBounds = [otherBounds._southWest.lng,otherBounds._southWest.lat,otherBounds._northEast.lng,otherBounds._northEast.lat]
                //@ts-ignore
                const otherBbox = otherBoxBounds; // We already padded layer. No need to pad otherLayer also
                    // check if approx bounding boxes overlap
                    if( (otherBbox[0] > bBox[2] ||
                      otherBbox[2] < bBox[0] ||
                      otherBbox[3] < bBox[1] ||
                      otherBbox[1] > bBox[3])
                    ){
                        // bounding boxes do not overlap so polygons also dont overlap
                        overlaps = false
                        //@ts-ignore
                        clusterCache.setOverlapCache(layer._leaflet_id,otherLayer._leaflet_id,overlaps)
                    }else{
                        // bounding boxes overlap so polygons might overlap. Time to do the expensive calculations
                  
                        //@ts-ignore
                        const otherLayerGeoJSON = otherLayer.toGeoJSON();
                        let otherLayerPolygon;
                        if (otherLayerGeoJSON.type === 'Feature') {
                            otherLayerPolygon = otherLayerGeoJSON.geometry;
                        } else if (otherLayerGeoJSON.type === 'FeatureCollection') {
                            otherLayerPolygon = otherLayerGeoJSON.features[0];
                        } else {
                            // Unsupported geometry type
                            throw new Error("unsupported geometry")
                        }

                        //@ts-ignore
                        let buffer = Turf.buffer(layer.toGeoJSON(), FIRE_BUFFER_IN_METER, { units: 'meters' }) as Turf.helpers.FeatureCollection<Turf.helpers.Polygon>;
                        if (Turf.booleanOverlap(buffer.features[0], otherLayerPolygon)||Turf.booleanContains(buffer.features[0], otherLayerPolygon)) {
                            overlaps=true
                        }else{
                            overlaps = false
                        }
                        //@ts-ignore
                        clusterCache.setOverlapCache(layer._leaflet_id,otherLayer._leaflet_id,overlaps)
                        }
            }
            if (overlaps){

                totalArea += _getTotalAreaOfOverlappingEntities(otherLayer, layerGroup, checkedOverlappingLayers);
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
