import * as L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import { MapEntity, MapEntityRepository, DefaultLayerStyle, EntityDifferences } from '../entities';
import { generateRulesForEditor } from '../entities/rule';
import { EntityChanges } from '../entities/repository';
import * as Turf from '@turf/turf';
import DOMPurify from 'dompurify';
import 'leaflet.path.drag';
import 'leaflet-search';

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
    
    private onScreenInfo: any; //The little bottom down thingie that shows the current area and stuff
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
            if ((prevMode == 'editing-shape' || prevMode == 'moving-shape' || prevMode == 'editing-info') && prevEntity) {
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
                prevEntity?.layer._layers[prevEntity.layer._leaflet_id-1].dragging.disable();
            }

            return;
        }
        // Edit the shape of the entity
        if (this._mode == 'editing-shape' && nextEntity) {
            nextEntity.layer.pm.enable({ editMode: true, snappable: false});
            this.setSelected(nextEntity, prevEntity);
            this.setPopup('none');
            return;
        }
        // Move the shape of the entity
        if (this._mode == 'moving-shape' && nextEntity) {
            this.setSelected(nextEntity, prevEntity);
            this.setPopup('none');
            this.UpdateOnScreenDisplay(nextEntity, "Drag to move");
            nextEntity.layer._layers[nextEntity.layer._leaflet_id-1].dragging.enable();
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
        if (("key" in evt) && !(evt.key === "Escape" || evt.key === "Esc")) {
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
            const content = document.createElement('div');

            const personText = entity.nrOfPeople === "1" ? ' person,' : ' people,';
            const vehicleText = entity.nrOfVehicles === "1" ? '> vehicle,' : ' vehicles,';
            const entityName = entity.name ? entity.name : 'No name yet';
            const entityDescription = entity.description ? entity.description : 'No description yet, please add one!';
            const entityContactInfo = entity.contactInfo ? entity.contactInfo : 'Please add contact info! Without it, your area might be removed.';
            const entityPowerNeed = entity.powerNeed != -1 ? `${entity.powerNeed} Watts` : 'Please state your power need! Set to 0 if you will not use electricity.';
            const entitySoundAmp = entity.amplifiedSound != -1 ? `${entity.amplifiedSound} Watts` : 'Please set sound amplification! Set to 0 if you wont have speakers.';

            let descriptionSanitized = DOMPurify.sanitize(entityDescription);
            // URLs starting with http://, https://, or ftp://
            let replacePattern1 = /(\b(https?|ftp):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gim;
            let descriptionWithLinks = descriptionSanitized.replace(replacePattern1, '<a href="$1" target="_blank">$1</a>');

            content.innerHTML = `<h2 style="margin-bottom: 0">${DOMPurify.sanitize(entityName)}</h2>
                                <p class="scrollable">${descriptionWithLinks}</p>
                                <p style="font-size:14px; margin-top:0px !important; margin-bottom:0px !important">
                                <b>Contact:</b> ${DOMPurify.sanitize(entityContactInfo)}   
                                </br>
                                <b style="text-align:right;">Power:</b> ${entityPowerNeed}
                                </br>
                                <b style="text-align:right;">Sound:</b> ${entitySoundAmp}
                                </p> 

                                <div style="font-size: 14px; color:#5c5c5c; margin-bottom: 10px !important">
                                    <b>${entity.area}</b> m² - 
                                    ${entity.nrOfPeople > 0 ? "<b>" + entity.nrOfPeople + "</b>" + personText : ""} 
                                    ${entity.nrOfVehicles > 0 ? "<b>" + entity.nrOfVehicles + "</b>" + vehicleText : ""} 
                                    ${entity.additionalSqm > 0 ? "<b>" + entity.additionalSqm + "</b> m² other" : ""}
                                </div>
                                `;

            const sortedRules = entity.getAllTriggeredRules().sort((a, b) => b.severity - a.severity);

            
            if (sortedRules.length > 0)
            {
                if (!entity.supressWarnings) content.innerHTML += `<p style="margin-bottom: 0px !important"><b>${sortedRules.length}</b> issues found:</p> `;
                
                //A div that will hold all the rule messages
                const ruleMessages = document.createElement('div');
                // ruleMessages.style.marginTop = '10px';
                ruleMessages.style.maxHeight = '200px';
                ruleMessages.style.overflowY = 'auto';
                ruleMessages.style.marginBottom = '10px';
                content.appendChild(ruleMessages);

                for (const rule of sortedRules) {
                    if (rule.severity >= 3) {
                        ruleMessages.innerHTML += `<p class="error">${' ' + rule.message}</p>`;
                    } else if (!entity.supressWarnings)
                    {
                        if (rule.severity >= 2) {
                            ruleMessages.innerHTML += `<p class="warning">${' ' + rule.message}</p>`;
                        } else {
                            ruleMessages.innerHTML += `<p class="info">${' ' + rule.message}</p>`;
                        }
                    }
                }
            }

            if (this._isEditMode) {
                const editShapeButton = document.createElement('button');
                editShapeButton.innerHTML = 'Edit shape';
                editShapeButton.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.setMode('editing-shape', entity);
                };

                content.appendChild(editShapeButton);

                const moveShapeButton = document.createElement('button');
                moveShapeButton.innerHTML = 'Move';
                moveShapeButton.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.setMode('moving-shape', entity);
                };

                content.appendChild(moveShapeButton);

                const editInfoButton = document.createElement('button');
                editInfoButton.innerHTML = 'Edit info';
                editInfoButton.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.setMode('editing-info', entity);
                };
                content.appendChild(editInfoButton);
            }

            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show fields to edit the entity information
        if (display == 'edit-info') {
            const content = document.createElement('div');
            content.innerHTML = ``;

            content.appendChild(document.createElement('label')).innerHTML = 'Name of camp/dream';
            
            const nameField = document.createElement('input');
            nameField.type = 'text';
            nameField.value = entity.name;
            nameField.placeholder = 'Enter camp name here..';
            nameField.oninput = () => {
                entity.name = nameField.value;
                this.refreshEntity(entity);
            };
            content.appendChild(nameField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('label')).innerHTML = 'Description';

            const descriptionField = document.createElement('textarea');
            descriptionField.value = entity.description;
            descriptionField.placeholder = 'Describe your camp/dream here as much as you want. Remember that this information is public.';
            descriptionField.style.height = '100px';
            descriptionField.oninput = () => {
                entity.description = descriptionField.value;
                this.refreshEntity(entity);
                this.UpdateOnScreenDisplay(entity);
            };
            content.appendChild(descriptionField);

            content.appendChild(document.createElement('label')).innerHTML = 'Contact info';
            const contactField = document.createElement('input');
            contactField.type = 'text';
            contactField.value = entity.contactInfo;
            contactField.placeholder = 'Email, phone, discord name etc';
            contactField.oninput = () => {
                entity.contactInfo = contactField.value;
                this.refreshEntity(entity);
                this.UpdateOnScreenDisplay(entity);
            };
            content.appendChild(contactField);
            
            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('b')).innerHTML = 'People';

            const peopleField = document.createElement('input');
            peopleField.title = '10m² per person';
            peopleField.style.width = '3em';
            peopleField.style.marginBottom = '7px';
            peopleField.style.marginLeft = '5px';
            peopleField.type = 'number';
            peopleField.value = String(entity.nrOfPeople);
            peopleField.min = '0';
            peopleField.oninput = () => {
                entity.nrOfPeople = peopleField.value;
                updateTextAboutNeededSpace(entity);
            };
            content.appendChild(peopleField);

            const personText = document.createElement('span');
            personText.innerHTML = ' x 10m²';
            personText.style.fontSize = '12px';
            personText.style.marginRight = '25px';
            content.appendChild(personText);

            content.appendChild(document.createElement('b')).innerHTML = ' Vehicles ';
            const vehiclesField = document.createElement('input');
            vehiclesField.title = '70m² per vehicle';
            vehiclesField.style.width = '3em';
            vehiclesField.style.marginLeft = '5px';
            vehiclesField.type = 'number';
            vehiclesField.value = String(entity.nrOfVehicles);
            vehiclesField.min = '0';
            vehiclesField.oninput = () => {
                entity.nrOfVehicles = vehiclesField.value;
                updateTextAboutNeededSpace(entity);
            };
            content.appendChild(vehiclesField);

            const vehicleText = document.createElement('span');
            vehicleText.innerHTML = ' x 70m²';
            vehicleText.style.fontSize = '12px';
            content.appendChild(vehicleText);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('b')).innerHTML = 'Other stuff in m²';
            const otherSqm = document.createElement('input');
            otherSqm.title = 'Area needed for kitchen, storage, workshop tents etc.';
            otherSqm.style.width = '6.2em';
            otherSqm.style.marginLeft = '116px';
            otherSqm.type = 'number';
            otherSqm.value = String(entity.additionalSqm);
            otherSqm.min = '0';
            otherSqm.oninput = () => {
                entity.additionalSqm = otherSqm.value;
                updateTextAboutNeededSpace(entity);
            };
            content.appendChild(otherSqm);

            let updateTextAboutNeededSpace = (entity: MapEntity, div : HTMLElement = null) =>{
                this.refreshEntity(entity);
                this.UpdateOnScreenDisplay(entity);
                let areaInfo = document.getElementById('areaInfo');
                if (!areaInfo) {
                    areaInfo = div;
                }
                areaInfo.innerHTML = 'With this amount of people, vehicles and extra m² such as art, kitchen tents and structures, a suggested camp size is <b>' + entity?.calculatedAreaNeeded + 'm²</b>. Currently the area is <b>' + entity?.area + 'm².</b>';
            };

            let areaInfo = content.appendChild(document.createElement('div'));
            areaInfo.id = 'areaInfo';
            areaInfo.style.marginTop = '10px';
            areaInfo.style.marginBottom = '5px';
            areaInfo.style.fontSize = '12px';
            updateTextAboutNeededSpace(entity, areaInfo);

            content.appendChild(document.createElement('b')).innerHTML = 'Power need (Watts) ';

            const powerField = document.createElement('input');
            powerField.title = 'A water boiler is about 2000W, a fridge is about 100W,\na laptop is about 50W, a phone charger is about 10W.';
            powerField.style.width = '5em';
            powerField.style.marginTop = '7px';
            powerField.style.marginBottom = '7px';
            powerField.style.marginLeft = '110px';
            powerField.type = 'number';
            powerField.value = String(entity.powerNeed);
            powerField.placeholder = '?';
            powerField.min = '0';
            powerField.oninput = () => {
                //@ts-ignore
                entity.powerNeed = powerField.value;
                this.refreshEntity(entity);
                this.UpdateOnScreenDisplay(entity);
            };
            content.appendChild(powerField);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('b')).innerHTML = 'Sound amplification (Watts) ';

            const soundField = document.createElement('input');
            soundField.style.width = '5em';
            soundField.title = 'If over 100W then you are considered a sound camp.\nPlease get in contact with the sound lead.';
            soundField.style.marginBottom = '7px';
            soundField.style.marginLeft = '58px';
            soundField.type = 'number';
            soundField.value = String(entity.amplifiedSound);
            soundField.min = '0';
            soundField.placeholder = '?';
            soundField.oninput = () => {
                //@ts-ignore
                entity.amplifiedSound = soundField.value;
                this.refreshEntity(entity);
                this.UpdateOnScreenDisplay(entity);
            };
            content.appendChild(soundField);

            content.appendChild(document.createElement('p'));

            if (this._isEditMode) {
                const saveInfoButton = document.createElement('button');
                saveInfoButton.innerHTML = 'Ok!';
                saveInfoButton.style.width = '200px';
                saveInfoButton.onclick = async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.setMode('blur');
                };
                content.appendChild(saveInfoButton);

                const moreButton = document.createElement('button');
                moreButton.innerHTML = 'More...';
                moreButton.style.marginRight = '0';
                moreButton.onclick = async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.setPopup('more', entity);
                };
                content.appendChild(moreButton);
            }

            content.onkeydown = (evt: Event) => {
                // console.log('onkeydown', evt);
                if (("key" in evt && evt.key === "Enter") && ("ctrlKey" in evt && evt.ctrlKey == true)) {
                    // console.log('Ctrl + Enter');
                    this.setMode('blur');
                }
            };

            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show fields to edit the entity information
        if (display == 'more') {
            const content = document.createElement('div');
            content.innerHTML = ``;

            content.appendChild(document.createElement('h2')).innerHTML = 'More stuff';
            
            let formattedDate = this.formatDate(entity.timeStamp);
            
            let entityInfo = content.appendChild(document.createElement('div'));
            entityInfo.innerHTML = 
            `<b>Entity Id: </b> ${entity.id}` +
            `<br><b>Revisions: </b> ${entity.revision}` + 
            `<br><b>Last edited:</b> ${formattedDate}`;
            content.appendChild(document.createElement('br'));

            //A link that when pressed will copy "entity.id" to the clipboard
            let copyLink = content.appendChild(document.createElement('a'));
            copyLink.innerHTML = 'Click here to copy a link to this entity';
            copyLink.href = '?id=' + entity.id;
            copyLink.onclick = (e) => {
                console.log("Copy to clipboard", copyLink.href);
                e.stopPropagation();
                e.preventDefault();
                navigator.clipboard.writeText(copyLink.href);
                return false;
            };

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('b')).innerHTML = 'Supress yellow warnings';
            const supressWarnings = document.createElement('input');
            supressWarnings.type = 'checkbox';
            supressWarnings.style.marginLeft = '10px';
            supressWarnings.checked = entity.supressWarnings;
            supressWarnings.onchange = () => {
                entity.supressWarnings = supressWarnings.checked;
                this.refreshEntity(entity);
            };
            content.appendChild(supressWarnings);

            content.appendChild(document.createElement('br'));
            content.appendChild(document.createElement('b')).innerHTML = 'Custom color ';
            const colorPicker = document.createElement('input');
            colorPicker.type = 'color';
            colorPicker.style.width = '66px';
            colorPicker.style.marginLeft = '146px';
            colorPicker.value = entity.color;
            colorPicker.onchange = () => {
                entity.color = colorPicker.value;
                this.refreshEntity(entity);
            };
            content.appendChild(colorPicker);

            content.appendChild(document.createElement('p'));

            const deleteButton = document.createElement('button');
            deleteButton.classList.add('delete-button');
            deleteButton.innerHTML = 'Delete';
            deleteButton.style.width = "100%";
            deleteButton.onclick = async (e) => {
                let deleteReason = prompt("Are you really sure you should delete this area? Answer why.", "");
                if (deleteReason == null || deleteReason == "") {
                    console.log('Delete nope, deleteReason', deleteReason);
                    return;
                }
                console.log('Delete yes, deleteReason', deleteReason);

                e.stopPropagation();
                e.preventDefault();
                this.deleteAndRemoveEntity(entity, deleteReason);
            };
            content.appendChild(deleteButton);

            const historyButton = document.createElement('button');
            historyButton.innerHTML = 'History';
            historyButton.style.marginRight = '0';
            historyButton.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setPopup('history', entity);
            };
            content.appendChild(historyButton);

            let deleteInfo = content.appendChild(document.createElement('div'));
            deleteInfo.innerHTML = `Use delete with caution! Only delete things you know is ok. Undelete can only be performed by using black magic.`;

            content.appendChild(document.createElement('br'));

            const backButton = document.createElement('button');
            backButton.innerHTML = 'Back';
            backButton.style.width = '200px';
            backButton.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('blur');
            };
            content.appendChild(backButton);
            
            this._popup.setContent(content).openOn(this._map);
            return;
        }

        // Show edit-history for the entity
        if (display == 'history') {
            const content = document.createElement('div');
            content.innerHTML = ``;

            content.appendChild(document.createElement('h2')).innerHTML = 'Edit-History';

            let formattedDate = this.formatDate(entity.timeStamp);

            let entityInfo = content.appendChild(document.createElement('div'));
            entityInfo.innerHTML =
            `<b>Entity Id: </b> ${entity.id}<br>` +
            `<b>Name: </b> ${entity.name}<br>` +
            `<b>Revisions: </b> ${entity.revision}<br>` +
            `<b>Last edited:</b> ${formattedDate}`;
            content.appendChild(document.createElement('br'));

            // Prepare table for showing revisions
            const divtable = document.createElement('div');
            const divdescriptionframe = document.createElement('div');
            const divdescription = document.createElement('div');
            const divdescriptionheader = document.createElement('h3');
            divdescriptionheader.innerText = 'Description';
            divdescriptionframe.append(divdescriptionheader);
            divdescriptionframe.append(divdescription);
            divtable.id = "history-table";
            content.appendChild(divtable);
            divdescription.id = "change-description";
            content.appendChild(divdescriptionframe);
            const table: HTMLTableElement = document.createElement('table');
            divtable.appendChild(table);
            const thead = table.createTHead();
            const theadrow: HTMLTableRowElement = thead.insertRow();
            theadrow.insertCell().innerText = "Revision";
            theadrow.insertCell().innerText = "Timestamp";
            theadrow.insertCell().innerText = "What Changed";
            const tbody = table.createTBody();

            // Get revisions and create tale rows for each revision
            await this._repository.getRevisionsForEntity(entity);
            // console.log('result from getRevisionsForEntity', entity.revisions);
            let rowsToAdd: Array<HTMLTableRowElement> = [];
            let entityCurrent = null;
            let entityPrevious = null;
            const GhostLayerStyle: L.PathOptions = {
                color: '#ff0000',
                fillColor: '#000000',
                fillOpacity: 0.50,
                weight: 5,
            };
            for (let revisionentity in entity.revisions) {
                // Prepare list with individual changes for revision
                let ulChanges = document.createElement('ul');
                const row: HTMLTableRowElement = document.createElement('tr');
                entityCurrent = entity.revisions[revisionentity];
                row.insertCell().innerText = entityCurrent.revision;
                row.insertCell().innerText = this.formatDate(entityCurrent.timeStamp, 'short', 'medium');
                row.insertCell().append(ulChanges);
                let diff = this.getEntityDifferences(entityCurrent, entityPrevious);
                // console.log('Differences', diff);
                for (let changeid in diff) {
                    let change = diff[changeid];
                    let li = document.createElement('li');
                    li.innerText = change['changeShort'];
                    let btn = L.DomUtil.create('button', 'desc-button');
                    btn.title = 'Show a detailed description about this change.';
                    btn.textContent = '?';
                    btn.onclick = () => {
                        divdescription.innerText = change['changeLong'];
                    };
                    // li.append(btn);
                    let a = document.createElement('a');
                    a.href = '#';
                    a.innerText = ' Show';
                    a.title = 'Show a detailed description about this change.';
                    a.onclick = () => {
                        divdescriptionheader.innerText = `Description of revision ${revisionentity}`;
                        divdescription.innerText = change['changeLong'];
                        let entityRevSelected = entity.revisions[revisionentity];
                        // console.log(entityRevSelected);
                        this._ghostLayers.clearLayers();
                        entityRevSelected.layer.setStyle(GhostLayerStyle);
                        this._ghostLayers.addLayer(entityRevSelected.layer);
                    };
                    li.append(a);
                    ulChanges.append(li);
                }
                rowsToAdd.push(row);
                entityPrevious = entityCurrent;
            }

            // Add all history-rows backwards
            rowsToAdd.slice().reverse().forEach(function(row) {
                tbody.append(row);
            });

            const backButton = document.createElement('button');
            backButton.innerHTML = 'Back';
            backButton.style.width = '200px';
            backButton.onclick = async (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.setMode('blur');
            };
            content.appendChild(backButton);
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

        if (this.isAreaTooBig(entity.toGeoJSON())) {
            alert("The area of the polygon is waaay to big. It will not be saved, please change it.");
            return;
        }

        // Update the entity with the response from the API
        const entityInResponse = await this._repository.updateEntity(entity);

        if (entityInResponse) {
            this.removeEntity(entity);
            this.addEntityToMap(entityInResponse);
        }
    }

    private UpdateOnScreenDisplay(entity: MapEntity | null, customMsg: string = null) {
        if (entity || customMsg) {
            let tooltipText = "";
            
            if (customMsg){
                tooltipText = customMsg;
            } else {
                tooltipText = entity.area + "m²";
    
                for (const rule of entity.getAllTriggeredRules()) {
                    if (rule.severity >= 2) {
                        // this.onScreenInfo.textContent = rule.shortMessage;
                        tooltipText += "<br>" + rule.shortMessage;
                    }
                }
            }

            this.sqmTooltip.openOn(this._map);
            this.sqmTooltip.setLatLng(entity.layer.getBounds().getCenter());
            this.sqmTooltip.setContent(tooltipText);
        } else {
            // this.onScreenInfo.textContent = "";
            this.sqmTooltip.close();
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
            alert("The area of the polygon is waaay to big. Draw something smaller.");
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
        }
    }

    private createEntityTooltip(entity: MapEntity) {
        let marker = new L.Marker(entity.layer.getBounds().getCenter(), {opacity: 0});
        marker.feature = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [0, 0],
            },
            properties: {},
        };
        marker.options.icon.options.iconSize = [1, 1];
        marker.bindTooltip(entity.name, { permanent: true, interactive: false, direction: 'center', className: 'name-tooltip' });
        entity.nameMarker = marker;
        return marker;
    }

    /** Adds the given map entity as an a editable layer to the map */
    private addEntityToMap(entity: MapEntity, checkRules: boolean = true) {
        this._currentRevisions[entity.id] = entity;
        // Bind the click-event of the editor to the layer
        entity.layer.on('click', ({ latlng }) => {
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
            if (this.isAreaTooBig(entity.toGeoJSON())) {
                alert("The area of the polygon is waaay to big. Draw something smaller, this wont be saved anyways.");
            }
        });

        entity.layer._layers[entity.layer._leaflet_id-1].on('drag', () => {
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
        if (entity == null) return;

        // Update name tooltip
        let a: L.Marker = entity.nameMarker;
        let posMarker = entity.nameMarker.getLatLng();
        let posEntity = entity.layer.getBounds().getCenter();
        if ((posEntity.lat != posMarker.lat) || (posEntity.lng != posMarker.lng)) {
            // console.log('entity pos changed');
            entity.nameMarker.setLatLng(posEntity);
        }
        if (entity.nameMarker._tooltip._content != entity.name) {
            // console.log('tooltip content changed', entity.nameMarker._tooltip);
            entity.nameMarker.setTooltipContent(entity.name);
        }
        var zoom = this._map.getZoom();
        if (zoom >= 19) {
            //@ts-ignore
            this._nameTooltips[entity.id]._tooltip.setOpacity(1);
        } else {
            //@ts-ignore
            this._nameTooltips[entity.id]._tooltip.setOpacity(0);
        }

        if (checkRules) entity.checkAllRules();
        entity.setLayerStyle(this._currentLayerFilterStyle);
    }

    private refreshAllEntities(checkRules: boolean = true) {
        for (const entityid in this._currentRevisions) {
            this.refreshEntity(this._currentRevisions[entityid], checkRules);
        }
    }

    private refreshEntitiesSlow(entitysToRefresh: Array<MapEntity>|null = null) {
        this.loadingScreenDescription('Validate entitys.');
        this.loadingScreenShow(true);
        if (entitysToRefresh) {
            this._validateEntitiesQueue = entitysToRefresh;
        } else {
            for (const entityid in this._currentRevisions) {
                this._validateEntitiesQueue.push(this._currentRevisions[entityid]);
            }
        }
        // console.log(`Prepped ${this._validateEntitiesQueue.length} entities for validation.`);
        this.validateSlowly();
    }

    // Slowly validate entities in chunks
    private validateSlowly() {
        let validated = 0;
        this.loadingScreenDescription(`${this._validateEntitiesQueue.length} entities left for validation by small bureaucrats.<br /><img src="img/hermes.png" height="48px" />`);
        while (this._validateEntitiesQueue.length > 0 && validated < 50) {
            let entity = this._validateEntitiesQueue.pop();
            validated = validated + 1;
            this.refreshEntity(entity, true);
        }

        // At end of validation cycle, check if done or to continue
        if (this._validateEntitiesQueue.length == 0) {
            this.loadingScreenDescription('Finished validating.');
            this.loadingScreenShow(false);
        } else {
            // Let the UI redraw by resting a while, then continue until validated
            setTimeout(() => {
                this.validateSlowly();
            }, 50)
        }
    }

    public setLayerFilter(filter: 'severity' | 'sound' | 'power', checkRules: boolean = true) {
        this._currentLayerFilterStyle = filter;
        this.refreshAllEntities(checkRules);
    }

    // Block crazy large areas
    private isAreaTooBig(geoJson: any) {
        const area = Turf.area(geoJson);
        
        if (area > 5000) return true;
        return false;   
    }

    private deleteAndRemoveEntity(entity: MapEntity, deleteReason: string = null) {
        this._selected = null;
        this.setMode('none');
        this.removeEntity(entity);
        this._repository.deleteEntity(entity, deleteReason);
    }

    private removeEntity(entity: MapEntity, roveInRepository:boolean=true) {
        // Remove name-tooltip
        entity.nameMarker.unbindTooltip();
        this._groups['names'].removeLayer(entity.nameMarker);
        entity.nameMarker = null;
        delete this._nameTooltips[entity.id];

        // Remove entity from layers
        this._placementLayers.removeLayer(entity.layer);
        this._placementBufferLayers.removeLayer(entity.bufferLayer);
        this._map.removeLayer(entity.layer);
        this._map.removeLayer(entity.bufferLayer);

        // Remove from current
        delete this._currentRevisions[entity.id];

        // Remove from repository
        if (roveInRepository) {
            this._repository.remove(entity);
        }
    }

    constructor(map: L.Map, groups: L.FeatureGroup) {
        // Keep track of the map
        this._map = map;

        this._groups = groups;

        //Create two separate layersgroups, so that we can use them to check overlaps separately
        this._placementLayers = new L.LayerGroup().addTo(map);
        this._placementBufferLayers = new L.LayerGroup().addTo(map);
        this._ghostLayers = new L.LayerGroup().addTo(map);

        //Place both in the same group so that we can toggle them on and off together on the map
        //@ts-ignore
        groups.placement = new L.LayerGroup().addTo(map);
        //@ts-ignore
        this._placementLayers.addTo(groups.placement);
        //@ts-ignore
        this._placementBufferLayers.addTo(groups.placement);

        this._validateEntitiesQueue = new Array<MapEntity>;

        this._lastEnityFetch = 0;
        this._autoRefreshIntervall = 90;  // Seconds

        this._currentRevisions = {};

        //Hide buffers when zoomed out
        var bufferLayers = this._placementBufferLayers;
        map.on('zoomend', function () {
            if (map.getZoom() >= 19) {
                bufferLayers.getLayers().forEach(function (layer) {
                    //@ts-ignore
                    layer.setStyle({ opacity: 1 });
                });
            } else {
                bufferLayers.getLayers().forEach(function (layer) {
                    //@ts-ignore
                    layer.setStyle({ opacity: 0 });
                });
            }
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
        this._map.pm.setGlobalOptions({ tooltips: false, allowSelfIntersection: false, snappable: true, draggable: true }); 

        // Add the event handler for newly created layers
        this._map.on('pm:create', this.onNewLayerCreated.bind(this));

        // Add a click event to the map to reset the editor status.
        this._map.on('click', (mouseEvent) => {
            console.log('[Editor]', 'Editor blur event fired (map click)', { mouseEvent });
            this.setMode('blur');
        });

        this.onScreenInfo = document.querySelector(".entity-onscreen-info");
        this.sqmTooltip = new L.Tooltip({ permanent: true, interactive: false, direction: 'center', className: 'shape-tooltip' });
        this.sqmTooltip.setLatLng([0, 0]);
        this.sqmTooltip.addTo(this._map);
        this.sqmTooltip.closeTooltip();
        this._nameTooltips = {};

        // Hide name tooltips when zoomed out
        map.on('zoomend', function () {
            var zoom = map.getZoom();
            this.groups['names'].getLayers().forEach(function (layer: any) {
                if (zoom >= 19) {
                    layer._tooltip.setOpacity(1);
                } else {
                    layer._tooltip.setOpacity(0);
                }
            });
        });

        document.onkeydown = (evt: Event) => {
            this.keyEscapeListener(evt);
        };

        // Add controls
        this.addHelpButton();

        // Add search control
        //@ts-ignore
        var searchControl = new L.Control.Search({
            layer: this._placementLayers,
            propertyName: 'name',
            marker: false,
            zoom: 19,
            initial: false
        });
        map.addControl(searchControl);
    }

    private addToggleEditButton() {
        const customButton = L.Control.extend({
            options: { position: 'bottomleft' },

            onAdd: () => {
                let btn = L.DomUtil.create('button', 'btn btn-gradient1 button-shake-animate');
                btn.title = 'Edit';
                btn.textContent = 'Edit';
                L.DomEvent.disableClickPropagation(btn);

                btn.onclick = () => {
                    this.toggleEditMode();
                    btn.textContent = this._isEditMode ? 'Done' : 'Edit';
                    btn.title = this._isEditMode ? 'Done' : 'Edit';
                };

                return btn;
            },
        });

        this._map.addControl(new customButton());
    }


    private addHelpButton() {
        const customButton = L.Control.extend({
            options: { position: 'topleft' },

            onAdd: () => {
                let btn = L.DomUtil.create('button', 'leaflet-bar help-button');
                btn.title = 'Guide to the placement process';
                btn.textContent = '❔';
                L.DomEvent.disableClickPropagation(btn);

                btn.onclick = () => {
                    window.open('/instructions', '_blank').focus();
                };

                return btn;
            },
        });

        this._map.addControl(new customButton());
    }

    private formatDate(timeStamp: any,
                        styleDate: "full" | "long" | "medium" | "short" = "short",
                        styleTime: "full" | "long" | "medium" | "short" = "short"): string {
        // let date = new Date(Date.parse(timeStamp + ' UTC'));
        let date = new Date(Date.parse(timeStamp));
        // console.log('date', date);
        let formatted: string = date.toLocaleString('sv', { dateStyle: styleDate, timeStyle: styleTime });
        // console.log('formatted', formatted);
        return formatted;
    }

    private getEntityDifferences(current: MapEntity, previous: MapEntity): Array<EntityDifferences> {
        let differences: Array<EntityDifferences> = [];
        // If previous entity is null it must be the first revision
        if (previous == null) {
            differences.push({ what: 'Created',
                                changeShort: 'Created',
                                changeLong: `Someone created this entity.`
                            });
            return differences;
        }

        // Go through all relevant properties and look for differences, list them verbosly under differences
        if (current.isDeleted != previous.isDeleted) {
            differences.push({ what: 'Deleted',
                                changeShort: 'Is Deleted',
                                changeLong: `Is Deleted due to ${current.deleteReason}.`
                            });
        }
        if (current.name != previous.name) {
            differences.push({ what: 'Name',
                                changeShort: 'Name Changed',
                                changeLong: `Someone changed the name from ${previous.name} to ${current.name}.`
                            });
        }
        if (current.description != previous.description) {
            differences.push({ what: 'Description',
                                changeShort: 'Description Changed',
                                changeLong: `Someone changed the description from ${previous.description} to ${current.description}.`
                            });
        }
        if (current.contactInfo != previous.contactInfo) {
            differences.push({ what: 'Contact Info',
                                changeShort: 'Contact Info Changed',
                                changeLong: `Someone changed the contact info from ${previous.contactInfo} to ${current.contactInfo}.`
                            });
        }
        if (current.nrOfPeople != previous.nrOfPeople) {
            differences.push({ what: 'NrOfPeople',
                                changeShort: 'NrOfPeople Changed',
                                changeLong: `Someone changed the number of people from ${previous.nrOfPeople} to ${current.nrOfPeople}.`
                            });
        }
        if (current.nrOfVehicles != previous.nrOfVehicles) {
            differences.push({ what: 'NrOfVehicles',
                                changeShort: 'NrOfVehicles Changed',
                                changeLong: `Someone changed the number of vehicles from ${previous.nrOfVehicles} to ${current.nrOfVehicles}.`
                            });
        }
        if (current.additionalSqm != previous.additionalSqm) {
            differences.push({ what: 'AdditionalSqm',
                                changeShort: 'AdditionalSqm Changed',
                                changeLong: `Someone changed additional Sqm from ${previous.additionalSqm} to ${current.additionalSqm}.`
                            });
        }
        if (current.powerNeed != previous.powerNeed) {
            differences.push({ what: 'PowerNeed',
                                changeShort: 'PowerNeed Changed',
                                changeLong: `Someone changed power need from ${previous.powerNeed} to ${current.powerNeed}.`
                            });
        }
        if (current.amplifiedSound != previous.amplifiedSound) {
            differences.push({ what: 'AmplifiedSound',
                                changeShort: 'AmplifiedSound Changed',
                                changeLong: `Someone changed amplified sound from ${previous.amplifiedSound} to ${current.amplifiedSound}.`
                            });
        }
        if (current.color != previous.color) {
            differences.push({ what: 'Color',
                                changeShort: 'Color Changed',
                                changeLong: `Someone changed color from ${previous.color} to ${current.color}.`
                            });
        }
        if (current.supressWarnings != previous.supressWarnings) {
            differences.push({ what: 'SupressWarnings',
                                changeShort: 'SupressWarnings Changed',
                                changeLong: `Someone changed supress warnings from ${previous.supressWarnings} to ${current.supressWarnings}.`
                            });
        }
        let currentGeoJson = JSON.stringify(current.toGeoJSON()['geometry']);
        let previousGeoJson = JSON.stringify(previous.toGeoJSON()['geometry']);
        if (currentGeoJson != previousGeoJson) {
            differences.push({ what: 'GeoJson',
                                changeShort: 'Polygon Changed',
                                changeLong: `Someone changed the polygon.`
                            });
        }
        if (differences.length == 0) {
            differences.push({ what: 'NoDifference',
                                changeShort: 'No difference',
                                changeLong: `No difference detected between revisions.`
                            });
        }
        return differences;
    }

    public async toggleEditMode() {
        this._isEditMode = !this._isEditMode;

        if (localStorage.getItem("hasSeenInstructions2") == null)
        {
            localStorage.setItem("hasSeenInstructions2", "true");

            // Show instructions when entering edit mode, and wait for the user 
            // to press a button on that screen before continuing
            if (this._isEditMode){
                await this.ShowInstructionsScreenAndWait();
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

    ShowInstructionsScreenAndWait() {
        return new Promise((resolve) => {
            const instructions = document.getElementById("editMsg");
            const pageOne = document.getElementById("pageOne");
            const pageTwo = document.getElementById("pageTwo");

            if (instructions != null && pageOne != null && pageTwo != null)
            {
                //Inactivate the customButton
                const customButton = document.querySelector(".placement-btn");
                customButton?.setAttribute("disabled", "");

                //Show the instructions screen
                instructions.removeAttribute("hidden");   
                
                //Create the content for pageOne
                const nextButton = document.createElement('button');
                //Center this button in its div
                nextButton.style.margin = "auto";
                nextButton.style.display = "block";
                nextButton.innerHTML = 'NEXT >';
                nextButton.onclick = (e) => {
                    pageOne.setAttribute("hidden", "");
                    pageTwo.removeAttribute("hidden");
                };
                pageOne.appendChild(nextButton);

                //Create the content for pageTwo
                const okButton = document.createElement('button');
                //Center this button in its div
                okButton.style.margin = "auto";
                okButton.style.display = "block";
                okButton.innerHTML = 'Let\'s go!';
                okButton.onclick = (e) => {
                    instructions.setAttribute("hidden", "");
                    customButton?.removeAttribute("disabled");
                    resolve(true);
                }
                pageTwo.appendChild(okButton);
            }
            else {
                resolve(true);
            }
        });
        
    }

    /** Add each existing map entity from the API as an editable layer */
    public async addAPIEntities() {
        this.loadingScreenShow(true);
        this.loadingScreenDescription('Load your drawn polygons from da interweb!');
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

        // Automatic refresh of entities after a minute
        setTimeout(() => {
            this.checkForUpdatedEntities();
        }, this._autoRefreshIntervall * 1000);

        this.addToggleEditButton();
    }

    // Atutomatically check for updates every minute or so
    private async checkForUpdatedEntities() {
        // Check for changed enities if not in edit mode
        if (this._isEditMode == false) {
            var now = new Date().getTime() / 1000;
            // If last check was performed too long ago, fetch again
            if ((now - this._lastEnityFetch) > this._autoRefreshIntervall) {
                this._lastEnityFetch = now;
                const changes: EntityChanges = await this._repository.reload();
                // console.log('checkForUpdatedEntities look for changed enities', changes);
                let changesToQueue:Array<MapEntity> = new Array<MapEntity>;
                let changesInformative:Array<string> = new Array<string>;
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
        }, 10000)
    }

    public gotoEntity(id: string) {
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

    public loadingScreenShow(show: boolean) {
        const loadingOverlay = document.getElementById('loading-box');
        if (show) {
            loadingOverlay.removeAttribute("hidden");
        } else {
            loadingOverlay.setAttribute("hidden", "");
        }
    }

    public loadingScreenHeader(header: string) {
        const loadingHeader = document.getElementById('loading-overlay-header');
        // console.log('loadingScreenHeader()', header);
        loadingHeader.innerText = header;
    }

    public loadingScreenDescription(description: string) {
        const loadingDescription = document.getElementById('loading-overlay-decription');
        // console.log('loadingScreenDescription()', description);
        loadingDescription.innerHTML = description;
    }
}
