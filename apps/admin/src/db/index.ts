/**
 * db — local IndexedDB layer (Dexie) for development
 *
 * Usage:
 *
 *   import { isAuthenticated, login, logout } from '../db'
 *   import { getStyles, createEntity, exportGeoJSON } from '../db'
 *   import { seedIfEmpty } from '../db'
 *
 * On app boot:
 *
 *   if (!isAuthenticated()) { showLoginScreen(); return; }
 *   await seedIfEmpty();
 *   const entities = await getEntities();
 */

// Auth
export { login, logout, isAuthenticated } from './auth'

// Seeding / reset
export { seedIfEmpty, resetAndReseed } from './api'

// Styles
export {
  getStyles,
  getStyle,
  getStyleByType,
  createStyle,
  updateStyle,
  deleteStyle,
} from './api'

// Entities
export {
  getEntities,
  getEntitiesByType,
  getEntitiesByTypes,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} from './api'

// Rules
export {
  getRules,
  getRule,
  createRule,
  updateRule,
  deleteRule,
} from './api'

// Export
export { exportGeoJSON } from './api'

// Types (re-exported so callers import from one place)
export type {
  StyleRecord,
  EntityRecord,
  RuleRecord,
  AttachedRule,
  StylePayload,
  EntityPayload,
  RulePayload,
  FeatureProperties,
  RuleType,
  Severity,
} from './types'
