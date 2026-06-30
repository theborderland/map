import type { Geometry } from "geojson"

// ── Primitives ────────────────────────────────────────────

export type RuleType = "overlap" | "proximity"
export type Severity = "low" | "medium" | "high"

/** A rule reference stored inside an entity record. */
export interface AttachedRule {
  ruleId: string
  /** Only relevant when the parent RuleRecord has ruleType 'proximity'. */
  distanceMeters?: number
}

// ── Table records (what gets stored in Dexie) ─────────────

export interface StyleRecord {
  id: string
  /** Slug key used as styleType on entities, e.g. 'neighbourhood'. */
  type: string
  displayName: string
  fillColor: string
  borderColor: string
  /** 0–1 */
  fillOpacity: number
  /** Pixels */
  borderWidth: number
  /** SVG dash array string, e.g. '5,5'. Empty string means solid. */
  dashPattern: string
  createdAt: string
}

export interface EntityRecord {
  id: string
  /** References StyleRecord.type */
  styleType: string
  name?: string
  tagline?: string
  description?: string
  /** Icon filename without extension, e.g. 'toilet' → /icons/toilet.png */
  icon?: string
  link?: string
  geometry: Geometry
  rules: AttachedRule[]
  createdAt: string
}

export interface RuleRecord {
  id: string
  name: string
  ruleType: RuleType
  severity: Severity
  /** Shown to the festival visitor when the rule is violated. */
  message: string
  /** If present, overrides the fill of the visitor's drawn camp on violation. */
  styleOverride?: {
    fillColor: string
    fillOpacity: number
  }
  createdAt: string
}

// ── Payload types (fields the caller provides; id + createdAt are generated) ─

export type StylePayload  = Omit<StyleRecord,  "id" | "createdAt">
export type EntityPayload = Omit<EntityRecord, "id" | "createdAt">
export type RulePayload   = Omit<RuleRecord,   "id" | "createdAt">

// ── Export shape ──────────────────────────────────────────

/** Properties embedded in each GeoJSON feature on export. */
export interface FeatureProperties {
  id: string
  styleType: string
  name?: string
  tagline?: string
  description?: string
  icon?: string
  link?: string
  /** Full style definition, embedded so the public map renderer is self-contained. */
  style: StyleRecord | null
  /** Full rule definitions, embedded so the rule engine needs no extra lookups. */
  rules: Array<RuleRecord & { distanceMeters?: number }>
}
