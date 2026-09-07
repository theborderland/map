import type { Geometry } from "geojson";
import type { EntityRecord, AttachedRule } from "../db/types";

export interface AttachedRuleDto {
  ruleId: string;
  distanceMeters?: number;
}

export interface AreaResponseDto {
  id: string;
  styleType: string;
  name: string;
  tagline?: string;
  geometry: Geometry;
  rules: AttachedRuleDto[];
  createdAt: string;
}

export interface RoadResponseDto extends AreaResponseDto {
  bufferMeters: number;
}

export interface PoiResponseDto {
  id: string;
  styleType: string;
  name: string;
  tagline?: string;
  description?: string;
  link?: string;
  icon?: string;
  geometry: Geometry;
  rules: AttachedRuleDto[];
  createdAt: string;
}

function toAttachedRules(rules: AttachedRuleDto[]): AttachedRule[] {
  return rules.map((r) => ({ ruleId: r.ruleId, distanceMeters: r.distanceMeters }));
}

export function areaDtoToEntity(dto: AreaResponseDto): EntityRecord {
  return {
    id: dto.id,
    styleType: dto.styleType,
    name: dto.name,
    tagline: dto.tagline,
    geometry: dto.geometry,
    rules: toAttachedRules(dto.rules),
    createdAt: dto.createdAt,
  };
}

export function roadDtoToEntity(dto: RoadResponseDto): EntityRecord {
  return { ...areaDtoToEntity(dto), bufferMeters: dto.bufferMeters };
}

export function poiDtoToEntity(dto: PoiResponseDto): EntityRecord {
  return {
    id: dto.id,
    styleType: dto.styleType,
    name: dto.name,
    tagline: dto.tagline,
    description: dto.description,
    link: dto.link,
    icon: dto.icon,
    geometry: dto.geometry,
    rules: toAttachedRules(dto.rules),
    createdAt: dto.createdAt,
  };
}
