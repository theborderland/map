export type Tab = "Areas" | "Roads" | "POIs" | "Rules" | "Styles";

export type PanelView =
  | { type: 'root' }
  | { type: 'entity-group'; styleType: string }
  | { type: 'entity-detail'; entityId: string }
  | { type: 'style-detail'; styleId: string }
  | { type: 'rule-detail'; ruleId: string };