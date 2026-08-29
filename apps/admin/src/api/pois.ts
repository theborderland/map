import type { Geometry } from "geojson";
import { fetchJson, fetchJsonOrUndefined, requestJsonOrThrow, requestOrThrow } from "./httpErrors";
import { poiDtoToEntity, type PoiResponseDto, type AttachedRuleDto } from "./mappers";
import type { EntityRecord, AttachedRule } from "../db/types";

export interface PoiWriteFields {
  name: string;
  tagline?: string;
  description?: string;
  link?: string;
  icon?: string;
  geometry: Geometry;
  rules: AttachedRule[];
}

function toRequestBody(fields: PoiWriteFields) {
  return {
    name: fields.name,
    tagline: fields.tagline,
    description: fields.description,
    link: fields.link,
    icon: fields.icon,
    geometry: fields.geometry,
    rules: fields.rules.map((r): AttachedRuleDto => ({ ruleId: r.ruleId, distanceMeters: r.distanceMeters })),
  };
}

/** Return all POIs, mapped to the frontend's unified EntityRecord shape. */
export async function getPois(): Promise<EntityRecord[]> {
  const dtos = await fetchJson<PoiResponseDto[]>("/pois");
  return dtos.map(poiDtoToEntity);
}

/** Return a single POI by id, or undefined if it doesn't exist. */
export async function getPoi(id: string): Promise<EntityRecord | undefined> {
  const dto = await fetchJsonOrUndefined<PoiResponseDto>(`/pois/${id}`);
  return dto ? poiDtoToEntity(dto) : undefined;
}

/** Create a new POI. */
export async function createPoi(fields: PoiWriteFields): Promise<EntityRecord> {
  const dto = await requestJsonOrThrow<PoiResponseDto>("/pois", {
    method: "POST",
    body: toRequestBody(fields),
  });
  return poiDtoToEntity(dto);
}

/**
 * Update an existing POI. Partial - only the provided fields are changed.
 * The backend's PUT is a full-replace, so this fetches the current record
 * first and merges `changes` on top before sending the complete body.
 * @throws if the POI does not exist.
 */
export async function updatePoi(id: string, changes: Partial<PoiWriteFields>): Promise<EntityRecord> {
  const current = await getPoi(id);
  if (!current) throw new Error(`pois: record "${id}" not found`);

  const merged: PoiWriteFields = {
    name: changes.name ?? current.name ?? "",
    tagline: changes.tagline ?? current.tagline,
    description: changes.description ?? current.description,
    link: changes.link ?? current.link,
    icon: changes.icon ?? current.icon,
    geometry: changes.geometry ?? current.geometry,
    rules: changes.rules ?? current.rules,
  };

  const dto = await requestJsonOrThrow<PoiResponseDto>(`/pois/${id}`, {
    method: "PUT",
    body: toRequestBody(merged),
  });
  return poiDtoToEntity(dto);
}

/**
 * Delete a POI by id.
 * @throws if the POI does not exist.
 */
export async function deletePoi(id: string): Promise<void> {
  await requestOrThrow(`/pois/${id}`, { method: "DELETE" });
}
