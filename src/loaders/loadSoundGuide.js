import { SOUNDGUIDE_GEOJSON } from '../constants';
import L from 'leaflet';
import { loadGeoJson } from '../utils/loadGeoJson';

export const loadSoundGuide = async (map) => 
{
    const data = await loadGeoJson(SOUNDGUIDE_GEOJSON, () => (
    { 
        style: function (feature) 
        {
                let color = 'green';

                if (feature.properties.soundlevel == 'silent') color = '#1c9603';
                else if (feature.properties.soundlevel == 'low') color = '#d19200';
                else if (feature.properties.soundlevel == 'medium') color = '#b54800';
                else if (feature.properties.soundlevel == 'high') color = '#b80000';
                else if (feature.properties.soundlevel == 'soundcamp') color = '#82002e';
                
                return {
                    color: color,
                    fillColor: color,
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.75,
                };
        }
    }));

    data.eachLayer(function (layer) 
    {
        let content = '<H2>Sound guide</H2>';
        let soundlevel = '<B>Sound level:</B>' + layer.feature.properties.soundlevel;
        layer.bindPopup(content + soundlevel);
    });

    var baseLayers = {"Sound": data};

    L.control.layers(null, baseLayers).addTo(map);

};

