import type { Geometry, MultiLineString, MultiPoint, MultiPolygon } from "geojson";
import type { EntityKind } from "../types";

type MultiGeometry = MultiPoint | MultiLineString | MultiPolygon;

/**
 * Determines which backend table (Area/Road/Poi) a geometry belongs to.
 * Mirrors the switch in utils/panelNavigation.ts's getEntityTab - duplicated
 * rather than imported because that function returns a UI Tab, and this
 * module intentionally doesn't depend on UI navigation types.
 */

export function entityKindFromGeometry(geometry: Geometry): EntityKind {
  switch (geometry.type) {
    case "Polygon":
    case "MultiPolygon":
      return "area";

    case "LineString":
    case "MultiLineString":
      return "road";

    case "Point":
    case "MultiPoint":
      return "poi";

    default:
      throw new Error("Unsupported kind");

  }
}

export const MULTI_TO_SINGLE_TYPES = {
  MultiPoint: "Point",
  MultiLineString: "LineString",
  MultiPolygon: "Polygon",
} as const;

export function isMultiGeometry(geometry: Geometry): geometry is MultiGeometry {
  return geometry.type in MULTI_TO_SINGLE_TYPES;
}