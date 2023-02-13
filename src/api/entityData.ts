interface EntityData {
    id: number;
    revId: number;
    geoJson: string;
    timestamp: number;
}

// TODO: remove
const mockGeoJSON = `{ "type": "Feature", "properties": { "fid": 33, "type": "art", "name": null, "Area_calculation": 500.0 }, "geometry": { "type": "Polygon", "coordinates": [ [ [ 14.93001511662586, 57.620662976831454 ], [ 14.930071479967429, 57.620587596847237 ], [ 14.930190718158428, 57.620530924807873 ], [ 14.930234933704776, 57.620507966760016 ], [ 14.930272486817252, 57.620469204587174 ], [ 14.930323414118613, 57.620436195386525 ], [ 14.930384902572039, 57.620480039553627 ], [ 14.930436983034703, 57.620543988160037 ], [ 14.930515793216774, 57.620629497483847 ], [ 14.930550697977345, 57.62068779880024 ], [ 14.930401896994482, 57.620692636583613 ], [ 14.93021586110528, 57.620681761023299 ], [ 14.93001511662586, 57.620662976831454 ] ] ] } }`;

// TODO: remove
const mockEntityDataResults: Array<EntityData> = [
    { id: 1, revId: 1, geoJson: mockGeoJSON, /** 1 feb */ timestamp: 1675255020 },
    { id: 2, revId: 2, geoJson: mockGeoJSON, /** 1 apr */ timestamp: 1680349020 },
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
        // TOOD: include _entityConstraints
        // TODO: use fetch
        this._latestRevisions = {};
        for (const entity of mockEntityDataResults) {
            this._latestRevisions[entity.id] = entity;
        }
    }

    constructor() {
        /* Update on page load */
        this.loaded = new Promise((resolve) => this._update().then(() => resolve(true)));
    }

    /** Set the entity constraints, will trigger a reload of the api */
    public async constrain(constraints: EntityDataAPISingleton['_entityConstraints']) {
        this._entityConstraints = constraints;
        await this._update();
    }

    /** Returns the current loaded entities as a record */
    public entities(): Record<number, EntityData> {
        return this._latestRevisions;
    }
    /** Returns the current loaded entities as geoJSON  */
    public geoJSON() {
        return {
            type: 'FeatureCollection',
            name: 'entitydata',
            crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
            features: Object.values(this._latestRevisions).map((e) => JSON.parse(e.geoJson)),
        };
    }

    /** Returns true if this is the latest known revision of the given entity */
    public isLatest(entityData: EntityData): boolean {
        return entityData.revId == this._latestRevisions[entityData.id].revId;
    }

    /** Creates a new revision of the current entity in the database  */
    public updateEntity(entityData: EntityData) {
        // Await fetch call
        // if success add to _latestRevisions
        throw new Error('Not implemented');
    }
}

export const EntityDataAPI = new EntityDataAPISingleton();
