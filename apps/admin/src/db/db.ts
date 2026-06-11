import Dexie, { type Table } from 'dexie'
import type { StyleRecord, EntityRecord, RuleRecord } from './types'

/**
 * MapAdminDB
 *
 * Schema versioning lives here. When adding new tables or indexes in future
 * milestones, increment the version number and add a new .version() block
 * rather than modifying the existing one — Dexie handles migration automatically.
 *
 * Index syntax reminder:
 *   'id'       primary key (you supply the value)
 *   '++id'     auto-increment integer primary key
 *   'type'     secondary index (non-unique)
 *   '&email'   secondary index (unique)
 *   '[a+b]'    compound index
 *
 * Only indexed properties are listed in the schema string.
 * All other object properties are stored but not queryable via .where().
 */
class MapAdminDB extends Dexie {
  styles!:   Table<StyleRecord,  string>
  entities!: Table<EntityRecord, string>
  rules!:    Table<RuleRecord,   string>

  constructor() {
    super('MapAdminDB');

    this.version(1).stores({
      // Primary key first, then any secondary indexes we want to query on
      styles:   'id, type',
      entities: 'id, styleType',
      rules:    'id, ruleType, severity',
    })
  }
}

/** Singleton — import this everywhere you need DB access. */
export const db = new MapAdminDB()
