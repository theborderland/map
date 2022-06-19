import { FIRE_ROADS_GEOJSON } from '../constants';
import L from 'leaflet';
import { getStyle } from '../layerstyles';
import { loadGeoJson } from '../utils/loadGeoJson';

export const loadFireRoads = async (map) => {
    let group = new L.FeatureGroup();
    const data = await loadGeoJson(FIRE_ROADS_GEOJSON, ({ name }) => {
        return { style: getStyle(name) };
    });
    data.addTo(group);
    return group;
};
