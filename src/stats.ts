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
    let totalNrOfPeople = 0;
    let totalNrOfVechiles = 0;
    let totalPowerNeed = 0;

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
        totalNrOfPeople += +row.nrOfPeople;
        totalNrOfVechiles += row.nrOfVechiles;
        totalPowerNeed += row.powerNeed;
        //console.log(row);
        rows.push(row);
    }
    console.log({
        totalNrOfEntries,
        totalNrOfPeople,
        totalNrOfVechiles,
        totalPowerNeed,
    });

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

    // Create download button
    const buffer = await workbook.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buffer], { type: 'application/xlsx' }));
    const button = document.createElement('a');
    button.classList.add('button');
    button.innerHTML = 'Download XLSX File';
    button.href = url;
    document.querySelector('#header').appendChild(button);
};
