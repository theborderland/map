import { useState } from "react";
import type { RuleRecord } from "../../db/types";
import { updateRule, deleteRule } from "../../db";
import DeleteButton from "./DeleteButton";

interface Props {
  rule: RuleRecord;
  setRules: React.Dispatch<React.SetStateAction<RuleRecord[]>>;
  goBack?: () => void;
}

export default function RuleDetail({ rule, setRules, goBack }: Props) {
  const [name, setName] = useState(rule.name);
  const [ruleType, setRuleType] = useState(rule.ruleType);
  const [severity, setSeverity] = useState(rule.severity);
  const [message, setMessage] = useState(rule.message);
  const [hasOverride, setHasOverride] = useState(!!rule.styleOverride);
  const [overrideColor, setOverrideColor] = useState(rule.styleOverride?.fillColor ?? "#ff0000");
  const [overrideOpacity, setOverrideOpacity] = useState(rule.styleOverride?.fillOpacity ?? 0.6);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updated = await updateRule(rule.id, {
      name: name.trim(),
      ruleType,
      severity,
      message: message.trim(),
      styleOverride: hasOverride
        ? { fillColor: overrideColor, fillOpacity: overrideOpacity }
        : undefined,
    });
    setRules((prev) => prev.map((r) => r.id === updated.id ? updated : r));
    setIsSaving(false);
  };

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
          <wa-input
            value={name}
            placeholder="Rule name"
            onInput={(e: Event) => setName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Type</label>
          <wa-select
            value={ruleType}
            onChange={(e: Event) => setRuleType((e.target as HTMLSelectElement).value as RuleRecord["ruleType"])}
          >
            <wa-option value="overlap">Overlap — camp cannot overlap this area</wa-option>
            <wa-option value="proximity">Proximity — camp cannot be within X metres</wa-option>
          </wa-select>
        </div>

        <div className="form-field">
          <label className="form-label">Severity</label>
          <wa-select
            value={severity}
            onChange={(e: Event) => setSeverity((e.target as HTMLSelectElement).value as RuleRecord["severity"])}
          >
            <wa-option value="low">Low</wa-option>
            <wa-option value="medium">Medium</wa-option>
            <wa-option value="high">High</wa-option>
          </wa-select>
        </div>

        <div className="form-field">
          <label className="form-label">Message</label>
          <wa-textarea
            value={message}
            placeholder="Shown to the visitor when this rule is violated"
            rows={3}
            onInput={(e: Event) => setMessage((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        <div className="form-field">
          <wa-checkbox
            defaultChecked={hasOverride || undefined}
            onChange={(e: Event) => setHasOverride((e.target as HTMLInputElement).checked)}
          >
            Apply style override on violation
          </wa-checkbox>
        </div>

        {hasOverride && (
          <>
            <div className="form-field">
              <label className="form-label">Override fill colour</label>
              <wa-color-picker
                value={overrideColor}
                onChange={(e: Event) => setOverrideColor((e.target as HTMLInputElement).value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label">
                Override opacity: {overrideOpacity.toFixed(2)}
              </label>
              <wa-slider
                min={0}
                max={1}
                step={0.05}
                value={overrideOpacity}
                onInput={(e: Event) => setOverrideOpacity(Number((e.target as HTMLInputElement).value))}
              />
            </div>
          </>
        )}
      </div>

      <div className="form-actions">
        <wa-button
          size="xs"
          appearance="outlined"
          disabled={isSaving || undefined}
          onClick={handleSave}
        >
          <wa-icon slot="start" name="floppy-disk"></wa-icon>
          {isSaving ? "Saving…" : "Save changes"}
        </wa-button>
        <DeleteButton
          message={`Delete "${rule.name}"? It will be detached from all entities.`}
          onDelete={handleDelete}
        />
      </div>

      <p className="tagline">Created: {new Date(rule.createdAt).toLocaleString()}</p>
    </div>
  );
}