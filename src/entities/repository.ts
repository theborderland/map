import { ENTITY_API_ADDRESS } from '../constants';
import { MapEntity, EntityDTO } from './entity';
import type { Rule } from './rule';

/**
 * Singleton class that manages entity data from the API
 *
 * Loads all the latest entities on load and when the constraints are changed.
 * The constraints allows limiting what entities are fetched to a given date range.
 */
export class MapEntityRepository {
    private _rulesGenerator: () => Array<Rule>;
    /** Keeps the latest revisions of each unique entity */
    private _latestRevisions: Record<MapEntity['id'], MapEntity> = {};

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
        const entityDTOs: Array<EntityDTO> = res.ok ? await res.json() : [];
        this._latestRevisions = {};
        for (const data of entityDTOs) {
            if (this._entityConstraints) {
                const { earliest, latest } = this._entityConstraints;
                if (data.timeStamp > latest || data.timeStamp < earliest) {
                    continue;
                }
            }
            this._latestRevisions[data.id] = new MapEntity(data, this._rulesGenerator());
        }
    }

    constructor(rulesGenerator: () => Array<Rule>) {
        this._rulesGenerator = rulesGenerator;
        // Update on page load
        this.loaded = new Promise((resolve) => this._update().then(() => resolve(true)));
    }

    /** Set the entity constraints, will trigger a reload of the api */
    public async constrain(constraints: MapEntityRepository['_entityConstraints']) {
        this._entityConstraints = constraints;
        await this._update();
    }

    /** Returns the current loaded entities as an array */
    public async entities(): Promise<Array<MapEntity>> {
        // Make sure that the data has been loaded
        await this.loaded;
        // Return the latest revisions as an array
        return Object.values(this._latestRevisions);
    }

    public getEntityById(id: string)
    {
        return this._latestRevisions[id];
    }

    //get all entities as a readonly list
    public getAllEntities(): ReadonlyArray<MapEntity> {
        return Object.values(this._latestRevisions);
    }

    /** Returns true if this is the latest known revision of the given entity */
    public isLatest(entityData: EntityDTO): boolean {
        return entityData.revision == this._latestRevisions[entityData.id].revision;
    }

    /** Creates a new map entity from the given geoJSON  */
    public async createEntity(geoJson: object): Promise<MapEntity | null> {
        console.log('createEntity', geoJson);
        geoJson['properties']['changeReason'] = "Created editor";
        const response = await fetch(ENTITY_API_ADDRESS, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ geoJson: JSON.stringify(geoJson) }),
        });
        if (response.ok) {
            const data: EntityDTO = await response.json();
            console.log('[API]', 'Saved initial entity', data);
            const entity = new MapEntity(data, this._rulesGenerator());
            this._latestRevisions[entity.id] = entity;
            return entity;
        } else {
            const err = await response.json();
            console.warn('[API]', 'Failed to save entity', err);
            return null;
        }
    }
    /** Creates a new revision of the current entity in the database  */
    public async updateEntity(entity: MapEntity) {
        const response = await fetch(`${ENTITY_API_ADDRESS}/${entity.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ geoJson: entity.geoJson, id: entity.id }),
        });
        if (response.ok) {
            const data: EntityDTO = await response.json();
            console.log('[API]', 'Updated existing entity', data);
            const entity = new MapEntity(data, this._rulesGenerator());
            this._latestRevisions[entity.id] = entity;
            return entity;
        } else {
            const err = await response.json();
            console.warn('[API]', 'Failed to update entity with id:', entity.id, err);
            return null;
        }
    }
    /** Deletes the entity in the database  */
    public async deleteEntity(entity: MapEntity) {
        const response = await fetch(`${ENTITY_API_ADDRESS}/${entity.id}`, {
            method: 'DELETE',
        });
        if (response.ok) {
            console.log('[API]', 'Deleted entity with id:', entity.id);
            delete this._latestRevisions[entity.id];
        } else {
            const err = await response.json();
            console.warn('[API]', 'Failed to delete entity with id:', entity.id, err);
        }
    }
}
