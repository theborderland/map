import { Tabulator } from 'tabulator-tables';
import ExcelJS from 'exceljs';

/** Initializes the statistics page */
export const createStats = async () => {
    // The URL to the API
    const ENTITIES_URL = 'https://placement.freaks.se/api/v1/mapentities';

    // Total memberships sold for 2024
    const TOTAL_MEMBERSHIPS_SOLD = 4114;

    // Fetch the data
    const resp = await fetch(ENTITIES_URL);
    const entries = await resp.json();

    const rows = [];
    const totalNrOfEntries = entries.length;
    const stats = {
        totalNrOfPeople: 0,
        totalNrOfVechiles: 0,
        totalPowerNeed: 0,
    };

    for (const entry of entries) {
        const { properties } = JSON.parse(entry.geoJson);
        const row = {
            //id: Number(entry.id),
            name: String(properties.name),
            //timeStamp: new Date(entry.timeStamp),
            //isDeleted: Boolean(entry.isDeleted),
            additionalSqm: Number(properties.additionalSqm),
            amplifiedSound: Number(properties.amplifiedSound),
            color: String(properties.color),
            contactInfo: String(properties.contactInfo),
            description: String(properties.description),
            nrOfPeople: Number(properties.nrOfPeople),
            nrOfVechiles: Number(properties.nrOfVechiles),
            powerNeed: Number(properties.powerNeed),
            revision: Number(entry.revision),
            //supressWarnings: Number(properties.supressWarnings),
        };
        stats.totalNrOfPeople += +row.nrOfPeople;
        stats.totalNrOfVechiles += row.nrOfVechiles;
        stats.totalPowerNeed += row.powerNeed;
        //console.log(row);
        rows.push(row);
    }

    // Create Tabulator view
    new Tabulator('#stats', {
        data: rows,
        autoColumns: true,
    });

    // Create Excel export file
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Borderland Community Cocreators';
    const worksheet = workbook.addWorksheet('Camps');
    worksheet.columns = [
        { header: 'Name', key: 'name' },
        { header: 'Revision', key: 'revision' },
        { header: 'AdditionalSqm', key: 'additionalSqm' },
        { header: 'AmplifiedSound', key: 'amplifiedSound' },
        { header: 'Color', key: 'color' },
        { header: 'ContactInfo', key: 'contactInfo' },
        { header: 'Description', key: 'description' },
        { header: 'NrOfPeople', key: 'nrOfPeople' },
        { header: 'NrOfVechiles', key: 'nrOfVechiles' },
        { header: 'PowerNeed', key: 'powerNeed' },
    ];
    rows.forEach((row) => worksheet.addRow(row));

    // Create header title
    const title = document.createElement('h1');
    title.innerHTML = 'All camps and statistics';
    document.querySelector('#header').appendChild(title);

    // Create statistics list
    const list = document.createElement('ul');
    for (const [name, stat] of Object.entries(stats)) {
        const entry = document.createElement('li');
        entry.innerHTML = `${name}: ${stat}`;
        list.appendChild(entry);
    }
    document.querySelector('#header').appendChild(list);

    // Create excel download button
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/xlsx' }));
    const link = document.createElement('a');
    link.href = url;
    const btn = document.createElement('sl-button');
    btn.innerHTML = 'Download XLSX File';
    btn.setAttribute('variant', 'primary');
    link.appendChild(btn);
    document.querySelector('#header').appendChild(link);
};
