import { APIKEY } from '../constants';

export const loadSpreadSheet = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    return data.values;
};

export const loadGoogleSpreadSheet = async (sheetId, range) => 
{
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + sheetId + '/values/' + range + '?alt=json&key=' + APIKEY);
    const data = await response.json();
    return data.values;
};