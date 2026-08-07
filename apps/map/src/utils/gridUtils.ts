import L, { Map, Point, LatLng } from 'leaflet';

/**
 * Since Leaflet uses EPSG:3857 (Web Mercator),
 * distances are distorted by latitude.
 *
 * This scale factor compensates so 1 "grid meter"
 * ≈ 1 real-world meter at the origin latitude.
 */
const origin: LatLng = L.latLng([57.6290247508, 14.9139136076]);
const scale: number = Math.cos(origin.lat * Math.PI / 180);
const cellSize: number = 50 / scale; // 50m × 50m in Web Mercator at latitude 57.6°

export const GRID_CONFIG: GridOptions = {
    origin,
    cellSize,
    bearing: 11,
    rows: 30,
    cols: 26,
    strokeStyle: '#fff',
    lineWidth: 1,
    font: '10px sans-serif',
    textColor: '#fff'
};
/**
 * Configuration for the reference grid.
 */
export interface GridOptions {
    origin: LatLng;
    cellSize: number;
    bearing: number;
    rows: number;
    cols: number;
    strokeStyle: string;
    lineWidth: number;
    font: string;
    textColor: string;
}

/**
 * Rotates a point around (0,0).
 */
export function rotate(
    x: number,
    y: number,
    angleDeg: number
): { x: number; y: number } {
    const angleRad = (angleDeg * Math.PI) / 180;

    return {
        x: x * Math.cos(angleRad) - y * Math.sin(angleRad),
        y: x * Math.sin(angleRad) + y * Math.cos(angleRad)
    };
}

/**
 * Returns grid reference like A01, C12, Z30
 * based on centroid lat/lng.
 */
export function getGridReference(latlng: LatLng): string | null {

    const {
        origin,
        cellSize,
        bearing,
        rows,
        cols
    } = GRID_CONFIG;

    // Project to Web Mercator meters
    const crs = L.CRS.EPSG3857;

    const originProjected: Point = crs.project(origin);
    const p: Point = crs.project(latlng);

    const dx = p.x - originProjected.x;
    const dy = p.y - originProjected.y;

    // Rotate into grid-aligned coordinate system
    const local = rotate(dx, dy, -bearing);

    const col = Math.floor(local.x / cellSize);
    const row = Math.floor(-local.y / cellSize);

    // Outside grid bounds
    if (
        col < 0 ||
        col >= cols ||
        row < 0 ||
        row >= rows
    ) {
        return null;
    }

    // Convert to A-Z + 01-30 format
    return (
        String.fromCharCode(65 + col) +
        String(row + 1).padStart(2, '0')
    );
}