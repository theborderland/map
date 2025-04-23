import L from "leaflet";
import { MapEntity, MapEntityRepository } from "../entities";
import * as Messages from '../messages';
import { formatDate } from "../utils";
import { Appliance, EntityDifferences } from "../entities/entity";

export class EntityInfoEditor {
    private _entity: MapEntity;
    private _editEntityCallback: (action: string, entity?: MapEntity, extraInfo?: string) => void;
    private _repository: MapEntityRepository;
    private _ghostLayers: L.LayerGroup<any>;
    private _largeCampPeopleLimit: number = 25;
    private _largeCampPowerConsumtionLimit: number = 5000;

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
                onBtnAction: () => { this._editEntityCallback("save", this._entity); }
            },
            {},
            () => this.populate());
    }

    private populate(): void {
        this.preChecks();
        this.populateEditTab();
        this.populatePowerTab();
        this.populateHistoryTab();
        this.populateAdvancedTab();
    }

    private preChecks() {
        this.checkIfLargeCamp();
    }
        
    private checkIfLargeCamp() {
        // Requirement came from power realities team
        const powerImage = document.getElementById('power-image-url') as HTMLInputElement;

        if (this._entity.nrOfPeople >= this._largeCampPeopleLimit ||
            this._entity.powerNeed >= this._largeCampPowerConsumtionLimit) {
            powerImage.parentElement.style.display = "block";
        } else {
            powerImage.parentElement.style.display = "none";
        }

    }

    private populateEditTab() {
        let updateTextAboutNeededSpace = () => {
            let area = document.getElementById('entity-area');
            let areaNeeded = document.getElementById('entity-calculated-area-needed');
            areaNeeded.innerText = String(this._entity?.calculatedAreaNeeded);
            area.innerText = String(this._entity?.area);
        };

        const nameField = document.getElementById('entity-name') as HTMLInputElement;
        nameField.value = this._entity.name;
        nameField.oninput = () => {
            this._entity.name = nameField.value;
        };

        const descriptionField = document.getElementById('entity-description') as HTMLTextAreaElement;
        descriptionField.value = this._entity.description;
        descriptionField.oninput = () => {
            this._entity.description = descriptionField.value;
        };

        const contactField = document.getElementById('entity-contact') as HTMLInputElement;
        contactField.value = this._entity.contactInfo;
        contactField.oninput = () => {
            this._entity.contactInfo = contactField.value;
        };

        const peopleField = document.getElementById('entity-people') as HTMLInputElement;
        peopleField.value = String(this._entity.nrOfPeople);
        peopleField.oninput = () => {
            this._entity.nrOfPeople = Number(peopleField.value);
            updateTextAboutNeededSpace();
            this.checkIfLargeCamp()
        };

        const vehiclesField = document.getElementById('entity-vehicles') as HTMLInputElement;
        vehiclesField.value = String(this._entity.nrOfVehicles);
        vehiclesField.oninput = () => {
            this._entity.nrOfVehicles = Number(vehiclesField.value);
            updateTextAboutNeededSpace();
        };

        const otherSqm = document.getElementById('entity-other-sqm') as HTMLInputElement;
        otherSqm.value = String(this._entity.additionalSqm);
        otherSqm.oninput = () => {
            this._entity.additionalSqm = Number(otherSqm.value);
            updateTextAboutNeededSpace();
        };

        const soundField = document.getElementById('entity-sound') as HTMLInputElement;
        soundField.value = String(this._entity.amplifiedSound);
        soundField.oninput = () => {
            this._entity.amplifiedSound = Number(soundField.value);
        };

        updateTextAboutNeededSpace();
    }

    private populatePowerTab() {
        const techContactInfo = document.getElementById('entity-tech-lead') as HTMLInputElement;
        techContactInfo.value = this._entity.powerContactInfo;
        techContactInfo.oninput = () => {
            this._entity.powerContactInfo = techContactInfo.value;
        };

        const powerPlugType = document.getElementById('power-plug-type') as HTMLSelectElement;
        powerPlugType.value = this._entity.powerPlugType;
        powerPlugType.addEventListener('sl-change', () => {
            this._entity.powerPlugType = powerPlugType.value;
        });

        const powerDescription = document.getElementById('power-description') as HTMLInputElement;
        powerDescription.value = this._entity.powerDescription;
        powerDescription.oninput = () => {
            this._entity.powerDescription = powerDescription.value;
        };

        const powerImage = document.getElementById('power-image-url') as HTMLInputElement;
        powerImage.value = this._entity.powerImageUrl;
        powerImage.oninput = () => {
            this._entity.powerImageUrl = powerImage.value;
        }

        const powerForm = document.getElementById('power-form') as HTMLFormElement;
        powerForm.onsubmit = (event: Event) => {
            event.preventDefault();
            let applianceInput = document.getElementById("appliance") as HTMLInputElement;
            let amountInput = document.getElementById("amount") as HTMLInputElement;
            let wattInput = document.getElementById("watt") as HTMLInputElement;
            let appliance = applianceInput.value;
            let amount = Number(amountInput.value);
            let watt = Number(wattInput.value);
            if (!appliance || amount < 1 || watt < 1) {
                return;
            }
            this.addRowToTable(appliance, amount, watt);
            this.updateEntityWithAddedAppliances();
            this.calculateTotalPower();
            powerForm.reset();
            applianceInput.focus();
        };

        // Add existing entity appliances to table
        for (let i = 0; i < this._entity.powerAppliances.length; i++) {
            const item = this._entity.powerAppliances[i];
            this.addRowToTable(item.name, item.amount, item.watt);
        }

        const totalPowerField = document.getElementById('entity-power-need') as HTMLSpanElement;
        totalPowerField.innerText = String(this._entity.powerNeed);
    }

    private async populateHistoryTab() {
        const entityId = document.getElementById('entity-id');
        const historyTable = document.getElementById('history-table');
        const historyDetail = document.getElementById('history-detail');
        const divdescriptionheader = document.getElementById('history-description-header');
        const entityRevisions = document.getElementById('entity-revisions');
        const entityLastEdited = document.getElementById('entity-last-edited');

        entityId.innerText = this._entity.id.toString();
        entityRevisions.innerText = this._entity.revision.toString();
        entityLastEdited.innerText = formatDate(this._entity.timeStamp);

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
        await this._repository.getRevisionsForEntity(this._entity);

        let rowsToAdd: Array<HTMLTableRowElement> = [];
        let entityCurrent = null;
        let entityPrevious = null;
        const GhostLayerStyle: L.PathOptions = {
            color: '#ff0000',
            fillColor: '#000000',
            fillOpacity: 0.5,
            weight: 5,
        };
        for (let revisionentity in this._entity.revisions) {
            // Prepare list with individual changes for revision
            let ulChanges = document.createElement('ul');
            const row: HTMLTableRowElement = document.createElement('tr');
            entityCurrent = this._entity.revisions[revisionentity];
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
                inspectIcon.style.marginRight = "10px";

                let a = document.createElement('a');
                a.style.float = "right";
                a.href = '#';
                a.title = 'Show a detailed description about this change.';
                a.appendChild(inspectIcon);
                a.onclick = () => {
                    let entityRevSelected = this._entity.revisions[revisionentity];
                    divdescriptionheader.innerText = `Description of revision ${revisionentity}`;
                    divdescription.innerText = `${change['changeLong']}\n\n`;
                    // Restore buttons
                    let btnRestoreDetails = L.DomUtil.create('button', 'history-button');
                    btnRestoreDetails.title = `Restores detailes from revision ${revisionentity}.`;
                    btnRestoreDetails.textContent = '⚠ Restore Details';
                    btnRestoreDetails.onclick = () => {
                        console.log(`Restores detailes from revision ${revisionentity}.`);
                        this._entity.name = this._entity.revisions[revisionentity].name;
                        this._entity.description = this._entity.revisions[revisionentity].description;
                        this._entity.contactInfo = this._entity.revisions[revisionentity].contactInfo;
                        this._entity.nrOfPeople = this._entity.revisions[revisionentity].nrOfPeople;
                        this._entity.nrOfVehicles = this._entity.revisions[revisionentity].nrOfVehicles;
                        this._entity.additionalSqm = this._entity.revisions[revisionentity].additionalSqm;
                        this._entity.amplifiedSound = this._entity.revisions[revisionentity].amplifiedSound;
                        this._entity.color = this._entity.revisions[revisionentity].color;
                        this._entity.supressWarnings = this._entity.revisions[revisionentity].supressWarnings;
                        this._entity.powerContactInfo = this._entity.revisions[revisionentity].powerContactInfo;
                        this._entity.powerPlugType = this._entity.revisions[revisionentity].powerPlugType;
                        this._entity.powerDescription = this._entity.revisions[revisionentity].powerDescription;
                        this._entity.powerImageUrl = this._entity.revisions[revisionentity].powerImageUrl;
                        this._entity.powerNeed = this._entity.revisions[revisionentity].powerNeed;
                        this._entity.powerAppliances = this._entity.revisions[revisionentity].powerAppliances;
                        
                        // clear a few elements before populating again
                        historyTable.textContent = '';
                        divdescriptionheader.textContent = '';
                        divdescription.remove();
                        
                        this.populate();
                    };
                    divdescription.append(btnRestoreDetails);
                    let btnRestoreShape = L.DomUtil.create('button', 'history-button');
                    btnRestoreShape.title = `Restores shape from revision ${revisionentity}.`;
                    btnRestoreShape.textContent = '⚠ Restore Shape';
                    btnRestoreShape.onclick = () => {
                        console.log(`Restores shape from revision ${revisionentity}.`);
                        this._editEntityCallback("restore", this._entity, revisionentity);
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

    private populateAdvancedTab() {
        const link = document.getElementsByClassName('entity-link') as HTMLCollectionOf<HTMLAnchorElement>;
        for (let i = 0; i < link.length; i++) {
            link[i].href = "?id=" + this._entity.id;
        }

        const supressWarnings = document.getElementById('entity-supress-warnings') as HTMLInputElement;
        supressWarnings.checked = this._entity.supressWarnings;
        supressWarnings.onchange = () => {
            this._entity.supressWarnings = supressWarnings.checked;
            //refreshEntity(entity);
        };

        const colorPicker = document.getElementById('entity-color') as HTMLInputElement;
        colorPicker.value = this._entity.color;
        colorPicker.onchange = () => {
            this._entity.color = colorPicker.value;
            this._entity.setLayerStyle();
        };

        const deleteButton = document.getElementById('entity-delete') as HTMLButtonElement;
        deleteButton.onclick = () => {
            let deleteReason = prompt('Are you really sure you should delete this area? Answer why.', '');
            if (deleteReason == null || deleteReason == '') {
                return;
            }
            console.log('Delete yes, deleteReason', deleteReason);
            this._editEntityCallback("delete", this._entity, deleteReason);
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
            'amplifiedSound',
            'color',
            'supressWarnings',
            'powerContactInfo',
            'powerPlugType',
            'powerDescription',
            'powerImageUrl',
            'powerNeed'
        ];

        basicPropertiesToCheck.forEach(prop => {
            if (current[prop] != previous[prop]) {
                differences.push({
                    what: prop,
                    changeShort: `${prop}`,
                    changeLong: `Someone changed ${prop} from ${previous[prop]} to ${current[prop]}.`,
                });
            }
        });

        // Handle specific properties
        if (current.powerAppliances.length != previous.powerAppliances.length) {
            differences.push({
                what: 'PowerAppliances',
                changeShort: 'Power Appliances',
                changeLong: `Someone changed the number of power appliances from ${previous.powerAppliances.length} to ${current.powerAppliances.length}.`,
            });
        }

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
                changeShort: 'Polygon',
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

    private addRowToTable(appliance: string, amount: Number, watt: Number) {
        let table = document.getElementById("power-table") as HTMLTableElement;
        let row = table.insertRow(2); // row 1 is the initial input boxes
        let values = [appliance, amount, watt];
        let types = ["text", "number", "number"]

        for (let i = 0; i < 3; i++) {
            const input = document.createElement("sl-input") as HTMLInputElement;
            input.setAttribute("size", "small");
            input.setAttribute("no-spin-buttons", "");
            input.type = types[i];
            // @ts-ignore
            input.value = values[i];
            input.onblur = () => {
                this.updateEntityWithAddedAppliances();
                this.calculateTotalPower();
            }

            let cell = row.insertCell();
            cell.appendChild(input);
        }
        let deleteCell = row.insertCell();
        this.addDeleteRowButton(deleteCell);
    }

    private addDeleteRowButton(cell: HTMLTableCellElement) {
        let tooltip = document.createElement("sl-tooltip");
        let button = document.createElement("sl-button");
        let icon = document.createElement("sl-icon");

        tooltip.setAttribute("content", "Delete");
        button.setAttribute("variant", "danger");
        button.setAttribute("size", "small");
        button.setAttribute("outline", "");
        icon.setAttribute("slot", "prefix");
        icon.setAttribute("name", "x-lg");

        button.onclick = (e) => {
            let tr = e.target.closest("tr");
            if (tr) {
                tr.remove();
                this.updateEntityWithAddedAppliances();
                this.calculateTotalPower();
            }
        };

        button.appendChild(icon);
        tooltip.appendChild(button);
        cell.appendChild(tooltip);
    }

    private calculateTotalPower() {
        let totalWatt = 0;
        let appliances = this._entity.powerAppliances
        for (let i = 0; i < appliances.length; i++) {
            totalWatt += appliances[i].amount * appliances[i].watt;
        }

        let totalPowerField = document.getElementById("entity-power-need") as HTMLSpanElement;
        totalPowerField.innerText = totalWatt.toString();

        this._entity.powerNeed = totalWatt;
        this.checkIfLargeCamp();
        return totalWatt;
    }

    private updateEntityWithAddedAppliances() {
        // Easiest to just empty the array and add all again.
        let appliances = this.getAppliancesFromUi()
        this._entity.powerAppliances = [];
        for (let i = 0; i < appliances.length; i++) {
            this._entity.powerAppliances.push(appliances[i]);
        }
    }

    private getAppliancesFromUi(): Array<Appliance> {
        let appliances: Array<Appliance> = [];
        let table = document.getElementById("power-table") as HTMLTableElement;
        let allAddedAppliancesRows = table.querySelectorAll('tbody tr:not(:first-child)'); // // row 1 is the initial input boxes

        for (let i = 0; i < allAddedAppliancesRows.length; i++) {
            const row = allAddedAppliancesRows[i];
            // DOM structure is tr-td-input
            appliances.push({
                name: row.childNodes[0].firstChild.value,
                amount: row.childNodes[1].firstChild.value,
                watt: row.childNodes[2].firstChild.value,
            });
        }

        return appliances;
    }
}
