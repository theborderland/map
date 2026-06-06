import L from "leaflet";
import { MapEntity, EntityDifferences } from "../../entities";
import { formatDate } from "../../utils";
import { EditorDrawerContext, EditorDrawerTab } from "../editorDrawerContracts";

export class HistoryTabController implements EditorDrawerTab {
    constructor(private ctx: EditorDrawerContext) { }

    init(): void {
    }

    async populate() {
        const entityIdElem = document.getElementById('entity-id');
        const entityRevisionsElem = document.getElementById('entity-revisions');
        const entityLastEditedElem = document.getElementById('entity-last-edited');
        const historyTable = document.getElementById('history-table') as HTMLDivElement;

        if (!entityIdElem || !entityRevisionsElem || !entityLastEditedElem || !historyTable) return;

        // Display entity info
        entityIdElem.innerText = String(this.ctx.entity.id);
        entityRevisionsElem.innerText = String(this.ctx.entity.revision);
        entityLastEditedElem.innerText = formatDate(this.ctx.entity.timeStamp);

        // Clear old history table content
        historyTable.textContent = '';

        // Create table
        const table = document.createElement('table');
        const thead = table.createTHead();
        const headRow = thead.insertRow();
        headRow.insertCell().innerText = 'Rev.';
        headRow.insertCell().innerText = 'Timestamp';
        headRow.insertCell().innerText = 'Changes';
        const tbody = table.createTBody();

        // Load revisions
        await this.ctx.repository.getRevisionsForEntity(this.ctx.entity);

        let previousEntity: MapEntity | null = null;

        // Iterate through revisions
        for (let revId in this.ctx.entity.revisions) {
            const currentRev = this.ctx.entity.revisions[revId];
            const row = tbody.insertRow();
            row.insertCell().innerText = currentRev.revision.toString();
            row.insertCell().innerText = formatDate(currentRev.timeStamp, 'short', 'medium');

            const changesCell = row.insertCell();
            const ulChanges = document.createElement('ul');

            const diffs: Array<EntityDifferences> = this.getEntityDifferences(currentRev, previousEntity);

            diffs.forEach(diff => {
                const li = document.createElement('li');
                li.innerText = diff.changeShort;

                const inspectIcon = document.createElement('sl-icon');
                inspectIcon.setAttribute('name', 'eye');
                inspectIcon.style.fontSize = 'medium';
                inspectIcon.style.marginRight = '10px';

                const a = document.createElement('a');
                a.href = '#';
                a.style.float = 'right';
                a.title = 'Show detailed description';
                a.appendChild(inspectIcon);
                a.onclick = (e) => {
                    e.preventDefault();
                    this.showRevisionDetails(currentRev, diff, revId);
                };

                li.appendChild(a);
                ulChanges.appendChild(li);
            });

            changesCell.appendChild(ulChanges);
            previousEntity = currentRev;
        }

        historyTable.appendChild(table);
    }

    collectChanges(): Partial<MapEntity> {
        return;
    }

    private showRevisionDetails(
        revision: MapEntity,
        diff: EntityDifferences,
        revisionId: string
    ) {
        const descriptionHeader = document.getElementById('history-description-header') as HTMLSpanElement;
        descriptionHeader.innerText = `Description of revision ${revisionId}`;

        const descriptionContent = document.getElementById('history-description-content');
        descriptionContent.innerText = `${diff.changeLong}\n\n`;

        const btnRestoreDetails = document.createElement('button');
        btnRestoreDetails.className = 'history-button';
        btnRestoreDetails.textContent = '⚠ Restore details + save';
        btnRestoreDetails.title = `Restore details from revision ${revisionId}`;
        btnRestoreDetails.onclick = () => {
            console.log(`Restores detailes from revision ${revisionId}.`);
            this.ctx.entity.areaType = this.ctx.entity.revisions[revisionId].areaType;
            this.ctx.entity.name = this.ctx.entity.revisions[revisionId].name;
            this.ctx.entity.description = this.ctx.entity.revisions[revisionId].description;
            this.ctx.entity.contactInfo = this.ctx.entity.revisions[revisionId].contactInfo;
            this.ctx.entity.nrOfPeople = this.ctx.entity.revisions[revisionId].nrOfPeople;
            this.ctx.entity.nrOfVehicles = this.ctx.entity.revisions[revisionId].nrOfVehicles;
            this.ctx.entity.additionalSqm = this.ctx.entity.revisions[revisionId].additionalSqm;
            this.ctx.entity.amplifiedSound = this.ctx.entity.revisions[revisionId].amplifiedSound;
            this.ctx.entity.suppressWarnings = this.ctx.entity.revisions[revisionId].suppressWarnings;
            this.ctx.entity.powerContactInfo = this.ctx.entity.revisions[revisionId].powerContactInfo;
            this.ctx.entity.powerPlugType = this.ctx.entity.revisions[revisionId].powerPlugType;
            this.ctx.entity.powerExtraInfo = this.ctx.entity.revisions[revisionId].powerExtraInfo;
            this.ctx.entity.powerImageUrl = this.ctx.entity.revisions[revisionId].powerImageUrl;
            this.ctx.entity.powerNeed = this.ctx.entity.revisions[revisionId].powerNeed;
            this.ctx.entity.powerAppliances = this.ctx.entity.revisions[revisionId].powerAppliances;

            descriptionHeader.textContent = '';
            this.ctx.editEntityCallback("save");
            this.ctx.closeDrawer();
        };
        descriptionContent.appendChild(btnRestoreDetails);

        // Restore Shape Button
        const btnRestoreShape = document.createElement('button');
        btnRestoreShape.className = 'history-button';
        btnRestoreShape.textContent = '⚠ Restore shape + save';
        btnRestoreShape.title = `Restore shape from revision ${revisionId}`;
        btnRestoreShape.onclick = () => {
            this.ctx.editEntityCallback('restore-shape', revisionId);
            this.ctx.editEntityCallback("save");
            this.ctx.closeDrawer();
        };
        descriptionContent.appendChild(btnRestoreShape);

        // Draw ghosted layer for selected revision
        this.ctx.compareRevDiffLayer.clearLayers();
        const ghostStyle: L.PathOptions = {
            color: '#ff0000',
            fillColor: '#000000',
            fillOpacity: 0.5,
            weight: 5,
        };
        //@ts-ignore
        revision.layer.setStyle(ghostStyle);
        this.ctx.compareRevDiffLayer.addLayer(revision.layer);
    }

    private getEntityDifferences(current: MapEntity, previous: MapEntity | null): Array<EntityDifferences> {
        const differences: Array<EntityDifferences> = [];

        if (!previous) {
            differences.push({
                what: 'Created',
                changeShort: 'Created',
                changeLong: 'Entity was created.'
            });
            return differences;
        }

        const propsToCheck = [
            'areaType', 'name', 'description', 'contactInfo', 'nrOfPeople',
            'nrOfVehicles', 'additionalSqm', 'amplifiedSound', 'suppressWarnings',
            'powerContactInfo', 'powerPlugType', 'powerExtraInfo', 'powerImageUrl', 'powerNeed'
        ];

        propsToCheck.forEach(prop => {
            if (current[prop] !== previous[prop]) {
                differences.push({
                    what: prop,
                    changeShort: prop,
                    changeLong: `Changed ${prop} from ${previous[prop]} to ${current[prop]}.`
                });
            }
        });

        // Handle specific properties
        if (current.powerAppliances.length !== previous.powerAppliances.length) {
            differences.push({
                what: 'PowerAppliances',
                changeShort: 'Power Appliances',
                changeLong: `Changed number of power appliances from ${previous.powerAppliances.length} to ${current.powerAppliances.length}.`
            });
        }

        if (current.isDeleted !== previous.isDeleted) {
            differences.push({
                what: 'Deleted',
                changeShort: 'Deleted',
                changeLong: `Deleted due to ${current.deleteReason}.`
            });
        }

        const currentGeo = JSON.stringify(current.toGeoJSON().geometry);
        const previousGeo = JSON.stringify(previous.toGeoJSON().geometry);
        if (currentGeo !== previousGeo) {
            differences.push({
                what: 'GeoJson',
                changeShort: 'Polygon',
                changeLong: 'Polygon shape changed.'
            });
        }

        if (differences.length === 0) {
            differences.push({
                what: 'NoDifference',
                changeShort: 'No difference',
                changeLong: 'No differences detected.'
            });
        }

        return differences;
    }
}
