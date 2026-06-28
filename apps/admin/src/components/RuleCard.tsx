// Small, reusable card used to present a single rule in lists.
import type { RuleRecord } from "../db/types";

export default function RuleCard({
  rule,
  entityCount,
  onOpen,
}: {
  rule: RuleRecord;
  entityCount: number;
  onOpen: () => void;
}) {
  return (
    <div key={rule.id} className="card cursor-pointer" onClick={onOpen}>
      <div className="item-head">
        <div>
          <h3 className="item-title">{rule.name}</h3>
          <p className="item-meta">Used in {entityCount} place{entityCount === 1 ? "" : "s"}</p>
        </div>
        <span className={`badge severity-${rule.severity}`}>{rule.severity}</span>
      </div>
      <p className="tagline">{rule.id}</p>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem" }}>
        <span className="badge">{rule.ruleType}</span>
      </div>
    </div>
  );
}
