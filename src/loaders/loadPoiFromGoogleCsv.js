import L from 'leaflet';

const iconsSize = 32;
const iconAnchor = iconsSize * 0.5;

var centeredIcon = L.Icon.extend({
    options: {
        iconSize: [iconsSize, iconsSize],
        iconAnchor: [iconAnchor, iconAnchor],
        popupAnchor: [0, -iconsSize * 0.25],
    },
});

export const loadPoiFromGoogleCsv = async (map) => {
    let poiLayer = L.layerGroup(); //Add all the POI to this layer to later return it to the map
    
    let csvData = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vS2Vdw0DcFPJZssxsOebCDkrHHvZ8SL-21svhrYjZpBJubsl76kRsO3CAVZq43Up3ZSV8jovj76tHNE/pub?gid=0&single=true&output=csv');
    csvData = await csvData.text();
    csvData = csvData.replace(/"/g, '');
    csvData = csvData.split('\n');
    csvData = csvData.map((row) => row.split(','));
    csvData = csvData.map((row) => row.map((cell) => cell.trim()));
    csvData.shift(); // remove the first row (header)

    let iconDict = {};

    for (let i = 0; i < csvData.length; i++) {
        const [name, description, category, lat, lon] = csvData[i];

        if (!iconDict[category]) iconDict[category] = new centeredIcon({ iconUrl: './img/icons/' + category + '.png' });

        const content = `<h3>${name}</h3> <p>${description}</p>`;
        L.marker([lat, lon], { icon: iconDict[category] }).addTo(poiLayer).bindPopup(content);
    }

    map.groups.poi = poiLayer;
    map.groups.poi.addTo(map);
};
