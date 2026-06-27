import type { RuleRecord } from "../db/types";

export default function RuleDetail({ rule }: { rule: RuleRecord }) {
  return (
    <div>
        <p className="item-meta">{rule.ruleType} · {rule.severity}</p>
        <p>{rule.message}</p>
        {rule.styleOverride && (
          <div>
            <p><strong>Style override</strong></p>
            <div className="grid" style={{ gridTemplateColumns: "auto auto" }}>
              <div className="badge">Fill: {rule.styleOverride.fillColor}</div>
              <div className="badge">Opacity: {rule.styleOverride.fillOpacity}</div>
            </div>
          </div>
        )}
        <p className="tagline">Created: {new Date(rule.createdAt).toLocaleString()}</p>
      </div>
  );
}