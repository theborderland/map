// Types mirroring the BLMapServer swagger (areas, pois, roads, rules, styles).
// Geometry is untyped in the swagger ({}), but is expected to be a GeoJSON geometry.

export type ApiGeometry = GeoJSON.Geometry | string | null;

export interface AttachedRuleDto {
    ruleId: string;
    distanceMeters?: number | null;
}

export interface StyleOverrideDto {
    fillColor?: string | null;
    fillOpacity?: number;
}

export interface StyleResponseDto {
    id: string;
    type?: string | null;
    displayName?: string | null;
    fillColor?: string | null;
    borderColor?: string | null;
    fillOpacity?: number;
    borderWidth?: number;
    dashPattern?: string | null;
    createdAt?: string;
}

export interface RuleResponseDto {
    id: string;
    name?: string | null;
    ruleType?: string | null;
    severity?: string | null;
    message?: string | null;
    styleOverride?: StyleOverrideDto | null;
    createdAt?: string;
}

interface BaseEntityDto {
    id: string;
    styleType?: string | null;
    name?: string | null;
    tagline?: string | null;
    geometry?: ApiGeometry;
    rules?: AttachedRuleDto[] | null;
    createdAt?: string;
}

export interface AreaResponseDto extends BaseEntityDto {}

export interface RoadResponseDto extends BaseEntityDto {
    bufferMeters?: number;
}

export interface PoiResponseDto extends BaseEntityDto {
    description?: string | null;
    link?: string | null;
    icon?: string | null;
}

/** Everything the map needs from the API, fetched in one go. */
export interface MapData {
    areas: AreaResponseDto[];
    pois: PoiResponseDto[];
    roads: RoadResponseDto[];
    rules: RuleResponseDto[];
    styles: StyleResponseDto[];
}
