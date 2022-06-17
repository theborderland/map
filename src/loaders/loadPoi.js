import { loadGoogleSpreadSheet } from '../utils/loadSpreadSheet';
import { PLACEMENT_MAP_SHEET } from '../constants';
import L, { polyline } from 'leaflet';

const iconsSize = 48;
const iconAnchor = iconsSize * 0.5;

var centeredIcon = L.Icon.extend({
    options: {
        iconSize:     [iconsSize, iconsSize],
        iconAnchor:   [iconAnchor,iconAnchor],
        popupAnchor:  [0,-iconsSize*0.25]
    }
});

export const loadPoi = async (map) => 
{
    const spreadsheetdata = await loadGoogleSpreadSheet(PLACEMENT_MAP_SHEET, 'poi!A2:F');
    let iconDict = {};

    let poiLayer = L.layerGroup();

    for (let i = 0; i < spreadsheetdata.length; i++) 
    {
        if (spreadsheetdata[i][0]) //Check if 'type' column is not empty
        {
            const [type,name,description,lonlat] = spreadsheetdata[i];
            const [lon, lat] = lonlat.split(",");

            if (!iconDict[type]) iconDict[type] = new centeredIcon({iconUrl: './img/icons/' + type + '.png'});
            
            const content = '<h3>' + name + '</h3>' + '<p>' + description + '</p>';
            L.marker([lon, lat], {icon: iconDict[type]}).addTo(poiLayer).bindPopup(content);
        }
    }

    poiLayer.addTo(map);

    return poiLayer;
};
