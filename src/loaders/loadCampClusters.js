import { CAMP_CLUSTERS_GEOJSON, CAMP_CLUSTERS_SPREADSHEET_JSON } from '../constants';
import L from 'leaflet';
import { loadSpreadSheet } from '../utils/loadSpreadSheet';
import { loadGeoJson } from '../utils/loadGeoJson';

export const loadCampClusters = async (map) => {
    const sheetdata = await loadSpreadSheet(CAMP_CLUSTERS_SPREADSHEET_JSON);

    const data = await loadGeoJson(CAMP_CLUSTERS_GEOJSON, () => ({
        style: function (feature) {
            let color = '#03d7fc';
            let fillOpacity = 0.5;

            //loop through sheetdata and add it to each feature
            for (let i = 0; i < sheetdata.length; i++) {
                const [id, type, sheetname, maxarea, reservedarea, notice, description] = sheetdata[i];

                // convert to string
                if (id === '' + feature.properties.fid) {
                    feature.properties = {
                        ...feature.properties,
                        sheetname,
                        maxarea,
                        reservedarea,
                        notice,
                        description,
                    };

                    if (type === 'art') color = 'purple';
                    else if (type === 'camp') color = '#03d7fc';
                    else if (type === 'parking') color = 'grey';
                    else if (type === 'sound') color = 'blue';
                    else if (type === 'bridge') color = 'yellow';
                    else if (type === 'building') color = 'brown';

                    if (type === 'camp' || type === 'art' || type === 'building') {
                        fillOpacity = 0;
                        if (feature.properties.reservedarea > 500) {
                            color = 'red';
                            fillOpacity = 0.5;
                        } else if (feature.properties.reservedarea > 0) {
                            fillOpacity = (feature.properties.reservedarea / feature.properties.maxarea) * 0.75;
                        }
                    }
                    break;
                }
            }

            return {
                color: color,
                fillColor: color,
                weight: 2,
                opacity: 0.5,
                fillOpacity: fillOpacity,
            };
        },
        onEachFeature: (feature, layer) => {
            layer.bindTooltip(
                "<span style='color: white; text-shadow: 2px 2px #000000; font-weight: bold'>" +
                    feature.properties.sheetname +
                    '</span>',
                { permanent: true, direction: 'center' },
            );
        },
    }));

    data.addTo(map).eachLayer((layer) => {
        let name = '';
        if (layer.feature.properties.sheetname) {
            name = layer.feature.properties.sheetname;
        } else name = layer.feature.properties.fid;

        let area = '';
        if (layer.feature.properties.reservedarea) {
            area =
                layer.feature.properties.reservedarea +
                ' sqm reserved of ' +
                layer.feature.properties.maxarea +
                ' sqm.<BR>';
        }

        let notice = '';
        if (layer.feature.properties.notice) notice = '<h3>' + layer.feature.properties.notice + '</h3>';

        let description = '';
        if (layer.feature.properties.description)
            description = '<B>Description:</B> ' + layer.feature.properties.description + '<BR>';

        const content = '<h2>' + name + '</h2>' + area + notice + description;

        layer.bindPopup(content);
        layer.bringToFront();
    });
};
