import type { EntityRecord, RuleRecord } from "../../db/types";
import RuleCard from "../RuleCard";

export default function RulesTab({
  entities,
  rules,
  openRule,
}: {
  entities: EntityRecord[];
  rules: RuleRecord[];
  openRule: (id: string) => void;
}) {
  return (
    <div>
      <p className="tab-subtitle">Review and inspect the rule set that governs placement and safety.</p>

      {rules.length === 0 ? (
        <p>No rules available.</p>
      ) : (
        <div className="left-entity-grid">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              entityCount={entities.filter(e => e.rules.some(r => r.ruleId == rule.id)).length}
              onOpen={() => openRule(rule.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}