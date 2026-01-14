import L from "leaflet";
import { MapEntity, MapEntityRepository } from "../entities";
import * as Messages from '../messages';
import { formatDate } from "../utils";
import { Appliance, EntityDifferences } from "../entities/entity";

interface InputFields {
    areaType: HTMLSelectElement;
    name: HTMLInputElement;
    description: HTMLTextAreaElement;
    contactInfo: HTMLInputElement;
    nrOfPeople: HTMLInputElement;
    nrOfVehicles: HTMLInputElement;
    additionalSqm: HTMLInputElement;
    amplifiedSound: HTMLInputElement;
    areaNeedPower: HTMLInputElement;
    powerContactInfo: HTMLInputElement;
    powerPlugType: HTMLSelectElement;
    powerExtraInfo: HTMLInputElement;
    powerImageUrl: HTMLInputElement;
    powerNeed: HTMLSpanElement;
    supressWarnings: HTMLInputElement;
}

export class EntityInfoEditor {
    private _entity: MapEntity;
    private _editEntityCallback: (action: string, extraInfo?: string) => void;
    private _repository: MapEntityRepository;
    private _compareRevDiffLayer: L.LayerGroup<any>;
    private _largeCampPeopleLimit: number = 25;
    private _largeCampPowerConsumtionLimit: number = 5000;
    private _inputFields: InputFields;

    constructor(
        entity: MapEntity,
        repository: MapEntityRepository,
        compareRevDiffLayer: L.LayerGroup<any>,
        editEntityCallback: (...args: any[]) => void
    ) {
        this._entity = entity;
        this._editEntityCallback = editEntityCallback;
        this._repository = repository;
        this._compareRevDiffLayer = compareRevDiffLayer;
    }

    public render(): void {
        Messages.showDrawer(
            {
                file: "edit-entity",
                position: "end",
                onClose: () => { this._editEntityCallback("cancel"); },
                buttons: [
                    {
                        text: 'Save',
                        variant: 'primary',
                        onClickAction: () => {
                            this.saveEntityChanges();
                        },
                        shouldCloseDrawer: true
                    },
                    {
                        text: 'Cancel',
                        variant: 'neutral',
                        onClickAction: () => {
                            this._editEntityCallback("cancel");
                        },
                        shouldCloseDrawer: true
                    }
                ]
            },
            {},
            () => this.populate());
    }

    private populate(): void {
        // We can only get the fields after the drawer content has been loaded
        this._inputFields = {
            areaType: document.getElementById('entity-area-type') as HTMLSelectElement,
            name: document.getElementById('entity-name') as HTMLInputElement,
            description: document.getElementById('entity-description') as HTMLTextAreaElement,
            contactInfo: document.getElementById('entity-contact') as HTMLInputElement,
            nrOfPeople: document.getElementById('entity-people') as HTMLInputElement,
            nrOfVehicles: document.getElementById('entity-vehicles') as HTMLInputElement,
            additionalSqm: document.getElementById('entity-other-sqm') as HTMLInputElement,
            amplifiedSound: document.getElementById('entity-sound') as HTMLInputElement,
            areaNeedPower: document.getElementById('entity-area-need-power') as HTMLInputElement,
            powerContactInfo: document.getElementById('entity-tech-lead') as HTMLInputElement,
            powerPlugType: document.getElementById('power-plug-type') as HTMLSelectElement,
            powerExtraInfo: document.getElementById('power-extra-info') as HTMLInputElement,
            powerImageUrl: document.getElementById('power-image-url') as HTMLInputElement,
            powerNeed: document.getElementById('entity-total-power-needed') as HTMLSpanElement,
            // powerAppliances: this.getAppliancesFromUi(),
            supressWarnings: document.getElementById('entity-supress-warnings') as HTMLInputElement,
        }

        this.preChecks();
        this.populateEditTab();
        this.populatePowerTab();
        this.populateHistoryTab();
        this.populateAdvancedTab();
    }

    private preChecks() {
        this.checkIfLargeCamp(this._entity);
    }

    // Requirement came from power realities team
    private checkIfLargeCamp(entity: MapEntity = null) {
        let fields = entity ?? this.getNewFieldValues();

        const powerDiagramSection = this._inputFields.powerImageUrl.parentElement; // parentElement is the section element
        if (!fields.areaNeedPower) {
            powerDiagramSection.classList.add('hidden');
            return;
        }

        if (fields.nrOfPeople >= this._largeCampPeopleLimit ||
            fields.powerNeed >= this._largeCampPowerConsumtionLimit) {
            powerDiagramSection.classList.remove('hidden');
        } else {
            powerDiagramSection.classList.add('hidden');
        }
    }

    private getNewFieldValues(): any {
        // This is just a dummy MapEntity to hold the new values
        // @ts-ignore
        let entity: MapEntity = new MapEntity({ geoJson: this._entity.geoJson }, this._entity._rules);

        entity.areaType = this._inputFields.areaType.value;
        entity.name = this._inputFields.name.value;
        entity.description = this._inputFields.description.value;
        entity.contactInfo = this._inputFields.contactInfo.value;
        entity.nrOfPeople = Number(this._inputFields.nrOfPeople.value);
        entity.nrOfVehicles = Number(this._inputFields.nrOfVehicles.value);
        entity.additionalSqm = Number(this._inputFields.additionalSqm.value);
        entity.amplifiedSound = Number(this._inputFields.amplifiedSound.value);
        entity.areaNeedPower = this._inputFields.areaNeedPower.checked;
        entity.powerContactInfo = this._inputFields.powerContactInfo.value;
        entity.powerPlugType = this._inputFields.powerPlugType.value;
        entity.powerExtraInfo = this._inputFields.powerExtraInfo.value;
        entity.powerImageUrl = this._inputFields.powerImageUrl.value;
        entity.powerNeed = Number(this._inputFields.powerNeed.innerText);
        entity.powerAppliances = this.getAppliancesFromUi();
        entity.supressWarnings = this._inputFields.supressWarnings.checked;

        return entity;
    }

    private saveEntityChanges() {
        let entityChanges: MapEntity = { ...this.getNewFieldValues() };
        this._entity.updateEntity(entityChanges);
        this._editEntityCallback("save");
    }

    private updateTextAboutNeededSpace() {
        let fields = this.getNewFieldValues();
        let areaElem = document.getElementById('entity-area');
        let areaNeededElem = document.getElementById('entity-calculated-area-needed');
        areaNeededElem.innerText = String(fields?.calculatedAreaNeeded);
        areaElem.innerText = String(fields?.area);
    }

    private populateEditTab() {
        this._inputFields.areaType.value = this._entity.areaType;
        this._inputFields.name.value = this._entity.name;
        this._inputFields.description.value = this._entity.description;
        this._inputFields.contactInfo.value = this._entity.contactInfo;
        this._inputFields.nrOfPeople.value = String(this._entity.nrOfPeople);
        this._inputFields.nrOfVehicles.value = String(this._entity.nrOfVehicles);
        this._inputFields.additionalSqm.value = String(this._entity.additionalSqm);
        this._inputFields.amplifiedSound.value = String(this._entity.amplifiedSound);
        
        this._inputFields.nrOfPeople.oninput = () => {
            this.updateTextAboutNeededSpace();
            this.checkIfLargeCamp();
        };
        this._inputFields.nrOfVehicles.oninput = () => {
            this.updateTextAboutNeededSpace();
        };
        this._inputFields.additionalSqm.oninput = () => {
            this.updateTextAboutNeededSpace();
        };
        this._inputFields.amplifiedSound.onblur = (e) => {
            let soundGuideLink = document.getElementById('sound-guide-link') as HTMLDivElement;
            // @ts-ignore
            if (e.target.valueAsNumber > 0) {
                soundGuideLink.classList.remove('hidden');
            } else {
                soundGuideLink.classList.add('hidden');
            }
        };

        this.updateTextAboutNeededSpace();
    }

    private populatePowerTab() {
        let togglePowerSection = () => {
            let powerSections = document.querySelectorAll('.power-toggle') as NodeListOf<HTMLElement>;
            powerSections.forEach((section) => {
                this._entity.areaNeedPower ? section.classList.remove("hidden") : section.classList.add("hidden");
            });
        };
        let validatePowerImageUrl = (powerImage: HTMLInputElement) => {
            let icons = powerImage.querySelectorAll("sl-icon");
            let validUrl = powerImage.value != "";
            icons.forEach((icon) => {
                validUrl ? icon.classList.add("hidden") : icon.classList.remove("hidden");
            });
        };

        this._inputFields.areaNeedPower.checked = this._entity.areaNeedPower;
        this._inputFields.powerContactInfo.value = this._entity.powerContactInfo;
        this._inputFields.powerPlugType.value = this._entity.powerPlugType;
        this._inputFields.powerExtraInfo.value = this._entity.powerExtraInfo;
        this._inputFields.powerImageUrl.value = this._entity.powerImageUrl;
        this._inputFields.powerNeed.innerText = String(this._entity.powerNeed);
        
        this._inputFields.areaNeedPower.addEventListener('sl-input', () => {
            togglePowerSection();
            this.checkIfLargeCamp();
        });
        this._inputFields.powerImageUrl.onblur = (e) => {
            // @ts-ignore
            validatePowerImageUrl(e.target.value);
        }

        // Handle adding new appliances
        const powerForm = document.getElementById('power-form') as HTMLFormElement;
        powerForm.onsubmit = (event: Event) => {
            event.preventDefault();
            let applianceInput = document.getElementById("appliance") as HTMLInputElement;
            let amountInput = document.getElementById("amount") as HTMLInputElement;
            let wattInput = document.getElementById("watt") as HTMLInputElement;
            let name = applianceInput.value;
            let amount = Math.ceil(Number(amountInput.value));
            let watt = Math.ceil(Number(wattInput.value));
            if (!name || amount < 1 || watt < 1) {
                return;
            }
            this.addApplianceToContainer([name, amount, watt]);
            this.calculateTotalPower();
            powerForm.reset();
            applianceInput.focus();
        };

        // Add existing entity appliances (loop backwards since we want the last added item on top.)
        for (var i = this._entity.powerAppliances.length; i--;) {
            const item = this._entity.powerAppliances[i];
            this.addApplianceToContainer(Object.values(item));
        }
        togglePowerSection();
        validatePowerImageUrl(this._inputFields.powerImageUrl);
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
                        this._entity.areaType = this._entity.revisions[revisionentity].areaType;
                        this._entity.name = this._entity.revisions[revisionentity].name;
                        this._entity.description = this._entity.revisions[revisionentity].description;
                        this._entity.contactInfo = this._entity.revisions[revisionentity].contactInfo;
                        this._entity.nrOfPeople = this._entity.revisions[revisionentity].nrOfPeople;
                        this._entity.nrOfVehicles = this._entity.revisions[revisionentity].nrOfVehicles;
                        this._entity.additionalSqm = this._entity.revisions[revisionentity].additionalSqm;
                        this._entity.amplifiedSound = this._entity.revisions[revisionentity].amplifiedSound;
                        this._entity.supressWarnings = this._entity.revisions[revisionentity].supressWarnings;
                        this._entity.powerContactInfo = this._entity.revisions[revisionentity].powerContactInfo;
                        this._entity.powerPlugType = this._entity.revisions[revisionentity].powerPlugType;
                        this._entity.powerExtraInfo = this._entity.revisions[revisionentity].powerExtraInfo;
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
                        this._editEntityCallback("restore", revisionentity);
                    };
                    divdescription.append(btnRestoreShape);
                    // Draw ghosted shape of selected revision
                    this._compareRevDiffLayer.clearLayers();
                    //@ts-ignore
                    entityRevSelected.layer.setStyle(GhostLayerStyle);
                    this._compareRevDiffLayer.addLayer(entityRevSelected.layer);
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

        this._inputFields.supressWarnings.checked = this._entity.supressWarnings;

        const deleteButton = document.getElementById('entity-delete') as HTMLButtonElement;
        deleteButton.onclick = () => {
            let deleteReason = prompt('Are you really sure you should delete this area? Answer why.', '');
            if (deleteReason == null || deleteReason == '') {
                return;
            }
            console.log('Delete yes, deleteReason', deleteReason);
            Messages.hideDrawer();
            this._editEntityCallback("delete", deleteReason);
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
            'areaType',
            'name',
            'description',
            'contactInfo',
            'nrOfPeople',
            'nrOfVehicles',
            'additionalSqm',
            'amplifiedSound',
            'supressWarnings',
            'powerContactInfo',
            'powerPlugType',
            'powerExtraInfo',
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

    /**
     * @param values Should be [name, amount, watt]
     */
    private addApplianceToContainer(values: Array<any>) {
        let container = document.getElementById("power-items-container") as HTMLDivElement;
        let row = document.createElement("div");
        row.classList.add("power-item");
        row.classList.add("flex-row");
        let types = ["text", "number", "number"];

        for (let i = 0; i < 3; i++) {
            const input = document.createElement("sl-input") as HTMLInputElement;
            input.setAttribute("size", "small");
            input.setAttribute("no-spin-buttons", "");
            input.type = types[i];
            // @ts-ignore
            input.value = values[i];
            input.onblur = () => {
                this.calculateTotalPower();
            }

            row.appendChild(input);
        }
        this.addDeleteButton(row);
        container.prepend(row); // Add item on top of the list
    }

    private addDeleteButton(cell: HTMLElement) {
        let button = document.createElement("sl-button");
        let icon = document.createElement("sl-icon");

        button.setAttribute("variant", "danger");
        button.setAttribute("size", "small");
        button.setAttribute("outline", "");
        icon.setAttribute("slot", "prefix");
        icon.setAttribute("name", "x-lg");

        button.onclick = (e) => {
            let row = (e.target as Element).closest(".power-item");
            if (row) {
                row.remove();
                this.calculateTotalPower();
            }
        };

        button.appendChild(icon);
        cell.appendChild(button);
    }

    private calculateTotalPower() {
        let appliances = this.getAppliancesFromUi();
        let totalWatt = 0;
        for (let i = 0; i < appliances.length; i++) {
            totalWatt += appliances[i].amount * appliances[i].watt;
        }

        let totalPowerField = document.getElementById("entity-total-power-needed") as HTMLSpanElement;
        totalPowerField.innerText = Math.ceil(totalWatt).toString();
        this.checkIfLargeCamp();
    }

    private getAppliancesFromUi(): Array<Appliance> {
        let appliances: Array<Appliance> = [];
        let listOfItems = document.querySelectorAll("#power-items-container .power-item") as NodeListOf<HTMLDivElement>;

        for (let i = 0; i < listOfItems.length; i++) {
            const row = listOfItems[i];
            appliances.push({
                //@ts-ignore
                name: row.childNodes[0].value,
                //@ts-ignore
                amount: Math.ceil(Number(row.childNodes[1].value)),
                //@ts-ignore
                watt: Math.ceil(Number(row.childNodes[2].value)),
            });
        }

        return appliances;
    }
}
