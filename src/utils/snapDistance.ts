import * as L from 'leaflet';
import { SNAP_DISTANCE_METERS } from '../../SETTINGS';

/** Converts a ground distance in meters to screen pixels at the current map view. */
export function metersToSnapPixels(map: L.Map, meters: number = SNAP_DISTANCE_METERS): number {
    const center = map.getCenter();
    const latRad = (center.lat * Math.PI) / 180;
    const metersPerDegreeLng = 111320 * Math.cos(latRad);
    const offsetLng = meters / metersPerDegreeLng;
    const origin = map.latLngToContainerPoint(center);
    const offset = map.latLngToContainerPoint(L.latLng(center.lat, center.lng + offsetLng));
    return Math.max(1, Math.round(origin.distanceTo(offset)));
}
