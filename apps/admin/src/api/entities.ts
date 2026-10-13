import type { FeatureCollection, Feature } from "geojson";
import type { EntityKind } from "../types";
import type { EntityRecord, EntityPayload, FeatureProperties } from "../db/types";
import { entityKindFromGeometry } from "../utils/entityKindFromGeometry";
import { getAreas, getArea, createArea, updateArea, deleteArea } from "./areas";
import { getRoads, getRoad, createRoad, updateRoad, deleteRoad } from "./roads";
import { getPois, getPoi, createPoi, updatePoi, deletePoi } from "./pois";
import { getStyles } from "./styles";
import { getRules } from "./rules";

/**
 * Return a single entity by id. The caller must state which table to look
 * in - there's no cross-table id uniqueness guaranteed (each table's id is
 * generated independently), so this never guesses; it goes straight to the
 * table you tell it to.
 */
export async function getEntity(id: string, kind: EntityKind): Promise<EntityRecord | undefined> {
  switch (kind) {
    case "area":
      return getArea(id);
    case "road":
      return getRoad(id);
    case "poi":
      return getPoi(id);
  }
}

/**
 * Create a new entity. Routes to the Area/Road/Poi endpoint based on the
 * payload's geometry type, and sends only the fields that endpoint accepts.
 */
export async function createEntity(payload: EntityPayload): Promise<EntityRecord> {
  const kind = entityKindFromGeometry(payload.geometry);

  switch (kind) {
    case "area":
      return createArea({
        styleType: payload.styleType,
        name: payload.name ?? "",
        tagline: payload.tagline,
        geometry: payload.geometry,
        rules: payload.rules,
      });
    case "road":
      return createRoad({
        styleType: payload.styleType,
        name: payload.name ?? "",
        tagline: payload.tagline,
        widthMeters: payload.widthMeters ?? 0,
        geometry: payload.geometry,
        rules: payload.rules,
      });
    case "poi":
      return createPoi({
        name: payload.name ?? "",
        tagline: payload.tagline,
        description: payload.description,
        link: payload.link,
        icon: payload.icon,
        geometry: payload.geometry,
        rules: payload.rules,
      });
  }
}

/**
 * Update an existing entity. Partial - only the provided fields are changed.
 *
 * Requires `changes.geometry` to be present so the correct backend table
 * (area/road/poi) can be determined - every current call site already
 * includes it: the shared entity detail form always sends the full
 * geometry, and the map's geometry-only quick-save (mapEditStore's
 * saveGeometry) sends `{ geometry }` specifically for this reason. Throws
 * clearly if it's ever called without it, rather than guessing.
 * @throws if `changes.geometry` is missing, or if the entity does not exist.
 */
export async function updateEntity(id: string, changes: Partial<EntityPayload>): Promise<EntityRecord> {
  if (!changes.geometry) {
    throw new Error(
      "updateEntity: \"geometry\" must be included in changes so the correct backend table " +
      `(area/road/poi) can be determined - got keys: ${Object.keys(changes).join(", ") || "(none)"}`
    );
  }
  const kind = entityKindFromGeometry(changes.geometry);

  switch (kind) {
    case "area":
      return updateArea(id, changes);
    case "road":
      return updateRoad(id, changes);
    case "poi":
      return updatePoi(id, changes);
  }
}

/**
 * Delete an entity by id. The caller must state which table to delete
 * from - there's no cross-table id uniqueness guaranteed (each table's id
 * is generated independently), so this never guesses or probes; it issues
 * exactly one DELETE, to the table you tell it to.
 */
export async function deleteEntity(id: string, kind: EntityKind): Promise<void> {
  switch (kind) {
    case "area":
      return deleteArea(id);
    case "road":
      return deleteRoad(id);
    case "poi":
      return deletePoi(id);
  }
}

/**
 * Build a self-contained GeoJSON FeatureCollection containing every entity,
 * fetched fresh from the API. Logic mirrors the old Dexie-backed version -
 * GeoJSON export ownership (backend vs. frontend) is still an open
 * question (see handoff doc 04), so this stays a frontend-assembled export
 * for now, just sourced from the real API instead of local IndexedDB tables.
 */
export async function exportGeoJSON(): Promise<FeatureCollection> {
  const [[areas, roads, pois], styles, rules] = await Promise.all([
    Promise.all([getAreas(), getRoads(), getPois()]),
    getStyles(),
    getRules(),
  ]);
  const entities = [...areas, ...roads, ...pois];

  const styleIndex = new Map(styles.map((s) => [s.type, s]));
  const ruleIndex = new Map(rules.map((r) => [r.id, r]));

  const features: Feature[] = entities.map((entity) => {
    const embeddedRules = entity.rules.flatMap((ar) => {
      const rule = ruleIndex.get(ar.ruleId);
      if (!rule) return [];
      return [{ ...rule, distanceMeters: ar.distanceMeters }];
    });

    const properties: FeatureProperties = {
      id: entity.id,
      styleType: entity.styleType,
      name: entity.name,
      tagline: entity.tagline,
      description: entity.description,
      icon: entity.icon,
      link: entity.link,
      style: styleIndex.get(entity.styleType) ?? null,
      rules: embeddedRules,
    };

    return { type: "Feature", geometry: entity.geometry, properties };
  });

  return { type: "FeatureCollection", features };
}
