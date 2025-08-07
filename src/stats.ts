import { TabulatorFull } from 'tabulator-tables';
import ExcelJS from 'exceljs';
import { REPOSITORY_URL, TOTAL_MEMBERSHIPS_SOLD } from '../SETTINGS';
import * as Turf from '@turf/turf';

/** The URL to the API */
const ENTITIES_URL = REPOSITORY_URL + '/api/v1/mapentities';

/** Any ID selected in the URL as search parameter */
const ID = new URLSearchParams(window.location.search).get('id');
const IsSingleEntity = ID && !isNaN(Number(ID));

/** Columns visible on the /stats url and in the excel export */
const COLUMNS: Array<{ title: String; field: keyof Entity;[key: string]: any }> = [
    {
        title: 'Location',
        field: 'id',
        formatter: 'link',
        formatterParams: {
            labelField: 'id',
            urlPrefix: './?id=', // Go to the map with this id
            target: '_blank',
        },
        tooltip: 'Click to see this shape on the map',
    },
    {
        title: 'Name',
        field: 'name',
        formatter: 'link',
        formatterParams: {
            labelField: 'name',
            urlPrefix: '?id=', // Go to the stats with this id
            urlField: 'id',
        },
        headerFilter: true,
        headerFilterPlaceholder: 'Search...',
        width: 200,
    },
    {
        title: 'Contact Info',
        field: 'contactInfo',
        headerFilter: true,
        headerFilterPlaceholder: 'Search...',
        width: 100,
    },
    {
        title: 'Technical Contact Info',
        field: 'techContactInfo',
        headerFilter: true,
        headerFilterPlaceholder: 'Search...',
        width: 100,
    },
    { title: 'People', field: 'nrOfPeople' },
    { title: 'Vehicles', field: 'nrOfVehicles' },
    { title: 'Color', field: 'color', formatter: 'color' },
    { title: 'Size (m2)', field: 'sizeSqm' },
    { title: 'Sound (watts)', field: 'amplifiedSound' },
    { title: 'Power need (watts)', field: 'powerNeed' },
    {
        title: 'Description',
        field: 'description',
        formatter: 'textarea',
        resizable: true,
        width: 400,
        variableHeight: true,
        headerFilter: 'input',
        headerFilterPlaceholder: 'Search...',
    },
    { title: 'Timestamp', field: 'timeStamp' }
];

type Entity = {
    id: number;
    name: string;
    timeStamp: Date;
    isDeleted: boolean;
    deleteReason: string;
    sizeSqm: number;
    amplifiedSound: number;
    color: string;
    contactInfo: string;
    techContactInfo: string;
    description: string;
    nrOfPeople: number;
    nrOfVehicles: number;
    powerNeed: number;
    revision: number;
    supressWarnings: number;
};

const createRowFromEntity = (row: Entity) => {
    const newEntity = {};
    for (const { field } of COLUMNS) {
        newEntity[field] = row[field];
    }
    return newEntity;
};

/** Fetches the entries from the API */
async function fetchEntries(url: string, id: string): Promise<any[]> {
    const resp = await fetch(url + (id ? '/' + id : ''));
    let entries = await resp.json();
    let parsedEntries = parseEntries(entries);
    return parsedEntries;
}

function parseEntries(entries: any[]): Entity[] {
    const parsedEntries: Entity[] = [];

    for (const entry of entries) {
        const { properties, geometry } = JSON.parse(entry.geoJson);
        const entity: Entity = {
            id: Number(entry.id),
            name: String(properties.name),
            timeStamp: new Date(entry.timeStamp),
            isDeleted: Boolean(entry.isDeleted),
            deleteReason: String(entry.deleteReason),
            sizeSqm: Math.round(Turf.area(geometry)),
            amplifiedSound: Number(properties.amplifiedSound),
            color: String(properties.color),
            contactInfo: String(properties.contactInfo),
            techContactInfo: String(properties.techContactInfo),
            description: String(properties.description),
            nrOfPeople: Number(properties.nrOfPeople),
            nrOfVehicles: Number(properties.nrOfVehicles),
            powerNeed: Number(properties.powerNeed),
            revision: Number(entry.revision),
            supressWarnings: Number(properties.supressWarnings),
        };
        parsedEntries.push(entity);
    }
    return parsedEntries;
}

function createOverviewStats(parsedEntries: Entity[], isSingleEntity: boolean) {
    let stats: { [key: string]: { value: number; title: string } } = {
        nrOfMembershipsSold: {
            value: TOTAL_MEMBERSHIPS_SOLD,
            title: 'total nr. of memberships',
        },
        totalNrOfPeople: {
            value: 0,
            title: isSingleEntity ? 'nr. of campers' : 'total nr. of campers',
        },
        totalNrOfVehicles: {
            value: 0,
            title: isSingleEntity ? 'nr. of vehicles' : 'total nr. of vehicles',
        },
        totalNrOfEntries: {
            value: parsedEntries.length,
            title: isSingleEntity ? 'nr. of changes to the shape' : 'total nr. of shapes on the map',
        },
        totalPowerNeed: {
            value: 0,
            title: isSingleEntity ? 'power need of camp (watts)' : 'total power need of all camps (watts)',
        },
    };

    if (isSingleEntity) {
        // Show only stats from the latest entry
        let latestEntity = parsedEntries[parsedEntries.length - 1];
        stats.totalNrOfPeople.value = latestEntity.nrOfPeople;
        stats.totalNrOfVehicles.value = latestEntity.nrOfVehicles;
        stats.totalPowerNeed.value = latestEntity.powerNeed;
        delete stats.nrOfMembershipsSold;
    } else {
        // Aggregate stats for all entries
        stats.totalNrOfPeople.value = parsedEntries.reduce((sum, entry) => sum + (isNaN(entry.nrOfPeople) ? 0 : entry.nrOfPeople), 0);
        stats.totalNrOfVehicles.value = parsedEntries.reduce((sum, entry) => sum + (isNaN(entry.nrOfVehicles) ? 0 : entry.nrOfVehicles), 0);
        stats.totalPowerNeed.value = parsedEntries.reduce((sum, entry) => sum + (isNaN(entry.powerNeed) ? 0 : entry.powerNeed), 0);
    }

    return stats;
}

function createTable(entries: any[]): TabulatorFull {
    return new TabulatorFull('#stats', {
        data: entries,
        columns: COLUMNS,
        layout: 'fitColumns',
        columnDefaults: {
            headerTooltip: function (e, cell, onRendered) {
                let el = document.createElement("div");
                el.innerText = cell.getDefinition().title;
                return el;
            },
            tooltip: IsSingleEntity ? '' : 'Click to see the history of this shape',
        }
    });
}

function createExcelFile(parsedEntries: Entity[]) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borderland Community Cocreators';
    const worksheet = workbook.addWorksheet('Camps');
    worksheet.columns = COLUMNS.map((column) => ({ header: column.title, key: column.field } as ExcelJS.Column));
    parsedEntries.forEach((entity) => worksheet.addRow(createRowFromEntity(entity)));
    return workbook;
}

function writeOverviewStatsToDOM(stats: { [key: string]: { value: number; title: string; }; }) {
    const list = document.createElement('ul');
    for (const { value, title } of Object.values(stats)) {
        const entry = document.createElement('li');
        entry.innerHTML = `${title}: ${value}`;
        list.appendChild(entry);
    }
    document.querySelector('#header').appendChild(list);
}

async function createExcelDownloadBtn(workbook: ExcelJS.Workbook) {
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/xlsx' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'camps.xlsx';
    const btn = document.createElement('sl-button');
    btn.innerHTML = 'Download XLSX File';
    btn.setAttribute('variant', 'primary');
    link.appendChild(btn);
    document.querySelector('#buttons').appendChild(link);
}

function createBackToListBtn() {
    const linkBack = document.createElement('a');
    linkBack.href = window.location.href.split('?')[0];
    const btnBack = document.createElement('sl-button');
    btnBack.innerHTML = 'Go back to list';
    btnBack.setAttribute('variant', 'neutral');
    linkBack.appendChild(btnBack);
    document.querySelector('#buttons').appendChild(linkBack);
}

function addRowClickEvent(table: any) {
    table.on("rowClick", function (e, row) {
        if (e.target.tagName === 'A') {
            return; // If the click was on a link, do not trigger the row click
        }
        const cell = row.getCell('name');
        if (cell) {
            const anchor = cell.getElement().querySelector('a');
            if (anchor) {
                anchor.click();
            }
            return;
        }
    });
}

/** Initializes the statistics page */
export const createStats = async () => {
    // Write header title
    const title = document.createElement('h1');
    title.innerHTML = IsSingleEntity ? 'History for shape with id ' + ID : 'All camps and statistics';
    document.querySelector('#header').appendChild(title);

    /// Add columns visible only when a id is selected
    if (IsSingleEntity) {
        COLUMNS.push({ title: 'Revision', field: 'revision' });
        COLUMNS.push({
            title: 'Deleted',
            formatter: 'tickCross',
            field: 'isDeleted',
        });
        COLUMNS.push({
            title: 'Deleted because',
            field: 'deleteReason',
        });
    }

    const entries = await fetchEntries(ENTITIES_URL, ID);
    const stats = createOverviewStats(entries, IsSingleEntity);
    const table: TabulatorFull = createTable(entries);
    
    writeOverviewStatsToDOM(stats);

    const workbook = createExcelFile(entries);
    await createExcelDownloadBtn(workbook);

    if (IsSingleEntity) {
        createBackToListBtn();
    } else {
        addRowClickEvent(table);
    }
};

