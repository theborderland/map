import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { EntityDataAPI, EntityData } from '../api';

/**
 * The Editor class keeps track of user-editable layers
 */
export class Editor {
    /** The Leaflet Map being used */
    private _map: L.Map;
    /** A Leaflet popup used to display information and choices for individual editable layers */
    private _popup: L.Popup;

    /** The current Leaflet layer being edited, if any */
    private _layerBeingEdited: (L.Layer & { pm: any }) | null = null;
    /** The current Map Entity being edited, if any */
    private _entityBeingEdited: EntityData | null = null;

    /** Returns the style to use for editable layers */
    private get _layerStyle(): L.PathOptions {
        return {
            color: 'cyan',
            fillColor: 'green',
            fillOpacity: 0.4,
        };
    }

    /** Event handler for when an editable layer is clicked */
    private async handleClick(entity: EntityData, layer: L.Layer & { pm: any }, latlng: L.LatLng) {
        console.log('[Editor]', 'Click event fired', { layer, entity, latlng });

        // Ignore presses on the layer being edited
        if (this._layerBeingEdited && this._layerBeingEdited == layer) {
            return;
        }

        // Show information popup
        const content = this.createInformationPopUp(entity, layer);
        this._popup.setContent(content).setLatLng(latlng).openOn(this._map);

        // Stop save current layer being edited
        this.handleStopAndSave();
    }

    /** Event handler for when an editable layer is done being edited */
    private async handleStopAndSave() {
        console.log('[Editor]', 'Save event fired', { layer: this._layerBeingEdited, entity: this._entityBeingEdited });

        // Update the entity using the API
        if (this._layerBeingEdited && this._entityBeingEdited) {
            // Stop editing
            this._layerBeingEdited.pm.disable();
            // Get GeoJson
            const geoJson = this.getJsonFromLayer(this._layerBeingEdited);

            // Update the entity with the response from the API
            // and re-open the information pop up on the new layer
            const entityInResponse = await EntityDataAPI.updateEntity(this._entityBeingEdited.id, geoJson);
            this._map.removeLayer(this._layerBeingEdited);
            const layer = this.createEditableLayer(entityInResponse);
            const bounds = layer.getBounds();
            const latlng = bounds.getCenter();

            this._entityBeingEdited = null;
            this._layerBeingEdited = null;

            this.handleClick(entityInResponse, layer, latlng);
        }
    }

    /** Event handler for when an new layer is created */
    private async handleCreation(createEvent: { layer: L.Layer }) {
        console.log('[Editor]', 'Create event fired', { createEvent });

        // Get the newly created layer as GeoJson
        const { layer } = createEvent;
        const geoJson = this.getJsonFromLayer(layer);

        // Save it to the entity API
        const entity = await EntityDataAPI.createEntity(geoJson);

        // Remove the drawn layer and replace it with one bound to the entity
        if (entity) {
            this.createEditableLayer(entity);
            this._map.removeLayer(layer);
        }
    }

    /** Creates a editable layer from a map entity and adds it to the map */
    private createEditableLayer(entity: EntityData) {
        // Create the geometry layer with correct styling
        const layer = new L.GeoJSON(JSON.parse(entity.geoJson), {
            pmIgnore: false,
            interactive: true,
            bubblingMouseEvents: false,
            style: (/*feature*/) => {
                return this._layerStyle;
            },
        });

        // Create popups associated with this layer
        //const popup = this.createInformationPopUp(entity);

        // Bind the popup and add the layer to the map
        layer.on('click', ({ latlng }) => this.handleClick(entity, layer, latlng)).addTo(this._map);

        // Return the layer if needed
        return layer;
    }

    /** TODO: document */
    private createInformationPopUp(entity: EntityData, layer: L.Layer & { pm: any }) {
        const content = document.createElement('div');
        const geojson = JSON.parse(entity.geoJson);

        content.innerHTML = `<h2>${geojson.properties.name}</h2>
                             <p>${geojson.properties.description}</p>
                             <p><b>People:</b> ${geojson.properties.people}</p>
                             <p><b>Vehicles:</b> ${geojson.properties.vehicles}</p>
                             <p><b>Power:</b> ${geojson.properties.power}</p>
                             <p><b>Area:</b> ${geojson.properties.area}</p>
                             <p>id: ${entity.id}, rev: ${entity.revision}</p>`;

        const editShapeButton = document.createElement('button');
        editShapeButton.innerHTML = 'Edit shape';
        editShapeButton.onclick = () => {
            if (!this._layerBeingEdited) {
                layer.pm.enable({ editMode: true });
                this._layerBeingEdited = layer;
                this._entityBeingEdited = entity;
                this._popup.close();
            }
        };

        content.appendChild(editShapeButton);

        const editInfoButton = document.createElement('button');
        editInfoButton.innerHTML = 'Edit info';
        editInfoButton.onclick = (e) => {
                e.stopPropagation();
                e.preventDefault();
                const content = this.createEditInformationPopUp(entity, layer);
                this._popup.setContent(content).openOn(this._map);
        };
        content.appendChild(editInfoButton);

        return content;
    }

/** TODO: document */
    private createEditInformationPopUp(entity: EntityData, layer: L.Layer & { pm: any }) {
        const content = document.createElement('div');
        const geojson = JSON.parse(entity.geoJson);

        content.innerHTML = `<p>id: ${entity.id}, rev: ${entity.revision}</p> `;

        const nameDiv = document.createElement('div');
        content.appendChild(nameDiv);

        nameDiv.appendChild(document.createElement('label')).innerHTML = 'Name:';

        const nameField = document.createElement('input');
        nameField.value = geojson.properties.name;
        nameDiv.appendChild(nameField);

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
        content.appendChild(vehiclesField);

        content.appendChild(document.createElement('br'));
        content.appendChild(document.createElement('label')).innerHTML = 'Power:';

        const powerField = document.createElement('input');
        powerField.value = geojson.properties.power;
        content.appendChild(powerField);

        content.appendChild(document.createElement('p'));

        const saveInfoButton = document.createElement('button');
        saveInfoButton.innerHTML = 'Save';
        saveInfoButton.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            geojson.properties = { name : nameField.value, description: descriptionField.value, people: peopleField.value, vehicles: vehiclesField.value, power: powerField.value };
            EntityDataAPI.updateEntity(entity.id, geojson);

            //FIXME: this is a hack to get the popup to update (comment written by Copilot, but so true)
            entity.geoJson = JSON.stringify(geojson);
            
            const content = this.createInformationPopUp(entity, layer);
            this._popup.setContent(content);
        };

        content.appendChild(saveInfoButton);

        return content;
    }

    /** Converts a layer to geo json and make sure its a single feature and not a collection */
    private getJsonFromLayer(layer: L.Layer & { pm?: any }) {
        //@ts-ignore
        const geoJson = layer.toGeoJSON();

        if (geoJson.features && geoJson.features[0]) {
            return geoJson.features[0];
        }
        return geoJson;
    }

    constructor(map: L.Map) {
        // Keep track of the map
        this._map = map;

        // Create a popup
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
        this._map.pm.setPathOptions(this._layerStyle);

        // Add the event handler for newly created layers
        this._map.on('pm:create', this.handleCreation.bind(this));

        // Add a click event to the map to disable editing on any currently edited layer, if any.
        // Also closes any open popups
        // Its a mouse up event to make sure it always fires, which click does not
        this._map.on('click', (mouseEvent) => {
            console.log('[Editor]', 'Editor blur event fired (map click)', mouseEvent);

            // Hide the editors popup
            this._popup.close();

            // Stop save current layer being edited
            this.handleStopAndSave();
        });

        // TODO: re-add?
        // Event fired when a layer is done drawing. Calculate stuff for the layer here? Sqm, if its overlapping another layer etc.
        // map.on('pm:drawend', (drawendEvent) => {
        //     console.log({ geomanDrawendEvent: drawendEvent });
        // });
        // TODO: re-add?
        // map.on('pm:drawstart', (drawstartEvent) => {
        //     console.log({ geomanDrawstartEvent: drawstartEvent });
        // });
    }

    /** Add each existing map entity from the API as an editable layer */
    public async addAPIEntities() {
        const entities = await EntityDataAPI.entities();

        for (const entity of entities) {
            this.createEditableLayer(entity);
        }
    }
}
