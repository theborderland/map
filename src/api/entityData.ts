import { ENTITY_API_ADDRESS } from '../constants';

export interface EntityData {
    id: number;
    revision: number;
    geoJson: string;
    timestamp: number;
}

// TODO: remove
const mockGeoJSON = `{ "type": "Feature", "properties": { "fid": 33, "type": "art", "name": null, "Area_calculation": 500.0 }, "geometry": { "type": "Polygon", "coordinates": [ [ [ 14.93001511662586, 57.620662976831454 ], [ 14.930071479967429, 57.620587596847237 ], [ 14.930190718158428, 57.620530924807873 ], [ 14.930234933704776, 57.620507966760016 ], [ 14.930272486817252, 57.620469204587174 ], [ 14.930323414118613, 57.620436195386525 ], [ 14.930384902572039, 57.620480039553627 ], [ 14.930436983034703, 57.620543988160037 ], [ 14.930515793216774, 57.620629497483847 ], [ 14.930550697977345, 57.62068779880024 ], [ 14.930401896994482, 57.620692636583613 ], [ 14.93021586110528, 57.620681761023299 ], [ 14.93001511662586, 57.620662976831454 ] ] ] } }`;

// TODO: remove
const mockEntityDataResults: Array<EntityData> = [
    { id: 1, revision: 1, geoJson: mockGeoJSON, /** 1 feb */ timestamp: 1675255020 },
    { id: 2, revision: 2, geoJson: mockGeoJSON, /** 1 apr */ timestamp: 1680349020 },
];

/**
 * Singleton class that manages entity data from the API
 *
 * Loads all the latest entities on load and when the constraints are changed.
 * The constraints allows limiting what entities are fetched to a given date range.
 */
class EntityDataAPISingleton {
    /** Keeps the latest revisions of each unique entity */
    private _latestRevisions: Record<EntityData['id'], EntityData> = {};

    /** Possible constraints for the data returned from the API, allows for limiting results between certain dates if set */
    private _entityConstraints: null | {
        earliest: number;
        latest: number;
    } = null;

    /** Indicates that the API has loaded data successfully */
    public loaded: Promise<boolean>;

    /** Loads the latest entity data revisions from the server given the set constraints, if any */
    private async _update(): Promise<void> {
        const res = await fetch(ENTITY_API_ADDRESS);
        const entities = res.ok ? [...mockEntityDataResults, ...(await res.json())] : mockEntityDataResults;
        console.log('[API]', 'Fetched entities from server', entities);
        this._latestRevisions = {};
        for (const entity of entities) {
            if (this._entityConstraints) {
                const { earliest, latest } = this._entityConstraints;
                if (entity.timestamp > latest || entity.timestamp < earliest) {
                    continue;
                }
            }
            this._latestRevisions[entity.id] = entity;
        }
    }

    constructor() {
        // Update on page load
        this.loaded = new Promise((resolve) => this._update().then(() => resolve(true)));
    }

    /** Set the entity constraints, will trigger a reload of the api */
    public async constrain(constraints: EntityDataAPISingleton['_entityConstraints']) {
        this._entityConstraints = constraints;
        await this._update();
    }

    /** Returns the current loaded entities as an array */
    public async entities(): Promise<Array<EntityData>> {
        // Make sure that the data has been loaded
        await this.loaded;
        // Return the latest revisions as an array
        return Object.values(this._latestRevisions);
    }

    /** Returns the current loaded entities as a geoJSON feature collection  */
    public geoJSONCollection() {
        return {
            type: 'FeatureCollection',
            name: 'entitydata',
            crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
            features: Object.values(this._latestRevisions).map((e) => JSON.parse(e.geoJson)),
        };
    }

    /** Returns true if this is the latest known revision of the given entity */
    public isLatest(entityData: EntityData): boolean {
        return entityData.revision == this._latestRevisions[entityData.id].revision;
    }

    /** Creates a new map entity from the given geoJSON  */
    public async createEntity(geoJson: object): Promise<EntityData | null> {
        const response = await fetch(ENTITY_API_ADDRESS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ geoJson: JSON.stringify(geoJson) }),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('[API]', 'Saved initial entity', data);
            return data;
        } else {
            const err = await response.json();
            console.warn('[API]', 'Failed to save entity', err);
            return null;
        }
    }
    /** Creates a new revision of the current entity in the database  */
    public async updateEntity(entityId: EntityData['id'], geoJson: object) {
        const response = await fetch(`${ENTITY_API_ADDRESS}/${entityId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ geoJson: JSON.stringify(geoJson), id: entityId }),
        });
        if (response.ok) {
            const data = await response.json();
            console.log('[API]', 'Updated existing entity', data);
            return data;
        } else {
            const err = await response.json();
            console.warn('[API]', 'Failed to update entity with id:', entityId, err);
            return null;
        }
    }
}

export const EntityDataAPI = new EntityDataAPISingleton();
