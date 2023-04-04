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

    private setMode(nextMode: Editor['_mode'] | 'blur', nextEntity?: MapEntity) {
        // Update current status

        // Don't change mode
        if (nextMode == this._mode) {
            return;
        }

        // When blur is sent the next mode is dynamic
        if (nextMode == 'blur') {
            if (this._mode == 'selected') {
                nextMode = 'none';
            }
            if (this._selected && (this._mode == 'editing-shape' || this._mode == 'editing-info')) {
                nextMode = 'selected';
                nextEntity = this._selected;

                // When returning to the selection view from editing the done-editing-event is called
                this.onLayerDoneEditing(nextEntity);
            }
        }

        console.log({ mode: this._mode, nextMode, nextEntity });

        // Update the pop-up
        this.setPopup(nextMode, nextEntity);

        // Set the correct mode
        this._mode = nextMode as Editor['_mode'];

        // Deselect and stop editing
        if (nextMode == 'none') {
            console.log('[Editor]', 'Mode', 'None');
            this._selected = null;
            return;
        }

        // Select an entity for editing
        if (nextMode == 'selected' && nextEntity) {
            // Ignore re-selecting the same entity
            if (this._selected && this._selected == nextEntity) {
                return;
            }

            console.log('[Editor]', 'Mode', 'Selected', { nextEntity });
            this._selected = nextEntity;
            return;
        }
        if (nextMode == 'editing-shape' && nextEntity) {
            console.log('[Editor]', 'Mode', 'Editing shape', { nextEntity });
            nextEntity.layer.pm.enable({ editMode: true });
            return;
        }
        if (nextMode == 'editing-info' && nextEntity) {
            console.log('[Editor]', 'Mode', 'Editing information', { nextEntity });
            //nextEntity.layer.pm.enable({ editMode: true });
            return;
        }
    }

    private setPopup(nextMode: Editor['_mode'] | 'blur', nextEntity?: MapEntity) {
        if (nextMode == 'none' || nextMode == 'editing-shape') {
            this._popup.close();
            return;
        }
        if (nextMode == 'selected' && nextEntity) {
            const content = document.createElement('div');
            const geojson = JSON.parse(nextEntity.geoJson);

            content.innerHTML = `<h2>${geojson.properties.name}</h2>
                                 <p>${geojson.properties.description}</p>
                                 <p><b>People:</b> ${geojson.properties.people}</p>
                                 <p><b>Vehicles:</b> ${geojson.properties.vehicles}</p>
                                 <p><b>Other sqm:</b> ${geojson.properties.othersqm}</p>
                                 <p><b>Power:</b> ${geojson.properties.power}</p>
                                 <p><b>Area:</b> ${geojson.properties.area}</p>
                                 <p><b>Calculated Area Need:</b> ${geojson.properties.calculatedareaneed}</p>
                                 <p>id: ${nextEntity.id}, rev: ${nextEntity.revision}</p>`;

            const editShapeButton = document.createElement('button');
            editShapeButton.innerHTML = 'Edit shape';
            editShapeButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('editing-shape', nextEntity);
            };

            content.appendChild(editShapeButton);

            const editInfoButton = document.createElement('button');
            editInfoButton.innerHTML = 'Edit info';
            editInfoButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('editing-info', nextEntity);
            };
            content.appendChild(editInfoButton);

            this._popup.setContent(content).openOn(this._map);
            return;
        }
        if (nextMode == 'editing-info') {
            const entity = this._selected!;
            const content = document.createElement('div');
            const geojson = JSON.parse(entity.geoJson);

            content.innerHTML = `<p>id: ${entity.id}, rev: ${entity.revision}</p> `;

            content.appendChild(document.createElement('label')).innerHTML = 'Name:';

            const nameField = document.createElement('input');
            nameField.value = geojson.properties.name;
            content.appendChild(nameField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Description:';

            const descriptionField = document.createElement('input');
            descriptionField.value = geojson.properties.description;
            content.appendChild(descriptionField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'People:';

            const peopleField = document.createElement('input');
            peopleField.type = 'number';
            peopleField.value = geojson.properties.people;
            content.appendChild(peopleField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Vehicles:';

            const vehiclesField = document.createElement('input');
            vehiclesField.value = geojson.properties.vehicles;
            vehiclesField.type = 'number';
            content.appendChild(vehiclesField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Other sqm:';

            const otherSqm = document.createElement('input');
            otherSqm.value = geojson.properties.otherSqm;
            otherSqm.type = 'number';
            content.appendChild(otherSqm);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Power need:';

            const powerField = document.createElement('input');
            powerField.value = geojson.properties.power;
            powerField.type = 'number';
            content.appendChild(powerField);

            content.appendChild(document.createElement('p'));

            const saveInfoButton = document.createElement('button');
            saveInfoButton.innerHTML = 'Save';
            saveInfoButton.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('blur');

                //FIXME: Den här är farlig då den skriver över allt i geojson.properties, så läggs något nytt till måste denna uppdateras!
                geojson.properties = {
                    name: nameField.value,
                    description: descriptionField.value,
                    people: peopleField.value,
                    vehicles: vehiclesField.value,
                    othersqm: otherSqm.value,
                    power: powerField.value,
                    calculatedareaneed: geojson.properties.calculatedareaneed,
                    area: geojson.properties.area,
                };
                //await EntityDataAPI.updateEntity(entity.id, geojson);

                //FIXME: this is a hack to get the popup to update (comment written by Copilot, but true)
                //entity.geoJson = JSON.stringify(geojson);

                //const content = this.createInformationPopUp(entity, layer);
                //this._popup.setContent(content);
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
            autoClose: true,
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
