import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import * as Turf from '@turf/turf';
import { Rule } from './rule';
import DOMPurify from 'dompurify';

/** The representation of a Map Entity in the API */
export interface EntityDTO {
    id: number;
    revision: number;
    geoJson: string;
    timestamp: number;
}

export const DefaultColor = '#7ae9ff';
/** Returns the default style to use for map entities on the map */
export const DefaultLayerStyle: L.PathOptions = {
    color: DefaultColor,
    fillColor: DefaultColor,
    fillOpacity: 0.3,
    weight: 1,
};

export const WarningLayerStyle: L.PathOptions = {
    color: '#ffbb00',
    fillColor: '#ffbb00',
    fillOpacity: 0.75,
    weight: 3,
};

export const DangerLayerStyle: L.PathOptions = {
    color: '#ff0000',
    fillColor: '#ff0000',
    fillOpacity: 0.95,
    weight: 5,
};

/**
 * Represents the fields and data for single Map Entity and includes
 * methods both for persisting and updating it, and representing it on a map
 */
export class MapEntity implements EntityDTO {
    private _rules: Array<Rule>;
    private _originalGeoJson: string;
    private readonly _bufferWidth: number = 4;
    private readonly _sqmPerPerson: number = 12;
    private readonly _sqmPerVehicle: number = 75;

    public readonly id: number;
    public readonly revision: number;
    public readonly timestamp: number;
    public readonly layer: L.Layer & { pm?: any };
    public bufferLayer: L.Layer;

    // Information fields

    public name: string;
    public description: string;
    public contactInfo: string;
    public nrOfPeople: string;
    public nrOfVehicles: string;
    public additionalSqm: string;
    public powerNeed: number;
    public amplifiedSound: number;
    public color: string;

    /** Calculated area needed for this map entity from the given information */
    public get calculatedAreaNeeded(): number {
        try {
            let calculatedareaneed = 0;

            if (this.nrOfPeople) {
                calculatedareaneed += Number(this.nrOfPeople) * this._sqmPerPerson;
            }
            if (this.nrOfVehicles) {
                calculatedareaneed += Number(this.nrOfVehicles) * this._sqmPerVehicle;
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
        } catch {
            return NaN;
        }
    }

    public get severityOfRulesBroken(): number {
        // console.log("SEVERITY: " + this._rules.reduce<number>((severity, rule) => Math.max(severity, rule.severity), 0)); 
        return this._rules.reduce<number>((severity, rule) => Math.max(severity, rule.severity), 0);
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

    constructor(data: EntityDTO, rules: Array<Rule>) {
        this.id = data.id;
        this._rules = rules;
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
            snapIgnore: true,
            style: (/*feature*/) => this.GetDefaultLayerStyle(),
        });

        
        // Extract information fields from the geoJson
        this.name = DOMPurify.sanitize(geoJson.properties.name) ?? '';
        this.contactInfo = DOMPurify.sanitize(geoJson.properties.contactInfo) ?? '';
        this.description = DOMPurify.sanitize(geoJson.properties.description) ?? '';
        this.nrOfPeople = geoJson.properties.nrOfPeople ?? '0';
        this.nrOfVehicles = geoJson.properties.nrOfVechiles ?? '0';
        this.additionalSqm = geoJson.properties.additionalSqm ?? '0';
        this.powerNeed = geoJson.properties.powerNeed ?? -1;
        this.amplifiedSound = geoJson.properties.amplifiedSound ?? -1;
        this.color = geoJson.properties.color ?? DefaultColor;
        
        this.updateBufferedLayer();
        // this.checkAllRules();
    }
    private GetDefaultLayerStyle(): L.PathOptions {
        return { color: this.color, fillColor: this.color, fillOpacity: 0.3, weight: 1 };
    }

    public checkAllRules() {
        // Check which rules are currently broken
        for (const rule of this._rules) {
            rule.checkRule(this);
        }

        // Update layer style
        const severity = this.severityOfRulesBroken;
        if (severity >= 3) {
            //@ts-ignore
            this.layer.setStyle(DangerLayerStyle);
        } else if (severity == 2) {
            //@ts-ignore
            this.layer.setStyle(WarningLayerStyle);
        }
        //@ts-ignore
        else this.layer.setStyle(this.GetDefaultLayerStyle());
    }

    public getAllTriggeredRules(): Array<Rule> {
        return this._rules.filter((r) => r.triggered);
    }

    public updateBufferedLayer() {
        // Update the buffer layer so that its geometry is the same as this.layers geometry
        //@ts-ignore
        const geoJson = this.layer.toGeoJSON();
        const buffered = Turf.buffer(geoJson, this._bufferWidth, { units: 'meters' });

        if (!this.bufferLayer) {
            this.bufferLayer = L.geoJSON(buffered, {
                style: {
                    color: 'black',
                    fillOpacity: 0.0,
                    weight: 0.5, // Set the outline width
                    dashArray: '5, 5', // Set the outline to be dashed,
                },
                interactive: false,
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
        geoJson.properties.name = DOMPurify.sanitize(this.name);
        geoJson.properties.description = DOMPurify.sanitize(this.description);
        geoJson.properties.contactInfo = DOMPurify.sanitize(this.contactInfo);
        geoJson.properties.nrOfPeople = this.nrOfPeople;
        geoJson.properties.nrOfVechiles = this.nrOfVehicles;
        geoJson.properties.additionalSqm = this.additionalSqm;
        geoJson.properties.powerNeed = this.powerNeed;
        geoJson.properties.amplifiedSound = this.amplifiedSound;
        geoJson.properties.color = this.color;

        return geoJson;
    }

    /** Returns true if the geo-json of this map entity has been modified since last saved */
    public hasChanges(): boolean {
        return this._originalGeoJson != this.geoJson;
    }
}
