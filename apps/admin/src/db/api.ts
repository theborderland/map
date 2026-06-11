import type { FeatureCollection, Feature } from 'geojson'
import { db } from './db'
import { SEED_STYLES, SEED_RULES, SEED_ENTITIES } from './seed'
import type {
  StyleRecord,
  EntityRecord,
  RuleRecord,
  StylePayload,
  EntityPayload,
  RulePayload,
  FeatureProperties,
} from './types'

// ── Helpers ───────────────────────────────────────────────

function uuid(): string {
  return crypto.randomUUID()
}

function now(): string {
  return new Date().toISOString()
}

function notFound(table: string, id: string): Error {
  return new Error(`${table}: record "${id}" not found`)
}

// ── Database seeding ──────────────────────────────────────

/**
 * Checks whether the database is empty and, if so, populates it with the
 * default styles and a set of sample entities placed around Alversjö.
 *
 * Call once on app startup, after the user has authenticated.
 *
 * Safe to call multiple times — it only seeds when the styles table is empty.
 */
export async function seedIfEmpty(): Promise<void> {
  const count = await db.styles.count()
  if (count > 0) return

  await db.transaction('rw', [db.styles, db.entities, db.rules], async () => {
    await db.styles.bulkAdd(SEED_STYLES)
    await db.rules.bulkAdd(SEED_RULES)
    await db.entities.bulkAdd(SEED_ENTITIES)
  })
}

/**
 * Wipe all tables and re-seed from scratch.
 * Useful during development when you want a clean known state.
 */
export async function resetAndReseed(): Promise<void> {
  await db.transaction('rw', [db.styles, db.entities, db.rules], async () => {
    await db.styles.clear()
    await db.entities.clear()
    await db.rules.clear()
    await db.styles.bulkAdd(SEED_STYLES)
    await db.rules.bulkAdd(SEED_RULES)
    await db.entities.bulkAdd(SEED_ENTITIES)
  })
}

// ── Styles ────────────────────────────────────────────────

/** Return all style definitions, ordered by displayName. */
export async function getStyles(): Promise<StyleRecord[]> {
  const all = await db.styles.toArray()
  return all.sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/** Return a single style by its primary key, or undefined if not found. */
export async function getStyle(id: string): Promise<StyleRecord | undefined> {
  return db.styles.get(id)
}

/** Return a style by its type slug (e.g. 'neighbourhood'), or undefined. */
export async function getStyleByType(type: string): Promise<StyleRecord | undefined> {
  return db.styles.where('type').equals(type).first()
}

/**
 * Create a new style.
 * @throws if a style with the same type key already exists.
 */
export async function createStyle(payload: StylePayload): Promise<StyleRecord> {
  const existing = await getStyleByType(payload.type)
  if (existing) {
    throw new Error(`A style with type key "${payload.type}" already exists`)
  }

  const record: StyleRecord = { ...payload, id: uuid(), createdAt: now() }
  await db.styles.add(record)
  return record
}

/**
 * Update an existing style. Partial — only the provided fields are changed.
 * Note: the type key (slug) cannot be changed after creation.
 * @throws if the style does not exist.
 */
export async function updateStyle(
  id: string,
  changes: Partial<Omit<StylePayload, 'type'>>,
): Promise<StyleRecord> {
  const existing = await db.styles.get(id)
  if (!existing) throw notFound('styles', id)

  const updated: StyleRecord = { ...existing, ...changes }
  await db.styles.put(updated)
  return updated
}

/**
 * Delete a style by id.
 * @throws if the style does not exist.
 */
export async function deleteStyle(id: string): Promise<void> {
  const existing = await db.styles.get(id)
  if (!existing) throw notFound('styles', id)
  await db.styles.delete(id)
}

// ── Entities ──────────────────────────────────────────────

/** Return all entities, ordered by creation date (newest last). */
export async function getEntities(): Promise<EntityRecord[]> {
  const all = await db.entities.toArray()
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * Return all entities of a specific style type.
 * Uses the indexed 'styleType' column for an efficient lookup.
 */
export async function getEntitiesByType(styleType: string): Promise<EntityRecord[]> {
  return db.entities.where('styleType').equals(styleType).sortBy('createdAt')
}

/**
 * Return all entities whose styleType is one of the provided values.
 * Useful for filtering by category, e.g. getEntitiesByTypes(['fireroad', 'minorroad']).
 */
export async function getEntitiesByTypes(styleTypes: string[]): Promise<EntityRecord[]> {
  return db.entities
    .where('styleType')
    .anyOf(styleTypes)
    .sortBy('createdAt')
}

/** Return a single entity by its primary key, or undefined. */
export async function getEntity(id: string): Promise<EntityRecord | undefined> {
  return db.entities.get(id)
}

/** Create a new entity. */
export async function createEntity(payload: EntityPayload): Promise<EntityRecord> {
  const record: EntityRecord = { ...payload, id: uuid(), createdAt: now() }
  await db.entities.add(record)
  return record
}

/**
 * Update an existing entity. Partial — only the provided fields are changed.
 * @throws if the entity does not exist.
 */
export async function updateEntity(
  id: string,
  changes: Partial<EntityPayload>,
): Promise<EntityRecord> {
  const existing = await db.entities.get(id)
  if (!existing) throw notFound('entities', id)

  const updated: EntityRecord = { ...existing, ...changes }
  await db.entities.put(updated)
  return updated
}

/**
 * Delete an entity by id.
 * @throws if the entity does not exist.
 */
export async function deleteEntity(id: string): Promise<void> {
  const existing = await db.entities.get(id)
  if (!existing) throw notFound('entities', id)
  await db.entities.delete(id)
}

// ── Rules ─────────────────────────────────────────────────

/** Return all rules, ordered by severity (high → medium → low) then name. */
export async function getRules(): Promise<RuleRecord[]> {
  const ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const all = await db.rules.toArray()
  return all.sort((a, b) => {
    const severityDiff = (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3)
    return severityDiff !== 0 ? severityDiff : a.name.localeCompare(b.name)
  })
}

/** Return a single rule by its primary key, or undefined. */
export async function getRule(id: string): Promise<RuleRecord | undefined> {
  return db.rules.get(id)
}

/** Create a new rule. */
export async function createRule(payload: RulePayload): Promise<RuleRecord> {
  const record: RuleRecord = { ...payload, id: uuid(), createdAt: now() }
  await db.rules.add(record)
  return record
}

/**
 * Update an existing rule. Partial — only the provided fields are changed.
 * @throws if the rule does not exist.
 */
export async function updateRule(
  id: string,
  changes: Partial<RulePayload>,
): Promise<RuleRecord> {
  const existing = await db.rules.get(id)
  if (!existing) throw notFound('rules', id)

  const updated: RuleRecord = { ...existing, ...changes }
  await db.rules.put(updated)
  return updated
}

/**
 * Delete a rule by id.
 *
 * Note: this does NOT cascade to entities — entities may still reference
 * a deleted rule id in their AttachedRule array. The caller is responsible
 * for cleaning up or the UI should handle a missing rule gracefully.
 * @throws if the rule does not exist.
 */
export async function deleteRule(id: string): Promise<void> {
  const existing = await db.rules.get(id)
  if (!existing) throw notFound('rules', id)
  await db.rules.delete(id)
}

// ── GeoJSON Export ────────────────────────────────────────

/**
 * Build a self-contained GeoJSON FeatureCollection containing every entity.
 *
 * Each feature's `properties` includes:
 *   - the entity's metadata fields (name, tagline, description, icon, link)
 *   - the full StyleRecord for the entity's styleType (so the public map
 *     renderer does not need a separate styles lookup)
 *   - the full RuleRecord for each attached rule, merged with the
 *     per-attachment distanceMeters value
 *
 * This output is the contract the public-facing festival map depends on.
 */
export async function exportGeoJSON(): Promise<FeatureCollection> {
  const [entities, styles, rules] = await Promise.all([
    db.entities.toArray(),
    db.styles.toArray(),
    db.rules.toArray(),
  ])

  const styleIndex = new Map(styles.map(s => [s.type, s]))
  const ruleIndex  = new Map(rules.map(r => [r.id,   r]))

  const features: Feature[] = entities.map(entity => {
    const embeddedRules = entity.rules.flatMap(ar => {
      const rule = ruleIndex.get(ar.ruleId)
      if (!rule) return []
      return [{ ...rule, distanceMeters: ar.distanceMeters }]
    })

    const properties: FeatureProperties = {
      id:          entity.id,
      styleType:   entity.styleType,
      name:        entity.name,
      tagline:     entity.tagline,
      description: entity.description,
      icon:        entity.icon,
      link:        entity.link,
      style:       styleIndex.get(entity.styleType) ?? null,
      rules:       embeddedRules,
    }

    return { type: 'Feature', geometry: entity.geometry, properties }
  })

  return { type: 'FeatureCollection', features }
}
