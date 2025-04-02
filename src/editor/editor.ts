import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { MapEntity, MapEntityRepository, DefaultLayerStyle } from '../entities';
import { IS_EDITING_POSSIBLE, NOTE_ABOUT_EDITING } from '../../SETTINGS';
import { generateRulesForEditor } from '../rule';
import * as Messages from '../messages';
import { EntityChanges } from '../entities/repository';
import * as Buttons from './buttonsFactory';
import * as Turf from '@turf/turf';
import 'leaflet.path.drag';
import 'leaflet-search';
import { EntityDifferences } from '../entities/entity';
import { PopupContentFactory } from './popupContentFactory';

/**
 * The Editor class keeps track of the user status regarding editing and
 * renders the map entities in the repository as editable layers on the map
 */
export class Editor {
    /** The Map Entities repository being used */
    private _repository: MapEntityRepository;
    /** The Leaflet Map being used */
    private _map: L.Map;
    /** A Leaflet popup used to display information and choices for individual editable layers */
    private _popup: L.Popup;
    private _popupContentFactory: PopupContentFactory;
    /** If the editor should be active or not */
    private _isEditMode: boolean = false;

    /** The current status of the editor */
    private _mode: 'none' | 'selected' | 'editing-shape' | 'editing-info' | 'moving-shape' = 'none';

    private _currentLayerFilterStyle: 'severity' | 'sound' | 'power' = 'severity';

    /** The currently selected map entity, if any */
    private _selected: MapEntity | null = null;
    private _currentRevisions: Record<MapEntity['id'], MapEntity>;

    private _validateEntitiesQueue: Array<MapEntity>;

    private _groups: L.FeatureGroup<any>;
    private _placementLayers: L.LayerGroup<any>;
    private _placementBufferLayers: L.LayerGroup<any>;
    private _ghostLayers: L.LayerGroup<any>;

    private _lastEnityFetch: number;
    private _autoRefreshIntervall: number;

    private sqmTooltip: L.Tooltip; //The tooltip that shows the areasize of the current layer
    private _nameTooltips: Record<number, L.Marker>;

    /** Updates current editor status - blur indicates that the current mode should be redacted */
    private async setMode(nextMode: Editor['_mode'] | 'blur', nextEntity?: MapEntity) {
        const prevMode = this._mode;
        const prevEntity = this._selected;
        const isSameMode = nextMode == prevMode;
        const isSameEntity = nextEntity == prevEntity;

        // Skip mode change
        if (isSameMode && isSameEntity) {
            return;
        }

        // Always remove ghosted entitys when changing mode
        this._ghostLayers.clearLayers();

        // When blur is sent as parameter, the next mode is dynamicly determined
        if (nextMode == 'blur') {
            if (
                (
                    prevMode == 'editing-shape' 
                    || prevMode == 'moving-shape' 
                    || prevMode == 'editing-info'
                ) 
                && prevEntity
            ) {
                nextMode = 'selected';
                nextEntity = nextEntity || prevEntity;
                //re-center the pop up on the new layer, in case the layer has moved
                // far away during edit, as clicking the map wont set the popups position to the new layer
                //@ts-ignore
                const bounds = nextEntity.layer.getBounds();
                const latlng = bounds.getCenter();
                this._popup.setLatLng(latlng);
            }
            // Fall back to the "none" mode
            else {
                nextMode = 'none';
                nextEntity = undefined;
            }
        }

        // Set the correct mode
        console.log('[Editor]', 'mode changed!', { mode: this._mode, nextMode, nextEntity });
        this._mode = nextMode as Editor['_mode'];

        // Handle effects of setting the correct mode

        // Deselect and stop editing
        if (this._mode == 'none') {
            this.setSelected(null, prevEntity);
            this.setPopup('none');
            return;
        }

        // Select an entity for editing
        if (this._mode == 'selected' && nextEntity) {
            this.setSelected(nextEntity, prevEntity);
            this.setPopup('info', nextEntity);

            // Stop any ongoing editing of the previously selected layer
            if (prevEntity) {
                prevEntity?.layer.pm.disable();
                prevEntity?.layer._layers[prevEntity.layer._leaflet_id - 1].dragging.disable();
            }

            return;
        }
        // Edit the shape of the entity
        if (this._mode == 'editing-shape' && nextEntity) {
            nextEntity.layer.pm.enable({ editMode: true, snappable: false });
            this.setSelected(nextEntity, prevEntity);
            this.setPopup('none');
            return;
        }
        // Move the shape of the entity
        if (this._mode == 'moving-shape' && nextEntity) {
            this.setSelected(nextEntity, prevEntity);
            this.setPopup('none');
            this.UpdateOnScreenDisplay(nextEntity, 'Drag to move');
            nextEntity.layer._layers[nextEntity.layer._leaflet_id - 1].dragging.enable();
            return;
        }
        // Edit the information of the entity
        if (this._mode == 'editing-info' && nextEntity) {
            this.setSelected(nextEntity, prevEntity);
            this.setPopup('edit-info', nextEntity);
            return;
        }
    }

    /** Updates the currently selected map entity  */
    private async setSelected(nextEntity: MapEntity | null, prevEntity: MapEntity | null) {
        // When a map entity is unselected, save it to the database if it has changes
        if (prevEntity && nextEntity != prevEntity && prevEntity.hasChanges()) {
            await this.onLayerDoneEditing(prevEntity);
        }

        if (this._isEditMode) {
            this.UpdateOnScreenDisplay(nextEntity);
        }

        // Select the next entity
        this._selected = nextEntity;
        this.refreshEntity(this._selected);
    }

    private keyEscapeListener(evt: Event) {
        // console.log('keyEscapeListener', evt);
        if ('key' in evt && !(evt.key === 'Escape' || evt.key === 'Esc')) {
            // console.log('not escape...');
            return;
        }
        this.setMode('blur');
    }

    /** Updates whats display in the pop up window, if anything - usually called from setMode */
    private async setPopup(display: 'info' | 'edit-info' | 'more' | 'history' | 'none', entity?: MapEntity | null) {
        // Don't show any pop-up if set to none or if there is no entity
        if (display == 'none' || !entity) {
            this._popup.close();
            return;
        }

        // Show information popup for the entity
        if (display == 'info') {
            const content = this._popupContentFactory.CreateInfoPopup(entity, this._isEditMode, this.setMode.bind(this));
            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show fields to edit the entity information
        if (display == 'edit-info') {
            const content = this._popupContentFactory.CreateEditPopup(
                entity,
                this._isEditMode,
                this.setMode.bind(this),
                this.setPopup.bind(this),
                this.refreshEntity.bind(this),
                this.UpdateOnScreenDisplay.bind(this),
            );

            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show fields to edit the entity information
        if (display == 'more') {
            const content = this._popupContentFactory.CreateMoreInfoPopup(
                entity, 
                this.setMode.bind(this),
                this.setPopup.bind(this),
                this.refreshEntity.bind(this),
                this.deleteAndRemoveEntity.bind(this)
            );
                
            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show edit-history for the entity
        if (display == 'history') {
            const content = await this._popupContentFactory.CreateHistoryPopup(
                entity,
                this._repository,
                this._ghostLayers,
                this.setMode.bind(this),
                this.getEntityDifferences.bind(this),
                this.removeEntityNameTooltip.bind(this),
                this.removeEntityFromLayers.bind(this),
                this.addEntityToMap.bind(this),
            );

            this._popup.setContent(content).openOn(this._map);
            return;
        }
    }

    /** Event handler for when an editable map entity is clicked */
    private async onLayerClicked(entity: MapEntity) {
        console.log('[Editor]', 'Click event fired', { entity });

        this.setMode('selected', entity);
    }

    /** Event handler for when an editable map entity has been edited */
    private async onLayerDoneEditing(entity: MapEntity) {
        console.log('[Editor]', 'onLayerDoneEditing!', { selected: this._selected });
        // Stop editing
        entity.layer.pm.disable();

        this.UpdateOnScreenDisplay(null);

        // Check if there is any later revision since editor opened
        await this._repository.getRevisionsForEntity(entity);
        let latestKey;
        for (let revisionentitykey in entity.revisions) {
            latestKey = revisionentitykey;
        }
        let latestEntity = entity.revisions[latestKey];
        if (entity.revision != latestEntity.revision) {
            let diff = this.getEntityDifferences(latestEntity, entity);
            let diffDescription: string = `<b>Someone else edited this shape at the same time as you</b><br/>You have now overwritten their changes, these differences were detected:<ul>`;
            for (let changeid in diff) {
                diffDescription += `<li>${diff[changeid]['changeLong']}</li>`;
            }
            diffDescription += '</ul>';
            // NOTE : Removed after public availability in may 2024, I think it was only for making changes known to both users, but causes recursive problems
            // entity.description = `${diffDescription}\n\nOriginal description:\n${entity.description}`;
            Messages.showNotification(diffDescription, 'danger', undefined, 3600000);
        }

        if (this.isAreaTooBig(entity.toGeoJSON())) {
            return;
        }
        // Update the entity with the response from the API
        const entityInResponse = await this._repository.updateEntity(entity);

        // Redraw shape efter a successful update
        if (entityInResponse) {
            // Remove old shape, but don't remove from repository, it's already replaced in updateEntity
            this.removeEntity(entity, false);
            this.addEntityToMap(entityInResponse);
            Messages.showNotification('Saved!', 'success');
        }
    }

    /** Event handler for when an new layer is created */
    private async onNewLayerCreated(createEvent: { layer: L.Layer }) {
        console.log('[Editor]', 'Create event fired', { createEvent });

        // Get the newly created layer as GeoJson
        const { layer } = createEvent;
        //@ts-ignore
        const geoJson = layer.toGeoJSON();

        if (this.isAreaTooBig(geoJson)) {
            this._map.removeLayer(layer);
            return;
        }

        // Save it to the entity API
        const entityInResponse = await this._repository.createEntity(geoJson);

        // Remove the drawn layer and replace it with one bound to the entity
        if (entityInResponse) {
            this.addEntityToMap(entityInResponse);
            this._map.removeLayer(layer);

            //@ts-ignore
            const bounds = entityInResponse.layer.getBounds();
            const latlng = bounds.getCenter();
            this._popup.setLatLng(latlng);
            this.setMode('editing-info', entityInResponse);
            Messages.showNotification('Saved!', 'success');
        }
    }

    private createEntityTooltip(entity: MapEntity) {
        let marker = new L.Marker(entity.layer.getBounds().getCenter(), { opacity: 0 });
        marker.feature = {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [0, 0],
            },
            properties: {},
        };
        marker.options.icon.options.iconSize = [1, 1];
        marker.bindTooltip(entity.name, {
            permanent: true,
            interactive: false,
            direction: 'center',
            className: 'name-tooltip',
        });
        entity.nameMarker = marker;
        return marker;
    }

    /** Adds the given map entity as an a editable layer to the map */
    private addEntityToMap(entity: MapEntity, checkRules: boolean = true) {
        this._currentRevisions[entity.id] = entity;
        // Bind the click-event of the editor to the layer
        entity.layer.on('click', ({ latlng }) => {
            console.log(latlng);
            // Update the popup-position
            this._popup.setLatLng(latlng);
            // Call the click event
            this.onLayerClicked(entity);
        });

        // Add name tooltips
        this._nameTooltips[entity.id] = this.createEntityTooltip(entity);
        this._nameTooltips[entity.id].addTo(this._groups['names']);

        // Update the buffered layer when the layer is being edited
        entity.layer.on('pm:markerdrag', () => {
            entity.updateBufferedLayer();
            this.refreshEntity(entity);
            this.UpdateOnScreenDisplay(entity);
        });

        entity.layer.on('pm:markerdragend', () => {
            this.isAreaTooBig(entity.toGeoJSON());
        });

        entity.layer._layers[entity.layer._leaflet_id - 1].on('drag', () => {
            // console.log("dragging");
            entity.updateBufferedLayer();
            this.refreshEntity(entity);
            this.UpdateOnScreenDisplay(null);
        });

        // Update the buffered layer when the layer has a vertex removed
        entity.layer.on('pm:vertexremoved', () => {
            entity.updateBufferedLayer();
            this.refreshEntity(entity); //important that the buffer get updated before the rules are checked
            this.UpdateOnScreenDisplay(entity);
        });

        //Instead of adding directly to the map, add the layer and its buffer to the layergroups
        //@ts-ignore
        this._placementLayers.addLayer(entity.layer);
        //@ts-ignore
        this._placementBufferLayers.addLayer(entity.bufferLayer);

        //Set initial opacity of the bufferlayer depending on the zoomlevel (REFACTOR this and how its done in the onZoomEnd event)
        if (this._map.getZoom() < 19) {
            //@ts-ignore
            entity.bufferLayer.setStyle({ opacity: 0 });
        }

        if (checkRules) this.refreshEntity(entity);
    }

    private refreshEntity(entity: MapEntity, checkRules: boolean = true) {
        if (entity == null) {
            return;
        }

        // Update the entities name marker
        let posMarker = entity.nameMarker.getLatLng();
        let posEntity = entity.layer.getBounds().getCenter();

        if (posEntity.lat != posMarker.lat || posEntity.lng != posMarker.lng) {
            // console.log('entity pos changed');
            entity.nameMarker.setLatLng(posEntity);
        }
        if (entity.nameMarker._tooltip._content != entity.name) {
            // console.log('tooltip content changed', entity.nameMarker._tooltip);
            entity.nameMarker.setTooltipContent(entity.name);
        }

        // Only show the name if zoomed beyond 19
        var zoom = this._map.getZoom();
        if (zoom >= 19) {
            //@ts-ignore
            this._nameTooltips[entity.id]._tooltip.setOpacity(1);
        } else {
            //@ts-ignore
            this._nameTooltips[entity.id]._tooltip.setOpacity(0);
        }

        if (checkRules) {
            entity.checkAllRules();
        }
        entity.setLayerStyle(this._currentLayerFilterStyle);
    }

    private refreshAllEntities(checkRules: boolean = true) {
        for (const entityid in this._currentRevisions) {
            this.refreshEntity(this._currentRevisions[entityid], checkRules);
        }
    }

    private refreshEntitiesSlow(entitysToRefresh: Array<MapEntity> | null = null) {
        Messages.showNotification('Validating...');
        if (entitysToRefresh) {
            this._validateEntitiesQueue = entitysToRefresh;
        } else {
            for (const entityid in this._currentRevisions) {
                this._validateEntitiesQueue.push(this._currentRevisions[entityid]);
            }
        }
        this.validateSlowly();
    }
    
    // Slowly validate entities in chunks so that the user does not percive the application as frozen during validation
    private validateSlowly() {
        const chunkSize = 50;
        var arrayOfPromises: Array<Promise<any>> = [];
        
        for (let i = 0; i < this._validateEntitiesQueue.length; i += chunkSize) {
            const chunk = this._validateEntitiesQueue.slice(i, i + chunkSize);
            arrayOfPromises.push(new Promise(function(resolve, reject) {
                setTimeout(() => {
                    for (let i = 0; i < chunk.length; i++) {
                        this.refreshEntity(chunk[i], true);
                    }
                    resolve(chunk.length);
                }, 50);
            }.bind(this)));
        }
        
        Promise.all(arrayOfPromises).then((res) => {
            Messages.showNotification('Validation done', 'success');
        }, (err) => {
            console.log(err);
          }); 
    }

    public setLayerFilter(filter: 'severity' | 'sound' | 'power', checkRules: boolean = true) {
        this._currentLayerFilterStyle = filter;
        this.refreshAllEntities(checkRules);
    }

    // Block crazy large areas
    private isAreaTooBig(geoJson: any) {
        const area = Turf.area(geoJson);

        if (area > 5000) {
            Messages.showNotification(
                'The area of the polygon is waaay to big. It will not be saved, please change it.',
                'danger',
                undefined,
                3600000,
            );
            return true;
        }
        return false;
    }

    private deleteAndRemoveEntity(entity: MapEntity, deleteReason: string = null) {
        this._selected = null;
        this.setMode('none');
        this.removeEntity(entity);
        this._repository.deleteEntity(entity, deleteReason);
    }

    private removeEntityNameTooltip(entity: MapEntity) {
        // Remove entity name-tooltip
        entity.nameMarker.unbindTooltip();
        this._groups['names'].removeLayer(entity.nameMarker);
        entity.nameMarker = null;
        delete this._nameTooltips[entity.id];
    }

    private removeEntityFromLayers(entity: MapEntity) {
        // Remove entity from layers
        this._placementLayers.removeLayer(entity.layer);
        this._placementBufferLayers.removeLayer(entity.bufferLayer);
        this._map.removeLayer(entity.layer);
        this._map.removeLayer(entity.bufferLayer);
    }

    private removeEntity(entity: MapEntity, removeInRepository: boolean = true) {
        this.removeEntityNameTooltip(entity);
        this.removeEntityFromLayers(entity);

        // Remove from current
        delete this._currentRevisions[entity.id];

        // If an entity was updated via checkForUpdatedEntities we want to keep in in the repository
        if (removeInRepository) {
            this._repository.remove(entity);
        }
    }

    constructor(map: L.Map, groups: L.FeatureGroup) {
        // Keep track of the map
        this._map = map;
        this._popupContentFactory = new PopupContentFactory();
        this._groups = groups;

        //Create two separate layersgroups, so that we can use them to check overlaps separately
        this._placementLayers = new L.LayerGroup().addTo(map);
        this._placementBufferLayers = new L.LayerGroup().addTo(map);
        this._ghostLayers = new L.LayerGroup().addTo(map);

        //Place both in the same group so that we can toggle them on and off together on the map
        //@ts-ignore
        this._placementLayers.addTo(groups.placement);
        //@ts-ignore
        this._placementBufferLayers.addTo(groups.placement);

        this._validateEntitiesQueue = new Array<MapEntity>();

        this._lastEnityFetch = 0;
        this._autoRefreshIntervall = 90; // Seconds

        this._currentRevisions = {};

        //Hide buffers when zoomed out
        var bufferLayers = this._placementBufferLayers;
        map.on('zoomend', function () {
            var zoom = map.getZoom();
        
            bufferLayers.getLayers().forEach(function (layer) {
                if (zoom >= 19) {
                    //@ts-ignore
                    layer.setStyle({ opacity: 1 });
                } else {
                    //@ts-ignore
                    layer.setStyle({ opacity: 0 });
                }
            });

            // Hide name tooltips when zoomed out
            this.groups['names'].getLayers().forEach(function (layer: any) {
                if (zoom >= 19) {
                    layer._tooltip.setOpacity(1);
                } else {
                    layer._tooltip.setOpacity(0);
                }
            });
        });
        
        // Generate rules that the entities must follow
        const rules = generateRulesForEditor(this._groups, this._placementLayers);

        // Keep track of the entities repository
        this._repository = new MapEntityRepository(rules);

        // Create a common popup for editable layers
        this._popup = L.popup({
            autoClose: false,
            closeButton: false,
            closeOnClick: false,
            closeOnEscapeKey: false,
        });

        // Disable edit mode on all layers by default
        L.PM.setOptIn(true);

        // Add controls for creating and editing shapes to the map
        this._map.pm.addControls({
            position: 'bottomleft',
            drawPolygon: false,
            drawCircle: false,
            drawMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawCircleMarker: false,
            drawText: false,
            removalMode: false,
            editControls: false,
            snappable: false,
        });

        // Set path style options for newly created layers
        this._map.pm.setPathOptions(DefaultLayerStyle);
        this._map.pm.setGlobalOptions({
            tooltips: false,
            allowSelfIntersection: false,
            snappable: true,
            draggable: true,
        });

        // Add the event handler for newly created layers
        this._map.on('pm:create', this.onNewLayerCreated.bind(this));

        // Add a click event to the map to reset the editor status.
        this._map.on('click', (mouseEvent) => {
            console.log('[Editor]', 'Editor blur event fired (map click)', { mouseEvent });
            this.setMode('blur');
        });

        this.sqmTooltip = new L.Tooltip({
            permanent: true,
            interactive: false,
            direction: 'center',
            className: 'shape-tooltip',
        });
        this.sqmTooltip.setLatLng([0, 0]);
        this.sqmTooltip.addTo(this._map);
        this.sqmTooltip.closeTooltip();
        this._nameTooltips = {};

        document.onkeydown = (evt: Event) => {
            this.keyEscapeListener(evt);
        };

        // Add search control
        //@ts-ignore
        var searchControl = new L.Control.Search({
            layer: this._placementLayers,
            propertyName: 'name',
            marker: false,
            zoom: 19,
            initial: false,
        });
        map.addControl(searchControl);
    }
    private addToggleEditButton() {
        if (IS_EDITING_POSSIBLE) {
            this._map.addControl(Buttons.edit(this._isEditMode, () => { 
                this.toggleEditMode();
            }));
        }
        if (NOTE_ABOUT_EDITING) {
            this._map.addControl(Messages.editing(NOTE_ABOUT_EDITING));
        }
    }

    private getEntityDifferences(current: MapEntity, previous: MapEntity): Array<EntityDifferences> {
        let differences: Array<EntityDifferences> = [];
        // If previous entity is null it must be the first revision
        if (previous == null) {
            differences.push({ what: 'Created', changeShort: 'Created', changeLong: `Someone created this entity.` });
            return differences;
        }

        // Go through all relevant properties and look for differences, list them verbosly under differences
        let basicPropertiesToCheck = [
            'name', 
            'description', 
            'contactInfo', 
            'nrOfPeople', 
            'nrOfVehicles', 
            'additionalSqm', 
            'powerNeed', 
            'amplifiedSound', 
            'color', 
            'supressWarnings'
        ];

        basicPropertiesToCheck.forEach(prop => {
            if (current[prop] != previous[prop]) {
                differences.push({
                    what: prop,
                    changeShort: `${prop} Changed`,
                    changeLong: `Someone changed ${prop} from ${previous[prop]} to ${current[prop]}.`,
                });
            }
        });

        // Handle specific properties
        if (current.isDeleted != previous.isDeleted) {
            differences.push({
                what: 'Deleted',
                changeShort: 'Is Deleted',
                changeLong: `Is Deleted due to ${current.deleteReason}.`,
            });
        }

        let currentGeoJson = JSON.stringify(current.toGeoJSON()['geometry']);
        let previousGeoJson = JSON.stringify(previous.toGeoJSON()['geometry']);
        if (currentGeoJson != previousGeoJson) {
            differences.push({
                what: 'GeoJson',
                changeShort: 'Polygon Changed',
                changeLong: `Someone changed the polygon.`,
            });
        }
        if (differences.length == 0) {
            differences.push({
                what: 'NoDifference',
                changeShort: 'No difference',
                changeLong: `No difference detected between revisions.`,
            });
        }
        return differences;
    }

    public async toggleEditMode() {
        // This function is called from addToggleEditButton() which already checks if editing is possible.
        // So could we remove this if statement below?
        if (!IS_EDITING_POSSIBLE) {
            this._isEditMode = false;
            return;
        }

        this._isEditMode = !this._isEditMode;

        // Show instructions when entering edit mode, and wait for the user
        // to press a button on that screen before continuing
        if (this._isEditMode) {
            if (localStorage.getItem('hasSeenEditorInstructions') == null) {
                Messages.showDrawers([
                    { file: 'entering_edit_mode', position: 'bottom' },
                    {
                        file: 'entering_edit_mode_page_two',
                        position: 'bottom',
                        onClose: () => {
                            localStorage.setItem('hasSeenEditorInstructions', 'true');
                        },
                    },
                ]);
            }
        }

        //Make sure to update the contents of the popup when changing edit mode
        //so that the correct buttons are shown
        this.setPopup('info', this._selected);

        if (this._isEditMode == false && this._mode != 'selected') {
            this.setMode('none');
        }

        this._map.pm.addControls({
            drawPolygon: this._isEditMode,
        });

        //Use changeActionsOfControl to only show the cancel button on the draw polygon toolbar
        this._map.pm.Toolbar.changeActionsOfControl('Polygon', ['cancel']);
    }

    /** Add each existing map entity from the API as an editable layer */
    public async addAPIEntities() {
        await Messages.showNotification('Loading your drawn polygons from da interweb!');
        const entities = await this._repository.entities();
        this._lastEnityFetch = new Date().getTime() / 1000;
        
        for (const entity of entities) {
            this.addEntityToMap(entity, false);
        }
        // Refresh enity with no rulecheck
        this.refreshAllEntities(false);

        // Delayed start of validation
        setTimeout(() => {
            this.refreshEntitiesSlow();
        }, 100);

        // Automatic refresh of entities after a minute //Disabled after the event
        // setTimeout(() => {
        //     this.checkForUpdatedEntities();
        // }, this._autoRefreshIntervall * 1000);

        // Edit button disabled after the event took place
        this.addToggleEditButton();
        
        // This was used as a fast way to export everything as a geojson collection
        // this.consoleLogAllEntitiesAsOneGeoJSONFeatureCollection();
    }

    // Atutomatically check for updates every minute or so
    private async checkForUpdatedEntities() {
        // Check for changed enities if not in edit mode
        if (this._isEditMode == false) {
            var now = new Date().getTime() / 1000;
            // If last check was performed too long ago, fetch again
            if (now - this._lastEnityFetch > this._autoRefreshIntervall) {
                this._lastEnityFetch = now;
                const changes: EntityChanges = await this._repository.reload();
                // console.log('checkForUpdatedEntities look for changed enities', changes);
                let changesToQueue: Array<MapEntity> = new Array<MapEntity>();
                let changesInformative: Array<string> = new Array<string>();
                for (const id of changes.refreshedAdded) {
                    let entity = this._repository.getEntityById(id);
                    changesInformative.push(`Add new entity ${entity.id} ${entity.name}`);
                    this.addEntityToMap(entity, false);
                    changesToQueue.push(entity);
                }
                for (const id of changes.refreshedDeleted) {
                    let entity = this._currentRevisions[id];
                    changesInformative.push(`Removed entity ${entity.id} ${entity.name}`);
                    this.removeEntity(entity);
                }
                for (const id of changes.refreshedUpdated) {
                    let entity = this._repository.getEntityById(id);
                    changesInformative.push(`Updated entity ${entity.id} ${entity.name}`);
                    this.removeEntity(this._currentRevisions[id], false);
                    this.addEntityToMap(entity, false);
                    changesToQueue.push(entity);
                }
                if (changesInformative.length > 0) {
                    console.log('Fetched latest changes from map', new Date().toISOString(), changesInformative);
                    this.refreshAllEntities(false);
                }
                if (changesToQueue.length > 0) {
                    this.refreshEntitiesSlow(changesToQueue);
                }
            }
        }
        // Set next automatic check
        setTimeout(() => {
            this.checkForUpdatedEntities();
        }, 10000);
    }

    public gotoEntity(id: number) {
        const entity = this._repository.getEntityById(id);
        if (entity) {
            const latlong = entity.layer.getBounds().getCenter();
            this._map.setView(latlong, 19);
            // Update the popup-position
            this._popup.setLatLng(latlong);
            // Call the click event
            this.onLayerClicked(entity);
        }
    }

    private UpdateOnScreenDisplay(entity: MapEntity | null, customMsg: string = null) {
        if (entity || customMsg) {
            let tooltipText = '';

            if (customMsg) {
                tooltipText = customMsg;
            } else {
                tooltipText = entity.area + 'm²';

                for (const rule of entity.getAllTriggeredRules()) {
                    if (rule.severity >= 2) {
                        tooltipText += '<br>' + rule.shortMessage;
                    }
                }
            }

            this.sqmTooltip.openOn(this._map);
            this.sqmTooltip.setLatLng(entity.layer.getBounds().getCenter());
            this.sqmTooltip.setContent(tooltipText);
        } else {
            this.sqmTooltip.close();
        }
    }
}
