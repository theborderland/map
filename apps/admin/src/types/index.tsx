export type Tab = "Areas" | "Roads" | "POIs" | "Rules" | "Styles" | "Settings";

export type EditMode =
  | "idle"
  // Area modes
  | "vertices"
  | "drag"
  | "draw"
  // Road modes
  | "editLine"
  | "dragLine"
  | "drawLine"
  // POIs
  | "movePOI"
  | "drawPOI"; // place a new point, merging into MultiPoint

/** The three entity kinds that can be drawn on the map. */
export type EntityKind = "poi" | "road" | "area";

/** Maps each entity kind to the EditMode used to draw its geometry from scratch. */
export const CREATE_DRAW_MODE_BY_KIND: Record<EntityKind, Exclude<EditMode, "idle">> = {
  poi: "drawPOI",
  road: "drawLine",
  area: "draw",
};

export const ROAD_TYPES = new Set(["fireroad", "minorroad"]);

export type PanelView =
  | { type: "root"; tab: Tab }
  | { type: "entity-group"; tab: Tab; styleType: string }
  | { type: "entity-detail"; entityId: string }
  | { type: "style-detail"; styleId: string }
  | { type: "style-create" }
  | { type: "rule-detail"; ruleId: string }
  | { type: "rule-create" }
  | { type: "poi-create" }
  | { type: "road-create" }
  | { type: "area-create" };