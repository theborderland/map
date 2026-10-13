import type { Geometry } from "geojson";
import { fetchJson, fetchJsonOrUndefined, requestJsonOrThrow, requestOrThrow } from "./httpErrors";
import { roadDtoToEntity, type RoadResponseDto, type AttachedRuleDto } from "./mappers";
import type { EntityRecord, AttachedRule } from "../db/types";

export interface RoadWriteFields {
  styleType: string;
  name: string;
  tagline?: string;
  widthMeters: number;
  geometry: Geometry;
  rules: AttachedRule[];
}

function toRequestBody(fields: RoadWriteFields) {
  return {
    styleType: fields.styleType,
    name: fields.name,
    tagline: fields.tagline,
    widthMeters: fields.widthMeters,
    geometry: fields.geometry,
    rules: fields.rules.map((r): AttachedRuleDto => ({ ruleId: r.ruleId, distanceMeters: r.distanceMeters })),
  };
}

/** Return all roads, mapped to the frontend's unified EntityRecord shape. */
export async function getRoads(): Promise<EntityRecord[]> {
  const dtos = await fetchJson<RoadResponseDto[]>("/roads");
  return dtos.map(roadDtoToEntity);
}

/** Return a single road by id, or undefined if it doesn't exist. */
export async function getRoad(id: string): Promise<EntityRecord | undefined> {
  const dto = await fetchJsonOrUndefined<RoadResponseDto>(`/roads/${id}`);
  return dto ? roadDtoToEntity(dto) : undefined;
}

/** Create a new road. */
export async function createRoad(fields: RoadWriteFields): Promise<EntityRecord> {
  const dto = await requestJsonOrThrow<RoadResponseDto>("/roads", {
    method: "POST",
    body: toRequestBody(fields),
  });
  return roadDtoToEntity(dto);
}

/**
 * Update an existing road. Partial - only the provided fields are changed.
 * The backend's PUT is a full-replace, so this fetches the current record
 * first and merges `changes` on top before sending the complete body.
 * @throws if the road does not exist.
 */
export async function updateRoad(id: string, changes: Partial<RoadWriteFields>): Promise<EntityRecord> {
  const current = await getRoad(id);
  if (!current) throw new Error(`roads: record "${id}" not found`);

  const merged: RoadWriteFields = {
    styleType: changes.styleType ?? current.styleType,
    name: changes.name ?? current.name ?? "",
    tagline: changes.tagline ?? current.tagline,
    widthMeters: changes.widthMeters ?? current.widthMeters ?? 0,
    geometry: changes.geometry ?? current.geometry,
    rules: changes.rules ?? current.rules,
  };

  const dto = await requestJsonOrThrow<RoadResponseDto>(`/roads/${id}`, {
    method: "PUT",
    body: toRequestBody(merged),
  });
  return roadDtoToEntity(dto);
}

/**
 * Delete a road by id.
 * @throws if the road does not exist.
 */
export async function deleteRoad(id: string): Promise<void> {
  await requestOrThrow(`/roads/${id}`, { method: "DELETE" });
}
