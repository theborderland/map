export type Tab = "Areas" | "Roads" | "POIs" | "Rules" | "Styles";

export type PanelView =
  | { type: "root" }
  | { type: "entity-group"; styleType: string }
  | { type: "entity-detail"; entityId: string }
  | { type: "entity-create"; entityKind: "area" | "road" | "poi"; styleType?: string }
  | { type: "style-detail"; styleId: string }
  | { type: "style-create" }
  | { type: "rule-detail"; ruleId: string }
  | { type: "rule-create" };