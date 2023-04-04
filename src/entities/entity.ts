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

// TODO: Is this the correct location for this ?
/** Returns the default style to use for map entities on the map */
export const DefaultLayerStyle: L.PathOptions = {
    color: 'cyan',
    fillColor: 'green',
    fillOpacity: 0.4,
};

/**
 * Represents the fields and data for single Map Entity and includes
 * methods both for persisting and updating it, and representing it on a map
 */
export class MapEntity implements EntityDTO {
    public readonly id: number;
    public readonly revision: number;
    public readonly timestamp: number;
    public readonly layer: L.Layer & { pm?: any };

    public get geoJson(): string {
        return JSON.stringify(this.toGeoJSON());
    }

    /** Converts a the current map entity data to GeoJSON */
    public toGeoJSON() {
        // Extract the GeoJson from the Leaflet layer to make sure its up-to-date
        //@ts-ignore
        let geoJson = this.layer.toGeoJSON();

        // Make sure that its a single features and not a collection, as Geoman
        // sometimes mess it up
        if (geoJson.features && geoJson.features[0]) {
            geoJson = geoJson.features[0];
        }

        // Make sure that properties exist
        geoJson.properties = geoJson.properties || {};

        // Calculate and add current area
        geoJson.properties.area = Math.round(Turf.area(geoJson));

        //HACK:
        // It is also just calculated when the layer is converted to geojson, so when just info is edited the values are not updated.
        let calculatedareaneed = 0;

        if (geoJson.properties.people) {
            calculatedareaneed += geoJson.properties.people * 5;
        }
        if (geoJson.properties.vehicles) {
            calculatedareaneed += geoJson.properties.vehicles * 20;
        }
        if (geoJson.properties.othersqm) {
            calculatedareaneed += geoJson.properties.othersqm;
        }

        //BUG: The calculated value is not correct!
        geoJson.properties.calculatedareaneed = calculatedareaneed;

        return geoJson;
    }

    constructor(data: EntityDTO) {
        this.id = data.id;
        this.revision = data.revision;
        this.timestamp = data.timestamp;

        // Create a leaflet layer from the geojson data in the DTO
        this.layer = new L.GeoJSON(JSON.parse(data.geoJson), {
            pmIgnore: false,
            interactive: true,
            bubblingMouseEvents: false,
            style: (/*feature*/) => DefaultLayerStyle,
        });

        // TODO: Get area, etc here also from the stringified geoJson
    }
}
