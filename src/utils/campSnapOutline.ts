import * as L from 'leaflet';
import * as Turf from '@turf/turf';
import { CAMP_SNAP_GAP_METERS } from '../../SETTINGS';
import { getActivePolygonFeatureFromLayer } from '../rule/rules/utils';

const invisibleSnapStyle: L.PathOptions = {
    color: '#000000',
    weight: 0,
    opacity: 0,
    fillOpacity: 0,
};

/** Invisible outline just outside a camp — Geoman snaps here instead of the camp fill. */
export function createCampSnapOutlineLayer(
    entityLayer: L.GeoJSON,
    entityId: number,
    gapMeters: number = CAMP_SNAP_GAP_METERS,
): L.GeoJSON | null {
    const campFeature = getActivePolygonFeatureFromLayer(entityLayer);
    if (!campFeature) {
        return null;
    }

    const outline = Turf.buffer(campFeature, gapMeters, { units: 'meters' });
    if (!outline?.geometry) {
        return null;
    }

    const layer = L.geoJSON(outline, {
        pmIgnore: false,
        interactive: false,
        snapIgnore: false,
        style: () => invisibleSnapStyle,
    });
    layer.options.entityId = entityId;
    layer.options.isCampSnapOutline = true;

    return layer;
}
