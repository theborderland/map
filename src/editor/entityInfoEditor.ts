import L from "leaflet";
import { MapEntity, MapEntityRepository } from "../entities";
import * as Messages from '../messages';
import { formatDate } from "../utils";
import { EntityDifferences } from "../entities/entity";

export class EntityInfoEditor {
    private _entity: MapEntity;
    private _editEntityCallback: (action: string, entity?: MapEntity, extraInfo?: string) => void;
    private _repository: MapEntityRepository;
    private _ghostLayers: L.LayerGroup<any>;

    constructor(
        entity: MapEntity, 
        repository: MapEntityRepository,
        ghostLayers: L.LayerGroup<any>,
        editEntityCallback: (...args: any[]) => void
    ) {
        this._entity = entity;
        this._editEntityCallback = editEntityCallback;
        this._repository = repository;
        this._ghostLayers = ghostLayers;
    }

    public render(): void {
        Messages.showDrawer(
            {
                file: "edit-entity",
                position: "end",
                btnText: "Save",
                onBtnAction: () => {this._editEntityCallback("save");}
            },
            {},
            () => this.populate(this._entity));
    }

    private populate(entity: MapEntity): void {
        this.populateEditTab(entity);
        this.populatePowerTab(entity);
        this.populateHistoryTab(entity);
        this.populateAdvancedTab(entity);
    }

    private populateEditTab(entity: MapEntity) {
        let updateTextAboutNeededSpace = (entity: MapEntity, div: HTMLElement = null) => {
            let areaInfo = document.getElementById('entity-area-info');
            if (!areaInfo) {
                areaInfo = div;
            }
            areaInfo.innerHTML =
                'With this amount of people, vehicles and extra m² such as art, kitchen tents and structures, a suggested camp size is <b>' +
                entity?.calculatedAreaNeeded +
                'm²</b>. Currently the area is <b>' +
                entity?.area +
                'm².</b>';
        };

        const nameField = document.getElementById('entity-name') as HTMLInputElement;
        nameField.value = entity.name;
        nameField.oninput = () => {
            entity.name = nameField.value;
        };

        const descriptionField = document.getElementById('entity-description') as HTMLTextAreaElement;
        descriptionField.value = entity.description;
        descriptionField.oninput = () => {
            entity.description = descriptionField.value;
        };

        const contactField = document.getElementById('entity-contact') as HTMLInputElement;
        contactField.value = entity.contactInfo;
        contactField.oninput = () => {
            entity.contactInfo = contactField.value;
        };

        const peopleField = document.getElementById('entity-people') as HTMLInputElement;
        peopleField.value = String(entity.nrOfPeople);
        peopleField.oninput = () => {
            entity.nrOfPeople = Number(peopleField.value);
            updateTextAboutNeededSpace(entity);
        };

        const vehiclesField = document.getElementById('entity-vehicles') as HTMLInputElement;
        vehiclesField.value = String(entity.nrOfVehicles);
        vehiclesField.oninput = () => {
            entity.nrOfVehicles = Number(vehiclesField.value);
            updateTextAboutNeededSpace(entity);
        };

        const otherSqm = document.getElementById('entity-other-sqm') as HTMLInputElement;
        otherSqm.value = String(entity.additionalSqm);
        otherSqm.oninput = () => {
            entity.additionalSqm = Number(otherSqm.value);
            updateTextAboutNeededSpace(entity);
        };

        let areaInfo = document.getElementById('entity-area-info');
        updateTextAboutNeededSpace(entity, areaInfo);

        const soundField = document.getElementById('entity-sound') as HTMLInputElement;
        soundField.value = String(entity.amplifiedSound);
        soundField.oninput = () => {
            entity.amplifiedSound = Number(soundField.value);
        };
    }

    private populatePowerTab(entity: MapEntity) {
        const powerContactInfo = document.getElementById('entity-power-lead') as HTMLInputElement;
        powerContactInfo.value = entity.powerContactInfo;
        powerContactInfo.oninput = () => {
            entity.powerContactInfo = powerContactInfo.value;
        };

        const powerField = document.getElementById('entity-power-need') as HTMLInputElement;
        powerField.value = String(entity.powerNeed);
        powerField.oninput = () => {
            //@ts-ignore
            entity.powerNeed = powerField.value;
        };
    }

    private async populateHistoryTab(entity: MapEntity) {
        const entityId = document.getElementById('entity-id');
        const historyTable = document.getElementById('history-table');
        const historyDetail = document.getElementById('history-detail');
        const divdescriptionheader = document.getElementById('history-description-header');
        const entityRevisions = document.getElementById('entity-revisions');
        const entityLastEdited = document.getElementById('entity-last-edited');
        
        entityId.innerText = entity.id.toString();
        entityRevisions.innerText = entity.revision.toString();
        entityLastEdited.innerText = formatDate(entity.timeStamp);

        const divdescription = document.createElement('div');
        divdescription.id = 'change-description';
        historyDetail.append(divdescription);

        const table: HTMLTableElement = document.createElement('table');
        
        const thead = table.createTHead();
        const theadrow: HTMLTableRowElement = thead.insertRow();
        theadrow.insertCell().innerText = 'Rev.';
        theadrow.insertCell().innerText = 'Timestamp';
        theadrow.insertCell().innerText = 'What Changed';
        const tbody = table.createTBody();
        
        // Get revisions and create tale rows for each revision
        await this._repository.getRevisionsForEntity(entity);

        let rowsToAdd: Array<HTMLTableRowElement> = [];
        let entityCurrent = null;
        let entityPrevious = null;
        const GhostLayerStyle: L.PathOptions = {
                    color: '#ff0000',
                    fillColor: '#000000',
                    fillOpacity: 0.5,
                    weight: 5,
                };
        for (let revisionentity in entity.revisions) {
            // Prepare list with individual changes for revision
            let ulChanges = document.createElement('ul');
            const row: HTMLTableRowElement = document.createElement('tr');
            entityCurrent = entity.revisions[revisionentity];
            row.insertCell().innerText = entityCurrent.revision;
            row.insertCell().innerText = formatDate(entityCurrent.timeStamp, 'short', 'medium');
            row.insertCell().append(ulChanges);

            let diff = this.getEntityDifferences(entityCurrent, entityPrevious);
            // console.log('Differences', diff);
            for (let changeid in diff) {
                let change = diff[changeid];
                let li = document.createElement('li');
                li.innerText = change['changeShort'];

                const inspectIcon = document.createElement('sl-icon');
                inspectIcon.setAttribute("name", "eye")
                inspectIcon.style.fontSize = "medium";

                let a = document.createElement('a');
                a.style.float = "right";
                a.href = '#';
                a.title = 'Show a detailed description about this change.';
                a.appendChild(inspectIcon);
                a.onclick = () => {
                    let entityRevSelected = entity.revisions[revisionentity];
                    divdescriptionheader.innerText = `Description of revision ${revisionentity}`;
                    divdescription.innerText = `${change['changeLong']}\n\n`;
                    // Restore buttons
                    let btnRestoreDetails = L.DomUtil.create('button', 'history-button');
                    btnRestoreDetails.title = `Restores detailes from revision ${revisionentity}.`;
                    btnRestoreDetails.textContent = '⚠ Restore Details';
                    btnRestoreDetails.onclick = () => {
                        console.log(`Restores detailes from revision ${revisionentity}.`);
                        entity.name = entity.revisions[revisionentity].name;
                        entity.description = entity.revisions[revisionentity].description;
                        entity.contactInfo = entity.revisions[revisionentity].contactInfo;
                        entity.nrOfPeople = entity.revisions[revisionentity].nrOfPeople;
                        entity.nrOfVehicles = entity.revisions[revisionentity].nrOfVehicles;
                        entity.additionalSqm = entity.revisions[revisionentity].additionalSqm;
                        entity.powerNeed = entity.revisions[revisionentity].powerNeed;
                        entity.amplifiedSound = entity.revisions[revisionentity].amplifiedSound;
                        entity.color = entity.revisions[revisionentity].color;
                        entity.supressWarnings = entity.revisions[revisionentity].supressWarnings;
                    };
                    divdescription.append(btnRestoreDetails);
                    let btnRestoreShape = L.DomUtil.create('button', 'history-button');
                    btnRestoreShape.title = `Restores shape from revision ${revisionentity}.`;
                    btnRestoreShape.textContent = '⚠ Restore Shape';
                    btnRestoreShape.onclick = () => {
                        console.log(`Restores shape from revision ${revisionentity}.`);
                        this._editEntityCallback("restore", entity, revisionentity);
                    };
                    divdescription.append(btnRestoreShape);
                    // Draw ghosted shape of selected revision
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
        rowsToAdd
            .slice()
            .reverse()
            .forEach(function (row) {
                tbody.append(row);
            });
            
        // Add fully built table to DOM
        historyTable.appendChild(table);
    }

    private populateAdvancedTab(entity: MapEntity) {
        const link = document.getElementsByClassName('entity-link') as HTMLCollectionOf<HTMLAnchorElement>;
        for (let i = 0; i < link.length; i++) {
            link[i].href = "?id=" + entity.id;
        }

        const supressWarnings = document.getElementById('entity-supress-warnings') as HTMLInputElement;
        supressWarnings.checked = entity.supressWarnings;
        supressWarnings.onchange = () => {
            entity.supressWarnings = supressWarnings.checked;
            //refreshEntity(entity);
        };

        const colorPicker = document.getElementById('entity-color') as HTMLInputElement;
        colorPicker.value = entity.color;
        colorPicker.onchange = () => {
            entity.color = colorPicker.value;
            entity.setLayerStyle();
        };

        const deleteButton = document.getElementById('entity-delete') as HTMLButtonElement;
        deleteButton.onclick = () => {
            let deleteReason = prompt('Are you really sure you should delete this area? Answer why.', '');
            if (deleteReason == null || deleteReason == '') {
                return;
            }
            console.log('Delete yes, deleteReason', deleteReason);
            this._editEntityCallback("delete", entity, deleteReason);
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
}