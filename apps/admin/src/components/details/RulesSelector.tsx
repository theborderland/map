import { useState } from "react";
import type { AttachedRule, RuleRecord } from "../../db/types";

interface Props {
  attachedRules: AttachedRule[];
  allRules: RuleRecord[];
  /** Called whenever the attached rules array changes. */
  onChange: (rules: AttachedRule[]) => void;
}

export default function RulesSelector({ attachedRules, allRules, onChange }: Props) {
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [distanceMeters, setDistanceMeters] = useState("");

  const selectedRule = allRules.find((r) => r.id === selectedRuleId);
  // Only show rules that are not already attached.
  const availableRules = allRules.filter(
    (r) => !attachedRules.some((ar) => ar.ruleId === r.id)
  );

  const handleAdd = () => {
    if (!selectedRuleId) return;
    const newRule: AttachedRule = { ruleId: selectedRuleId };
    if (selectedRule?.ruleType === "proximity" && distanceMeters) {
      newRule.distanceMeters = parseFloat(distanceMeters);
    }
    onChange([...attachedRules, newRule]);
    setSelectedRuleId("");
    setDistanceMeters("");
  };

  const handleRemove = (ruleId: string) => {
    onChange(attachedRules.filter((r) => r.ruleId !== ruleId));
  };

  return (
    <div className="form-field">
      <label className="form-label">Rules</label>

      {attachedRules.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.5rem" }}>
          {attachedRules.map((ar) => {
            const rule = allRules.find((r) => r.id === ar.ruleId);
            return (
              <div
                key={ar.ruleId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.1rem 0.2rem",
                  border: "1px solid lightgray",
                  borderRadius: "20px",
                  fontSize: "0.82rem",
                }}
              >
                <span>
                  <span className={`badge severity-${rule?.severity}`}>{rule?.severity}</span>
                  {" "}{rule?.name ?? ar.ruleId}
                  {ar.distanceMeters ? ` — ${ar.distanceMeters} m` : ""}
                </span>
                <wa-button
                  pill
                  id="remove-button"
                  size="xs"
                  appearance="plain"
                  variant="danger"
                  onClick={() => handleRemove(ar.ruleId)}
                  title="remove"
                >
                  <wa-icon name="x"></wa-icon>
                </wa-button>
                <wa-tooltip placement="left" for="remove-button">
            Delete
          </wa-tooltip>
              </div>
            );
          })}
        </div>
      )}

      {allRules.length === 0 ? (
        <p className="item-meta">No rules defined yet.</p>
      ) : availableRules.length > 0 ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <wa-select
            value={selectedRuleId}
            placeholder="Add a rule…"
            size="s"
            style={{ flex: 1 }}
            onChange={(e: Event) => setSelectedRuleId((e.target as HTMLSelectElement).value)}
          >
            {availableRules.map((r) => (
              <wa-option key={r.id} value={r.id}>
                {r.name} ({r.severity})
              </wa-option>
            ))}
          </wa-select>

          {/* Distance input only shown for proximity rule type. */}
          {selectedRule?.ruleType === "proximity" && (
            <wa-input
              type="number"
              value={distanceMeters}
              placeholder="Distance (m)"
              size="s"
              min={0}
              style={{ width: "9rem" }}
              onInput={(e: Event) => setDistanceMeters((e.target as HTMLInputElement).value)}
            />
          )}

          <wa-button
            size="xs"
            appearance="outlined"
            disabled={!selectedRuleId || undefined}
            onClick={handleAdd}
          >
            <wa-icon slot="start" name="plus"></wa-icon>
            Add
          </wa-button>
        </div>
      ) : (
        <p className="item-meta">All rules are already attached.</p>
      )}
    </div>
  );
}