import L from 'leaflet';
import { ZONES_GEOJSON, ZONES_SPREADSHEET_JSON } from '../constants';
import { loadSpreadSheet } from '../utils/loadSpreadSheet';
import { loadGeoJson } from '../utils/loadGeoJson';

export const loadZones = async (map) => {
    const zonedata = await loadSpreadSheet(ZONES_SPREADSHEET_JSON);

    const data = await loadGeoJson(ZONES_GEOJSON, () => ({
        style: function (feature) {
            let color = 'yellow';

            //ok, really messy to have this in here. Where should it go?
            for (let i = 0; i < zonedata.length; i++) {
                if (zonedata[i][0] === feature.properties.fid) {
                    feature.properties.sheetname = zonedata[i][1];
                    feature.properties.notice = zonedata[i][2];
                    feature.properties.sound = zonedata[i][3];
                    feature.properties.description = zonedata[i][4];
                    break;
                }
            }

            return {
                weight: 3,
                opacity: 0.75,
                color: color,
                dashArray: '5',
                fillOpacity: 0,
                zIndex: 0,
            };
        },
    }));

    data.addTo(map).eachLayer(function (layer) {
        let notice = '';
        if (layer.feature.properties.notice) notice = '<h3>' + layer.feature.properties.notice + '</h3>';

        let sound = '';
        if (layer.feature.properties.sound) sound = '<B>Sound:</B> ' + layer.feature.properties.sound + '<BR><BR>';

        let description = '';
        if (layer.feature.properties.description)
            description = '<B>Description:</B> ' + layer.feature.properties.description + '<BR>';

        const content = '<h2>' + layer.feature.properties.sheetname + '</h2>' + sound + notice + description;
        layer.bindPopup(content);
        layer.bringToBack();
    });
};
