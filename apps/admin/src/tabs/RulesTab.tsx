import type { PanelView } from "../types";
import type { EntityRecord, RuleRecord } from "../db/types";
import RuleCard from "../components/RuleCard";

export default function RulesTab({
  entities,
  rules,
  navigate,
}: {
  entities: EntityRecord[];
  rules: RuleRecord[];
  navigate: (view: PanelView) => void;
}) {
  return (
    <div>
      <p className="grouped-entity-subtitle">Review and inspect the rule set that governs placement and safety.</p>

      {rules.length === 0 ? (
        <p>No rules available.</p>
      ) : (
        <div className="grid">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              entityCount={entities.filter(e => e.rules.some(r => r.ruleId == rule.id)).length}
              onOpen={() => navigate({ type: "rule-detail", ruleId: rule.id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}