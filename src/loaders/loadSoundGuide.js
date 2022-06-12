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

                if (feature.properties.soundlevel == 'silent') color = 'green';
                else if (feature.properties.soundlevel == 'low') color = 'orange';
                else if (feature.properties.soundlevel == 'medium') color = 'darkorange';
                else if (feature.properties.soundlevel == 'high') color = 'red';
                else if (feature.properties.soundlevel == 'soundcamp') color = 'purple';
                
                return {
                    color: color,
                    fillColor: color,
                    weight: 2,
                    opacity: 0.5,
                    fillOpacity: 0.75,
                };
        }
    }));

    // data.addTo(map).eachLayer(function (layer) 
    // {
    //     layer.bindPopup('<H2>Sound guide</H2>');
    // });

    var baseLayers = {"Sound": data};

    L.control.layers(null, baseLayers).addTo(map);

};

