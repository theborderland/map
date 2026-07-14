export type Tab = "Areas" | "Roads" | "POIs" | "Rules" | "Styles";

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

export const ROAD_TYPES = new Set(["fireroad", "minorroad"]);

export type PanelView =
  | { type: "root"; tab: Tab }
  | { type: "entity-group"; tab: Tab; styleType: string }
  | { type: "entity-detail"; entityId: string }
  | { type: "style-detail"; styleId: string }
  | { type: "style-create" }
  | { type: "rule-detail"; ruleId: string }
  | { type: "rule-create" };