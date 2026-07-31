export type Tab = "Areas" | "Roads" | "POIs" | "Rules" | "Styles" | "Settings";

/** The three entity kinds that can be drawn on the map. */
export type EntityKind = "poi" | "road" | "area";

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