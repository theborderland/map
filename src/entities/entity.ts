import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import * as Turf from '@turf/turf';
import type { Rule } from '../rule';
import DOMPurify from 'dompurify';

/** The representation of a Map Entity in the API */
export interface EntityDTO {
    id: number;
    revision: number;
    geoJson: string;
    timeStamp: number;
    isDeleted: boolean;
    deleteReason: string;
}

export interface EntityDifferences {
    what: string;
    changeShort: string;
    changeLong: string;
}
export enum Colors {
    Green ='#00FF40',
    ElectricBlue = '#7AE9FF',
    Yellow = '#FFBB00',
    Red = '#FF0000',
    LightGrey = '#D1D1D1',
    Orange = '#FFA200',
}

export const DefaultColor = Colors.ElectricBlue
/** Returns the default style to use for map entities on the map */
export const DefaultLayerStyle: L.PathOptions = {
    color: DefaultColor,
    fillColor: DefaultColor,
    fillOpacity: 0.3,
    weight: 1,
};

export const WarningLayerStyle: L.PathOptions = {
    color: Colors.Yellow,
    fillColor: Colors.Yellow,
    fillOpacity: 0.75,
    weight: 3,
};

export const DangerLayerStyle: L.PathOptions = {
    color: Colors.Red,
    fillColor: Colors.Red,
    fillOpacity: 0.95,
    weight: 5,
};

export interface Appliance {
    name: string,
    amount: number,
    watt: number
}

/**
 * Represents the fields and data for single Map Entity and includes
 * methods both for persisting and updating it, and representing it on a map
 */
export class MapEntity implements EntityDTO {
    private _rules: Array<Rule>;
    private _originalGeoJson: string;
    private readonly _bufferWidth: number = 5;
    private readonly _sqmPerPerson: number = 10;
    private readonly _sqmPerVehicle: number = 70;

    public readonly id: number;
    public readonly revision: number;
    public readonly timeStamp: number;
    public readonly isDeleted: boolean;
    public readonly deleteReason: string;
    public readonly layer: L.Layer & { pm?: any };
    public bufferLayer: L.Layer;
    public revisions: Record<number, MapEntity>;
    public nameMarker: L.Marker;

    // Information fields.
    // Don't forget to update the restore getEntityDifferences function when you add/rename/delete fields here
    public name: string;
    public description: string;
    public contactInfo: string;
    public nrOfPeople: number;
    public nrOfVehicles: number;
    public additionalSqm: number;
    public amplifiedSound: number;
    public color: string;
    public supressWarnings: boolean = false;
    public powerContactInfo: string;
    public powerPlugType: string;
    public powerDescription: string;
    public powerImageUrl: string;
    public powerNeed: number;
    public powerAppliances: Array<Appliance>;

    /** Calculated area needed for this map entity from the given information */
    public get calculatedAreaNeeded(): number {
        try {
            let calculatedareaneed = 0;

            if (this.nrOfPeople) {
                calculatedareaneed += this.nrOfPeople * this._sqmPerPerson;
            }
            if (this.nrOfVehicles) {
                calculatedareaneed += this.nrOfVehicles * this._sqmPerVehicle;
            }
            if (this.additionalSqm) {
                calculatedareaneed += this.additionalSqm;
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
        this.timeStamp = data.timeStamp;
        this.isDeleted = data.isDeleted;
        this.deleteReason = data.deleteReason;

        // Keep the original geoJson in memory for checking if changes has been made
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

        this.revisions = {};

        // Extract information fields from the geoJson
        this.name = DOMPurify.sanitize(geoJson.properties.name);
        this.contactInfo = DOMPurify.sanitize(geoJson.properties.contactInfo) ?? '';
        this.description = DOMPurify.sanitize(geoJson.properties.description) ?? '';
        this.nrOfPeople = geoJson.properties.nrOfPeople ?? 0;
        this.nrOfVehicles = geoJson.properties.nrOfVechiles ?? 0;
        this.additionalSqm = geoJson.properties.additionalSqm ?? 0;
        if (Number.isNaN(Number(geoJson.properties.amplifiedSound))) {
            this.amplifiedSound = -1;
        } else {
            this.amplifiedSound = Number(geoJson.properties.amplifiedSound);
        }
        this.color = geoJson.properties.color ?? DefaultColor;
        this.supressWarnings = geoJson.properties.supressWarnings ?? false;
        
        this.powerContactInfo = DOMPurify.sanitize(geoJson.properties.techContactInfo) ?? '';
        this.powerPlugType = DOMPurify.sanitize(geoJson.properties.powerPlugType) ?? '';
        this.powerDescription = DOMPurify.sanitize(geoJson.properties.powerDescription) ?? '';
        this.powerImageUrl = DOMPurify.sanitize(geoJson.properties.powerImage) ?? '';
        if (Number.isNaN(Number(geoJson.properties.powerNeed))) {
            this.powerNeed = -1;
        } else {
            this.powerNeed = Number(geoJson.properties.powerNeed);
        }
        this.powerAppliances = geoJson.properties.powerAppliances ?? [];

        this.updateBufferedLayer();
    }
    private GetDefaultLayerStyle(cleancolors: boolean = false): L.PathOptions {
        let colorToSet = this.color;
        if (cleancolors) {
            colorToSet = Colors.Green;
        }
        return { color: colorToSet, fillColor: colorToSet, fillOpacity: 0.3, weight: 1 };
    }

    public checkAllRules() {
        // Check which rules are currently broken
        for (const rule of this._rules) {
            rule.checkRule(this);
        }
    }

    public setLayerStyle(mode: 'severity' | 'sound' | 'power' | 'cleancolors' = 'severity') {
        if (mode == 'severity' || mode == 'cleancolors') {
            if (this.severityOfRulesBroken >= 3) {
                //@ts-ignore
                this.layer.setStyle(DangerLayerStyle);
            } else if (this.severityOfRulesBroken == 2 && !this.supressWarnings) {
                //@ts-ignore
                this.layer.setStyle(WarningLayerStyle);
            } else {
                //@ts-ignore
                this.layer.setStyle(this.GetDefaultLayerStyle(mode == 'cleancolors'));
            }
        } else if (mode == 'power') {
            let color = Colors.Green;
            if (!this.powerNeed) color = Colors.LightGrey;
            else if (this.powerNeed > 9000) color = Colors.Red;
            else if (this.powerNeed > 1000) color = Colors.Orange;
            //@ts-ignore
            this.layer.setStyle({ color: color, fillColor: color, fillOpacity: 0.3, weight: 1 });
        } else if (mode == 'sound') {
            let color = Colors.Green;
            if (!this.amplifiedSound) color = Colors.LightGrey;
            else if (this.amplifiedSound > 2000) color = Colors.Red;
            else if (this.amplifiedSound > 120) color = Colors.Orange;
            //@ts-ignore
            this.layer.setStyle({ color: color, fillColor: color, fillOpacity: 0.3, weight: 1 });
        }
    }

    public getAllTriggeredRules(): Array<Rule> {
        return this._rules.filter((r) => r.triggered);
    }

    public updateBufferedLayer() {
        // Update the buffer layer so that its geometry is the same as this.layers geometry
        //@ts-ignore
        const geoJson = this.layer.toGeoJSON();
        const buffered = Turf.buffer(geoJson, this._bufferWidth, { units: 'meters' });
        //const weight = this.getAllTriggeredRules().findIndex((r) => r.severity == 3) > -1 ? 0.75 : 0;
        const weight = 0;
        if (!this.bufferLayer) {
            this.bufferLayer = L.geoJSON(buffered, {
                style: {
                    color: 'red',
                    fillOpacity: 0.0,
                    weight, // Set the outline width
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
        geoJson.properties.name = DOMPurify.sanitize(this.name).substring(0, 100);
        geoJson.properties.description = DOMPurify.sanitize(this.description).substring(0, 1000);
        geoJson.properties.contactInfo = DOMPurify.sanitize(this.contactInfo);
        geoJson.properties.nrOfPeople = this.nrOfPeople;
        geoJson.properties.nrOfVechiles = this.nrOfVehicles;
        geoJson.properties.additionalSqm = this.additionalSqm;
        geoJson.properties.amplifiedSound = this.amplifiedSound;
        geoJson.properties.color = this.color;
        geoJson.properties.supressWarnings = this.supressWarnings;
        
        geoJson.properties.techContactInfo = DOMPurify.sanitize(this.powerContactInfo);
        geoJson.properties.powerPlugType = DOMPurify.sanitize(this.powerPlugType);
        geoJson.properties.powerDescription = DOMPurify.sanitize(this.powerDescription);
        geoJson.properties.powerImage = DOMPurify.sanitize(this.powerImageUrl);
        geoJson.properties.powerNeed = this.powerNeed;
        geoJson.properties.powerAppliances = this.powerAppliances;

        return geoJson;
    }

    /** Returns true if the geo-json of this map entity has been modified since last saved */
    public hasChanges(): boolean {
        return this._originalGeoJson != this.geoJson;
    }
}
