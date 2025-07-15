/**
 * Configuration file for variables that can be changed
 */

// Editor
export const IS_EDITING_POSSIBLE: boolean = true;
export const NOTE_ABOUT_EDITING: string = `
We will <u>disable editing</u> on July 18th.<br><br>
Camps that do not have a contact info will be deleted every Monday morning at 08:00 CEST`;

// Repository
export const REPOSITORY_URL: string = 'https://robnowa.runasp.net';

// Rules
export const MAX_CLUSTER_SIZE: number = 1250;
export const MAX_POWER_NEED: number = 8000;
export const MAX_POINTS_BEFORE_WARNING: number = 10;
export const FIRE_BUFFER_IN_METER: number = 5;

// JOMO guide locations
// 1 = by the barn
// 2 (or any other number)= by Bambi's Nest camp
export const JOMO_GUIDE_LOCATION = 1;