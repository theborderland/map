import type { RuleRecord } from "../../db/types";
import { deleteRule } from "../../db";
import DeleteButton from "./DeleteButton";

interface Props {
  rule: RuleRecord;
  setRules: React.Dispatch<React.SetStateAction<RuleRecord[]>>;
  goBack?: () => void;
}

export default function RuleDetail({ rule, setRules, goBack }: Props) {
  const handleDelete = async () => {
    await deleteRule(rule.id);
    setRules((prev) => prev.filter((r) => r.id !== rule.id));
    goBack?.();
  };

  return (
    <div className="rule-detail">
      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Name</label>
          <p>{rule.name}</p>
        </div>
        <div className="form-field">
          <label className="form-label">Type</label>
          <p>{rule.ruleType === "overlap" ? "Overlap" : "Proximity"}</p>
        </div>
        <div className="form-field">
          <label className="form-label">Severity</label>
          <span className={`badge severity-${rule.severity}`}>{rule.severity}</span>
        </div>
        <div className="form-field">
          <label className="form-label">Message</label>
          <p>{rule.message}</p>
        </div>
        {rule.styleOverride && (
          <div className="form-field">
            <label className="form-label">Style override</label>
            <div className="grid" style={{ gridTemplateColumns: "auto auto" }}>
              <span className="badge">Fill: {rule.styleOverride.fillColor}</span>
              <span className="badge">Opacity: {rule.styleOverride.fillOpacity}</span>
            </div>
          </div>
        )}
      </div>
      <div className="form-actions">
        <DeleteButton
          message={`Delete "${rule.name}"? It will be detached from all entities.`}
          onDelete={handleDelete}
        />
      </div>
      <p className="tagline">Created: {new Date(rule.createdAt).toLocaleString()}</p>
    </div>
  );
}