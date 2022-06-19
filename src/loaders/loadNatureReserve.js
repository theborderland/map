import { NATURE_RESERVE_GEOJSON } from '../constants';
import L from 'leaflet';
import { getStyle } from '../layerstyles';
import { loadGeoJson } from '../utils/loadGeoJson';

export const loadNatureReserve = async (map) => {
    let group = new L.FeatureGroup();
    const data = await loadGeoJson(NATURE_RESERVE_GEOJSON, ({ name }) => ({ style: getStyle(name) }));
    data.addTo(group).eachLayer(function (layer) {
        layer.bindPopup('<H2>Nature Reserve</H2>');
    });
    return group;
};
