import { TabulatorFull } from 'tabulator-tables';
import ExcelJS from 'exceljs';
import { REPOSITORY_URL } from '../../SETTINGS';

/** The URL to the API */
const ENTITIES_URL = REPOSITORY_URL + 'api/v1/mapentities';

/** Total memberships sold for 2024 */
const TOTAL_MEMBERSHIPS_SOLD = 4114;

/** Any ID selected in the URL as search parameter */
const ID = new URLSearchParams(window.location.search).get('id');

/** Columns visible on the /stats url and in the excel export */
const COLUMNS: Array<{ title: String; field: keyof Entity; [key: string]: any }> = [
    {
        title: 'Location',
        field: 'id',
        formatter: 'link',
        formatterParams: {
            labelField: 'id',
            urlPrefix: '/index.html?id=',
            target: '_blank',
        },
    },
    { title: 'Name', field: 'name' },
    { title: 'Contact Info', field: 'contactInfo' },
    { title: 'Nr of People', field: 'nrOfPeople' },
    { title: 'Nr of Vechiles', field: 'nrOfVechiles' },
    { title: 'Color', field: 'color', formatter: 'color' },
    { title: 'Additional Square meters (m2)', field: 'additionalSqm' },
    { title: 'Amplified Sound (watts)', field: 'amplifiedSound' },
    { title: 'Power need (watts)', field: 'powerNeed' },
    {
        title: 'Description',
        field: 'description',
        formatter: 'textarea',
        resizable: true,
        width: 600,
        variableHeight: true,
    },
];

type Entity = {
    id: number;
    name: string;
    timeStamp: Date;
    isDeleted: boolean;
    deleteReason: string;
    additionalSqm: number;
    amplifiedSound: number;
    color: string;
    contactInfo: string;
    description: string;
    nrOfPeople: number;
    nrOfVechiles: number;
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

/** Initializes the statistics page */
export const createStats = async () => {
    /// Add columns visible only when a id is selected
    if (ID) {
        COLUMNS.push({ title: 'Revision', field: 'revision' });
        COLUMNS.push({ title: 'Timestamp', field: 'timeStamp' });
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

    // Fetch the data
    const resp = await fetch(ENTITIES_URL + (ID ? '/' + ID : ''));
    const entries = await resp.json();

    const parsedEntries = [];
    const stats = {
        nrOfMembershipsSold: { value: TOTAL_MEMBERSHIPS_SOLD, title: 'total nr. of memberships', unit: 'memberships' },
        totalNrOfPeople: { value: 0, title: 'total nr. of campers', unit: 'persons' },
        totalNrOfVechiles: { value: 0, title: 'total nr. of vechiles', unit: 'automobiles' },
        totalPowerNeed: { value: 0, title: 'total power need of all camps', unit: 'watts' },
        totalNrOfEntries: { value: entries.length, title: 'total nr. of shapes on the map', unit: 'shapes' },
    };

    for (const entry of entries) {
        const { properties } = JSON.parse(entry.geoJson);
        const entity: Entity = {
            id: Number(entry.id),
            name: String(properties.name),
            timeStamp: new Date(entry.timeStamp),
            isDeleted: Boolean(entry.isDeleted),
            deleteReason: String(entry.deleteReason),
            additionalSqm: Number(properties.additionalSqm),
            amplifiedSound: Number(properties.amplifiedSound),
            color: String(properties.color),
            contactInfo: String(properties.contactInfo),
            description: String(properties.description),
            nrOfPeople: Number(properties.nrOfPeople),
            nrOfVechiles: Number(properties.nrOfVechiles),
            powerNeed: Number(properties.powerNeed),
            revision: Number(entry.revision),
            supressWarnings: Number(properties.supressWarnings),
        };
        stats.totalNrOfPeople.value += +entity.nrOfPeople;
        stats.totalNrOfVechiles.value += entity.nrOfVechiles;
        stats.totalPowerNeed.value += entity.powerNeed;
        parsedEntries.push(entity);
    }

    // Create Tabulator view
    new TabulatorFull('#stats', {
        data: parsedEntries,
        columns: COLUMNS,
    });

    // Create Excel export file
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borderland Community Cocreators';
    const worksheet = workbook.addWorksheet('Camps');
    worksheet.columns = COLUMNS.map((column) => ({ header: column.title, key: column.field } as ExcelJS.Column));
    parsedEntries.forEach((entity) => worksheet.addRow(createRowFromEntity(entity)));

    // Create header title
    const title = document.createElement('h1');
    title.innerHTML = ID ? 'History for shape with id ' + ID : 'All camps and statistics';
    document.querySelector('#header').appendChild(title);

    // Create statistics list
    const list = document.createElement('ul');
    for (const { value, title, unit } of Object.values(stats)) {
        const entry = document.createElement('li');
        entry.innerHTML = `${title}: ${value} ${unit}`;
        list.appendChild(entry);
    }
    document.querySelector('#header').appendChild(list);

    // Create excel download button
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/xlsx' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'camps.xlsx';
    const btn = document.createElement('sl-button');
    btn.innerHTML = 'Download XLSX File';
    btn.setAttribute('variant', 'primary');
    link.appendChild(btn);
    document.querySelector('#header').appendChild(link);
};
