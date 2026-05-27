/**
 * Configuration file for variables that can be changed
 */

// Repository
export const REPOSITORY_URL: string = 'https://robnowa.runasp.net';

// Rules
export const MAX_CLUSTER_SIZE: number = 1250;
export const MAX_POWER_NEED: number = 8000;
export const MAX_POINTS_BEFORE_WARNING: number = 10;
export const FIRE_BUFFER_IN_METER: number = 5;
/** Max snap distance when snapping to fireroads (m). */
export const SNAP_DISTANCE_METERS: number = 2;
/** Max snap distance when snapping to other camps (m) — tighter than fireroads. */
export const CAMP_SNAP_DISTANCE_METERS: number = 1;
/** Fireroad centerline buffer used for placement rules (m). */
export const FIREROAD_CLEARANCE_METERS: number = 2.5;
/** Extra buffer for snap targets so vertices land outside the clearance polygon (m). */
export const FIREROAD_SNAP_OUTSET_METERS: number = 0.1;
/** Shrink zone polygons before clearance overlap tests (fireroad, slope, etc.) (m). */
export const SNAP_EDGE_TOLERANCE_METERS: number = 1;
/** Offset outward from a camp edge when snapping (m). */
export const CAMP_SNAP_GAP_METERS: number = 0.2;
/**
 * Camp-vs-camp: any shared area above this (m²) is invalid. Kept tiny for float noise only.
 * Touching without overlapping has ~0 m² intersection and is allowed.
 */
export const MIN_CAMP_AREA_OVERLAP_SQM: number = 0.05;
/** Min overlap (m²) for zone rules (fireroad buffers, etc.), not camp-vs-camp. */
export const MIN_CAMP_OVERLAP_AREA_SQM: number = 1;

export const TOTAL_MEMBERSHIPS_SOLD = 5432; // 2026, this is used for the stats page.
export const SOUND_GUIDE_URL = 'https://docs.google.com/document/d/1aDBv3UWOxngdjWd_z4N34Wcm7r7GvD-gINGwQIr4ti8';
export const POWER_GRID_GEOJSON_URL = 'https://bl.skookum.cc/api/bl26/v/default/power_grid';

export const HAS_SEEN_PLACEMENT_WELCOME_COOKIE_KEY = 'hasSeenPlacementWelcome';
export const HAS_SEEN_EDITOR_INSTRUCTIONS_COOKIE_KEY = 'hasSeenEditorInstructions';
