import type { Geometry } from "geojson";
import { fetchJson, fetchJsonOrUndefined, requestJsonOrThrow, requestOrThrow } from "./httpErrors";
import { areaDtoToEntity, type AreaResponseDto, type AttachedRuleDto } from "./mappers";
import type { EntityRecord, AttachedRule } from "../db/types";

export interface AreaWriteFields {
  styleType: string;
  name: string;
  tagline?: string;
  geometry: Geometry;
  rules: AttachedRule[];
}

function toRequestBody(fields: AreaWriteFields) {
  return {
    styleType: fields.styleType,
    name: fields.name,
    tagline: fields.tagline,
    geometry: fields.geometry,
    rules: fields.rules.map((r): AttachedRuleDto => ({ ruleId: r.ruleId, distanceMeters: r.distanceMeters })),
  };
}

/** Return all areas, mapped to the frontend's unified EntityRecord shape. */
export async function getAreas(): Promise<EntityRecord[]> {
  const dtos = await fetchJson<AreaResponseDto[]>("/areas");
  return dtos.map(areaDtoToEntity);
}

/** Return a single area by id, or undefined if it doesn't exist. */
export async function getArea(id: string): Promise<EntityRecord | undefined> {
  const dto = await fetchJsonOrUndefined<AreaResponseDto>(`/areas/${id}`);
  return dto ? areaDtoToEntity(dto) : undefined;
}

/** Create a new area. */
export async function createArea(fields: AreaWriteFields): Promise<EntityRecord> {
  const dto = await requestJsonOrThrow<AreaResponseDto>("/areas", {
    method: "POST",
    body: toRequestBody(fields),
  });
  return areaDtoToEntity(dto);
}

/**
 * Update an existing area. Partial - only the provided fields are changed.
 * The backend's PUT is a full-replace, so this fetches the current record
 * first and merges `changes` on top before sending the complete body.
 * @throws if the area does not exist.
 */
export async function updateArea(id: string, changes: Partial<AreaWriteFields>): Promise<EntityRecord> {
  const current = await getArea(id);
  if (!current) throw new Error(`areas: record "${id}" not found`);

  const merged: AreaWriteFields = {
    styleType: changes.styleType ?? current.styleType,
    name: changes.name ?? current.name ?? "",
    tagline: changes.tagline ?? current.tagline,
    geometry: changes.geometry ?? current.geometry,
    rules: changes.rules ?? current.rules,
  };

  const dto = await requestJsonOrThrow<AreaResponseDto>(`/areas/${id}`, {
    method: "PUT",
    body: toRequestBody(merged),
  });
  return areaDtoToEntity(dto);
}

/**
 * Delete an area by id.
 * @throws if the area does not exist.
 */
export async function deleteArea(id: string): Promise<void> {
  await requestOrThrow(`/areas/${id}`, { method: "DELETE" });
}
