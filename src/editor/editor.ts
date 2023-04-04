import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { MapEntity, MapEntityRepository, DefaultLayerStyle } from '../entities';

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

    /** The current status of the editor */
    private _mode: 'none' | 'selected' | 'editing-shape' | 'editing-info' = 'none';

    /** The currently selected map entity, if any */
    private _selected: MapEntity | null = null;

    /** Updates current editor status - blur indicates that the current mode should be redacted */
    private setMode(nextMode: Editor['_mode'] | 'blur', nextEntity?: MapEntity) {
        // Skip mode change
        if (nextMode == this._mode || (nextMode == 'selected' && nextEntity == this._selected)) {
            return;
        }

        // When blur is sent as parameter, the next mode is dynamicly determined
        if (nextMode == 'blur') {
            // When a entity is selected, blur to "none" selected
            if (this._mode == 'selected') {
                nextMode = 'none';
            }
            // When an entity is edited, blur back to the selection mode
            if (this._selected && (this._mode == 'editing-shape' || this._mode == 'editing-info')) {
                nextMode = 'selected';
                nextEntity = this._selected;

                // When returning to the selection view from editing the done-editing-event is called
                this.onLayerDoneEditing(nextEntity);
            }
        }

        // Set the correct mode
        console.log('[Editor]', 'mode change!', { mode: this._mode, nextMode, nextEntity });
        this._mode = nextMode as Editor['_mode'];

        // Handle effects of setting the correct mode

        // Deselect and stop editing
        if (nextMode == 'none') {
            this._selected = null;
            this.setPopup('none');
            return;
        }

        // Select an entity for editing
        if (nextMode == 'selected' && nextEntity) {
            this.setPopup('info', nextEntity);
            this._selected = nextEntity;
            return;
        }
        // Edit the shape of the entity
        if (nextMode == 'editing-shape' && nextEntity) {
            nextEntity.layer.pm.enable({ editMode: true });
            this.setPopup('none');
            return;
        }
        // Edit the information of the entity
        if (nextMode == 'editing-info' && nextEntity) {
            this.setPopup('edit-info', nextEntity);
            return;
        }
    }

    /** Updates whats display in the pop up window, if anything - usually called from setMode */
    private setPopup(display: 'info' | 'edit-info' | 'none', entity?: MapEntity) {
        // Don't show any pop-up
        if (display == 'none') {
            this._popup.close();
            return;
        }

        // Show information for the entity
        if (display == 'info' && entity) {
            const content = document.createElement('div');
            content.innerHTML = `<h2>${entity.name}</h2>
                                 <p>${entity.description}</p>
                                 <p><b>People:</b> ${entity.nrOfPeople}</p>
                                 <p><b>Vehicles:</b> ${entity.nrOfVehicles}</p>
                                 <p><b>Additional sqm:</b> ${entity.additionalSqm}</p>
                                 <p><b>Power:</b> ${entity.powerNeed}</p>
                                 <p><b>Area:</b> ${entity.area}</p>
                                 <p><b>Calculated Area Need:</b> ${entity.calculatedAreaNeeded}</p>
                                 <p>id: ${entity.id}, rev: ${entity.revision}</p>`;

            const editShapeButton = document.createElement('button');
            editShapeButton.innerHTML = 'Edit shape';
            editShapeButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('editing-shape', entity);
            };

            content.appendChild(editShapeButton);

            const editInfoButton = document.createElement('button');
            editInfoButton.innerHTML = 'Edit info';
            editInfoButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('editing-info', entity);
            };
            content.appendChild(editInfoButton);

            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show fields to edit the entity information
        if (display == 'edit-info' && entity) {
            const content = document.createElement('div');
            content.innerHTML = `<p>id: ${entity.id}, rev: ${entity.revision}</p> `;

            content.appendChild(document.createElement('label')).innerHTML = 'Name:';
            const nameField = document.createElement('input');
            nameField.type = 'text';
            nameField.value = entity.name;
            nameField.onchange = () => (entity.name = nameField.value);
            content.appendChild(nameField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Description:';

            const descriptionField = document.createElement('input');
            descriptionField.type = 'text';
            descriptionField.value = entity.description;
            descriptionField.onchange = () => (entity.description = descriptionField.value);
            content.appendChild(descriptionField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'People:';

            const peopleField = document.createElement('input');
            peopleField.type = 'number';
            peopleField.value = String(entity.nrOfPeople);
            peopleField.onchange = () => (entity.nrOfPeople = peopleField.value);
            content.appendChild(peopleField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Vehicles:';

            const vehiclesField = document.createElement('input');
            vehiclesField.type = 'number';
            vehiclesField.value = String(entity.nrOfVehicles);
            vehiclesField.onchange = () => (entity.nrOfVehicles = vehiclesField.value);
            content.appendChild(vehiclesField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Additional sqm:';

            const otherSqm = document.createElement('input');
            otherSqm.type = 'number';
            otherSqm.value = String(entity.additionalSqm);
            otherSqm.onchange = () => (entity.additionalSqm = otherSqm.value);
            content.appendChild(otherSqm);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Power need:';

            const powerField = document.createElement('input');
            powerField.type = 'number';
            powerField.value = String(entity.powerNeed);
            powerField.onchange = () => (entity.powerNeed = powerField.value);
            content.appendChild(powerField);

            content.appendChild(document.createElement('p'));

            const saveInfoButton = document.createElement('button');
            saveInfoButton.innerHTML = 'Save';
            saveInfoButton.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('blur');
            };
            content.appendChild(saveInfoButton);

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
        console.log('[Editor]', 'Save event fired', { selected: this._selected });
        // Stop editing
        entity.layer.pm.disable();

        // Update the entity with the response from the API
        // and re-center the pop up on the new layer
        const entityInResponse = await this._repository.updateEntity(entity);
        this._map.removeLayer(entity.layer);

        if (entityInResponse) {
            this.addEntityToMap(entityInResponse);
            //@ts-ignore
            const bounds = entityInResponse.layer.getBounds();
            const latlng = bounds.getCenter();
            this._popup.setLatLng(latlng);
        }
    }

    /** Event handler for when an new layer is created */
    private async onNewLayerCreated(createEvent: { layer: L.Layer }) {
        console.log('[Editor]', 'Create event fired', { createEvent });

        // Get the newly created layer as GeoJson
        const { layer } = createEvent;
        //@ts-ignore
        const geoJson = layer.toGeoJSON();

        // Save it to the entity API
        const entity = await this._repository.createEntity(geoJson);

        // Remove the drawn layer and replace it with one bound to the entity
        if (entity) {
            this.addEntityToMap(entity);
            this._map.removeLayer(layer);
        }
    }

    /** Adds the given map entity as an a editable layer to the map */
    private addEntityToMap(entity: MapEntity) {
        // Bind the click-event of the editor to the layer
        entity.layer.on('click', ({ latlng }) => {
            // Update the popup-position
            this._popup.setLatLng(latlng);
            // Call the click event
            this.onLayerClicked(entity);
        });
        // Add the layer to the map
        entity.layer.addTo(this._map);
    }

    constructor(map: L.Map, repository: MapEntityRepository) {
        // Keep track of the map
        this._map = map;

        // Keep track of the repository
        this._repository = repository;

        // Create a common popup for editable layers
        this._popup = L.popup({
            autoClose: false,
            closeButton: false,
            closeOnClick: false,
            closeOnEscapeKey: false,
        });

        // Disable edit mode on all layers by default
        L.PM.setOptIn(true);

        // add controls for creating and editing shapes to the map
        this._map.pm.addControls({
            position: 'bottomleft',
            drawPolygon: true,
            drawCircle: false,
            drawMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawCircleMarker: false,
            drawText: false,
            removalMode: false,
            editControls: false,
        });

        // Set path style options for newly created layers
        this._map.pm.setPathOptions(DefaultLayerStyle);

        // Add the event handler for newly created layers
        this._map.on('pm:create', this.onNewLayerCreated.bind(this));

        // Add a click event to the map to reset the editor status.
        this._map.on('click', (mouseEvent) => {
            console.log('[Editor]', 'Editor blur event fired (map click)', { mouseEvent });

            this.setMode('blur');
        });
    }

    /** Add each existing map entity from the API as an editable layer */
    public async addAPIEntities() {
        const entities = await this._repository.entities();

        for (const entity of entities) {
            this.addEntityToMap(entity);
        }
    }
}
