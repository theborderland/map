import L from 'leaflet';
import { ZONES_GEOJSON, ZONES_SPREADSHEET_JSON } from '../constants';
import { loadSpreadSheet } from '../utils/loadSpreadSheet';
import { loadGeoJson } from '../utils/loadGeoJson';

export const loadZones = async (map) => {
    const zonedata = await loadSpreadSheet(ZONES_SPREADSHEET_JSON);

    const data = await loadGeoJson(ZONES_GEOJSON, () => ({
        style: function (feature) {
            let color = 'yellow';

            for (let i = 0; i < zonedata.length; i++) {
                const [id, name, abbrevation, notice, sound, description] = zonedata[i];

                // convert to string
                if (id === '' + feature.properties.fid) {
                    feature.properties = {
                        ...feature.properties,
                        name, abbrevation, notice, sound, description,
                    };
                    feature.properties.type = "zone";
                    feature.properties.mapUri = zonedata[i][7];
                    feature.properties.discordChannel = zonedata[i][8];
                    feature.properties.discussionUri = zonedata[i][9];
                    feature.properties.spreadsheetUri = zonedata[i][10];
                    feature.properties.areas = {};
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

    let group = new L.FeatureGroup();
    data.addTo(group).eachLayer((layer) => {
        let notice = '';
        if (layer.feature.properties.notice) notice = '<h3>' + layer.feature.properties.notice + '</h3>';

        let sound = '';
        if (layer.feature.properties.sound) sound = '<B>Sound:</B> ' + layer.feature.properties.sound + '<BR><BR>';

        let discussion = '';
        if (layer.feature.properties.discussionUri)
        {
            discussion += '<p><a href="';
            discussion += layer.feature.properties.discussionUri;
            discussion += '">';
            discussion += 'Discussion on Discord ' + layer.feature.properties.discordChannel;
            discussion += '</a></p>';
        }

        let spreadsheet = '';
        if (layer.feature.properties.spreadsheetUri)
        {
            spreadsheet += '<p><a href="';
            spreadsheet += layer.feature.properties.spreadsheetUri;
            spreadsheet += '">';
            spreadsheet += 'Zone in the placement spreadsheet';
            spreadsheet += '</a></p>';
        }

        let description = '';
        if (layer.feature.properties.description)
            description = '<B>Description:</B> ' + layer.feature.properties.description + '<BR>';

        // console.log(layer.getBounds().getCenter());
        let center = layer.getBounds().getCenter();
        let navigatehere = ' ';
        navigatehere += '<a';
        navigatehere += ' href="';
        navigatehere += 'https://tim.gremalm.se/gps/updategps.php?lat='
        navigatehere += center['lat'];
        navigatehere += '&lng=';
        navigatehere += center['lng'];
        navigatehere += '"';
        navigatehere += '>';
        navigatehere += '☩';
        navigatehere += '</a>';

        const content = '<h2>' + layer.feature.properties.name + '</h2>' + sound + notice + description + discussion + spreadsheet + navigatehere;
        layer.bindPopup(content);
        layer.bringToBack();
    });
    return group;
};

export const loadZoneNames = async (map) => {
    let group = new L.FeatureGroup();
	map.eachLayer(function(layer)
	{
		if (layer.feature && layer.feature.properties)
		{
			if (layer.feature.properties?.type)
			{
                if (layer.feature.properties.type == 'zone')
                {
                    // console.log('zone', layer.feature.properties.name);
                    var zoneMarker = L.circle(layer.getBounds().getCenter(), {
                        color: "ddd",
                        fillColor: "#fff",
                        fillOpacity: 0.0,
                        radius: 0.1
                    });
                    zoneMarker.feature = {};
                    zoneMarker.feature.properties = {};
                    zoneMarker.feature.properties.name = layer.feature.properties.name;
                    group.addLayer(zoneMarker);
                    let zoneDiv = '';
                    zoneDiv += '<h3>';
                    zoneDiv += zoneMarker.feature.properties.name;
                    zoneDiv += '</h3>';
                    zoneMarker.bindTooltip(
                        zoneDiv, {
                            permanent: true,
                            direction: 'center',
                            className: 'zone-tooltip'
                        },
                    );
                }
            }
        }
    });
    return group;
};
