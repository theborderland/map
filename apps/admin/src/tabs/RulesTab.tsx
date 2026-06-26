import type { ReactNode } from "react";
import type { RuleRecord } from "../db/types";

export default function RulesTab({
  rules,
  openChild,
}: {
  rules: RuleRecord[];
  openChild: (content: ReactNode, title?: string) => void;
}) {
  const showDetail = (rule: RuleRecord) => {
    const ruleDetails = (
      <div className="card">
        <h3>{rule.name}</h3>
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

    openChild(ruleDetails, rule.name);
  };

  return (
    <div>
      <p className="grouped-entity-subtitle">Review and inspect the rule set that governs placement and safety.</p>

      {rules.length === 0 ? (
        <p>No rules available.</p>
      ) : (
        <div className="grid">
          {rules.map((rule) => (
            <div key={rule.id} className="card cursor-pointer" onClick={() => showDetail(rule)}>
              <div className="item-head">
                <div>
                  <h3 className="item-title">{rule.name}</h3>
                  <p className="item-meta">{rule.ruleType} · {rule.message}</p>
                </div>
                <span className={`badge severity-${rule.severity}`}>{rule.severity}</span>
              </div>
              <p className="tagline">{rule.id}</p>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.75rem" }}>
                <span className="badge">{rule.ruleType}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}