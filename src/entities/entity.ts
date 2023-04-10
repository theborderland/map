import * as L from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import '@geoman-io/leaflet-geoman-free';
import * as Turf from '@turf/turf';

/** The representation of a Map Entity in the API */
export interface EntityDTO {
    id: number;
    revision: number;
    geoJson: string;
    timestamp: number;
}

// TODO: Is this the correct location for this?
/** Returns the default style to use for map entities on the map */
export const DefaultLayerStyle: L.PathOptions = {
    color: '#66a6ff',
    fillColor: '#3388ff',
    fillOpacity: 0.25,
};

export const WarningLayerStyle: L.PathOptions = {
    color: '#ffbf66',
    fillColor: '#ffbf66',
    fillOpacity: 0.5,

};

export const DangerLayerStyle: L.PathOptions = {
    color: '#ff7366',
    fillColor: '#ff7366',
    fillOpacity: 0.75,
};

/**
 * Represents the fields and data for single Map Entity and includes
 * methods both for persisting and updating it, and representing it on a map
 */
export class MapEntity implements EntityDTO {
    private _originalGeoJson: string;
    
    public readonly id: number;
    public readonly revision: number;
    public readonly timestamp: number;
    public readonly layer: L.Layer & { pm?: any };
    public bufferLayer: L.Layer;
    
    // Information fields
    
    public name: string;
    public description: string;
    public nrOfPeople: string;
    public nrOfVehicles: string;
    public additionalSqm: string;
    public powerNeed: string;
    public isOverlapping: boolean;

    public get hasMissingFields(): boolean {
        return !this.name || !this.description;
    }

    public get isWayTooBig(): boolean {
        return this.area > 750;
    }

    public get isBiggerThanNeeded(): boolean {
        return this.area > this.calculatedAreaNeeded * 1.5;
    }

    public get isSmallerThanNeeded(): boolean {
        return this.area < this.calculatedAreaNeeded;
    }

    /** Calculated area needed for this map entity from the given information */
    public get calculatedAreaNeeded(): number {
        try {
            let calculatedareaneed = 0;

            //TODO: Set the correct values for the calculations
            if (this.nrOfPeople) {
                calculatedareaneed += Number(this.nrOfPeople) * 5;
            }
            if (this.nrOfVehicles) {
                calculatedareaneed += Number(this.nrOfVehicles) * 20;
            }
            if (this.additionalSqm) {
                calculatedareaneed += Number(this.additionalSqm);
            }

            return calculatedareaneed;
        } catch {
            return NaN;
        }
    }

    public get calculatedFireExtinguisherNeeded(): number {
        try {
            let calculatedFireExtinguisherNeeded = 1; //TODO: Set the correct values for the calculations
            return calculatedFireExtinguisherNeeded;
        }
        catch {
            return NaN;
        }
    }

    public updateLayerStyle()
    {
        //@ts-ignore
        if (this.isOverlapping) this.layer.setStyle(DangerLayerStyle);
        //@ts-ignore
        else if (this.isWayTooBig || this.isSmallerThanNeeded || this.isBiggerThanNeeded) this.layer.setStyle(WarningLayerStyle);
        //@ts-ignore
        else this.layer.setStyle(DefaultLayerStyle);
    }
    //A method that check if this entitys layer is overlapping any of the layers in the given layergroup
    public isOverlappingLayerGroup(layerGroup: L.GeoJSON): boolean {
        this.isOverlapping = this.isGeoJsonOverlappingLayergroup(this.toGeoJSON(), layerGroup);

        this.updateLayerStyle();
        return this.isOverlapping;
    }   

    public isBufferOverlappingLayerGroup(layerGroup: L.GeoJSON): boolean {
        //@ts-ignore
        //Get the first feature of the buffer layer, since toGeoJSON() always returns a feature collection
        this.isOverlapping = this.isGeoJsonOverlappingLayergroup(this.bufferLayer.toGeoJSON().features[0], layerGroup);
        this.updateLayerStyle();
        return this.isOverlapping;
    }   

    private isGeoJsonOverlappingLayergroup(geoJson: Turf.helpers.Feature<any, Turf.helpers.Properties> | Turf.helpers.Geometry, layerGroup: L.GeoJSON): boolean {
        let overlap = false;
        layerGroup.eachLayer((layer) => {
                //@ts-ignore
                let otherGeoJson = layer.toGeoJSON();
                
                //Loop through all features if it is a feature collection
                if (otherGeoJson.features ) 
                {
                    for (let i = 0; i < otherGeoJson.features.length; i++) {
                        console.log(otherGeoJson.features[i]);
                        if (Turf.booleanOverlap(geoJson, otherGeoJson.features[i])) {
                            overlap = true;
                            return; // Break out of the inner loop
                        }
                    }
                }
                else if (Turf.booleanOverlap(geoJson, otherGeoJson)) {
                    overlap = true;
                }
            
            if (overlap) {
                return; // Break out of the loop once an overlap is found
            }
        });

        return overlap;
    }

    /** Calculated area from the leaflet layer */
    public get area(): number {
        return Math.round(Turf.area(this.calculateGeoJson()));
    }

    /** The GeoJSON representation of this entity as a string */
    public get geoJson(): string {
        return JSON.stringify(this.toGeoJSON());
    }

    /** Extracts the GeoJson from the internal Leaflet layer to make sure its up-to-date */
    private calculateGeoJson() {
        //@ts-ignore
        let geoJson = this.layer.toGeoJSON();

        // Make sure that its a single features and not a collection, as Geoman
        // sometimes mess it up
        if (geoJson.features && geoJson.features[0]) {
            geoJson = geoJson.features[0];
        }

        return geoJson;
    }

    constructor(data: EntityDTO) {
        this.id = data.id;
        this.revision = data.revision;
        this.timestamp = data.timestamp;

        // Keep the original geoJson in memory for
        // checking if changes has been made
        this._originalGeoJson = data.geoJson;

        // Extract the geoJson data from the DTO
        const geoJson = JSON.parse(data.geoJson);

        // Create a leaflet layer
        this.layer = new L.GeoJSON(geoJson, {
            pmIgnore: false,
            interactive: true,
            bubblingMouseEvents: false,
            style: (/*feature*/) => DefaultLayerStyle,
        });

        this.updateLayerStyle();
        this.updateBufferedLayer();

        // Extract information fields from the geoJson
        this.name = geoJson.properties.name ?? 'No name yet';
        this.description = geoJson.properties.description ?? 'No description yet';
        this.nrOfPeople = geoJson.properties.nrOfPeople ?? '0';
        this.nrOfVehicles = geoJson.properties.nrOfVechiles ?? '0';
        this.additionalSqm = geoJson.properties.additionalSqm ?? '0';
        this.powerNeed = geoJson.properties.powerNeed ?? '0';
    }

    public updateBufferedLayer() {
        // Update the buffer layer so that its geometry is the same as this.layers geometry
        //@ts-ignore
        const geoJson = this.layer.toGeoJSON();
        const buffered = Turf.buffer(geoJson, 5, { units: 'meters' });

        if (!this.bufferLayer) {
            this.bufferLayer = L.geoJSON(buffered, {
            style: {
                color: 'black',
                fillOpacity: 0.0,
                weight: 0.5, // Set the outline width
                dashArray: '5, 5', // Set the outline to be dashed,
            },
            interactive: false
        });
        } else {
            //@ts-ignore
            this.bufferLayer.clearLayers();
            //@ts-ignore
            this.bufferLayer.addData(buffered);
        }
    }

    /** Converts a the current map entity data represented as GeoJSON */
    public toGeoJSON() {
        // Get the up-to-date geo json data from the layer
        const geoJson = this.calculateGeoJson();

        // Make sure that properties exist
        geoJson.properties = geoJson.properties || {};

        // Add all information fields as properties
        geoJson.properties.name = this.name;
        geoJson.properties.description = this.description;
        geoJson.properties.nrOfPeople = this.nrOfPeople;
        geoJson.properties.nrOfVechiles = this.nrOfVehicles;
        geoJson.properties.additionalSqm = this.additionalSqm;
        geoJson.properties.powerNeed = this.powerNeed;

        return geoJson;
    }

    /** Returns true if the geo-json of this map entity has been modified since last saved */
    public hasChanges(): boolean {
        return this._originalGeoJson != this.geoJson;
    }
}
