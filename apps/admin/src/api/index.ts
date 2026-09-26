/**
 * Everything comes from the real backend API, including Settings.
 *
 * Auth is NOT re-exported here — this app uses the Zustand authStore
 * (src/store/authStore.ts)
 */

// Styles
export {
  getStyles,
  getStyle,
  getStyleByType,
  createStyle,
  updateStyle,
  deleteStyle,
} from "./styles"

// Entities (areas, roads, and POIs are fetched separately)
export {
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} from "./entities"

export { getAreas } from "./areas"
export { getRoads } from "./roads"
export { getPois } from "./pois"

// Kind-specific delete. AreaDetail/RoadDetail/POIDetail import these directly
// since they already know their own kind.
export { deleteArea } from "./areas"
export { deleteRoad } from "./roads"
export { deletePoi } from "./pois"

// Rules
export {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
} from "./rules"

// Settings (real backend - edit-mode, edit-button text/password, auto-delete
// schedule, and snap distance all live in one AdminControlPanel row now;
// nothing settings-related stays on Dexie)
export { getSettings, updateSettings, updateAdminPassword } from "./settings"
export type { SettingsUpdate } from "./settings"

// Export
export { exportGeoJSON } from "./entities"

// Types (re-exported so callers import from one place)
export type {
  StyleRecord,
  EntityRecord,
  RuleRecord,
  SettingsRecord,
  AttachedRule,
  StylePayload,
  EntityPayload,
  RulePayload,
  FeatureProperties,
  RuleType,
  Severity,
} from "../db/types"
