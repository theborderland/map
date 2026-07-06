export type Tab = "Areas" | "Roads" | "POIs" | "Rules" | "Styles";

export const ROAD_TYPES = new Set(["fireroad", "minorroad"]);

export type PanelView =
  | { type: "root"; tab: Tab; }
  | { type: "entity-group"; tab: Tab; styleType: string }
  | { type: "entity-detail"; entityId: string }
  | { type: "style-detail"; styleId: string }
  | { type: "rule-detail"; ruleId: string };