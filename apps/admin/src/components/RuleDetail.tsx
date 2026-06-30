import { useState } from "react"
import type { RuleRecord } from "../db/types"
import { createRule, updateRule } from "../db"

interface Props {
  rule?:          RuleRecord   // undefined = create mode
  setRules:       React.Dispatch<React.SetStateAction<RuleRecord[]>>
  onAfterCreate?: (id: string) => void
}

export default function RuleDetail({ rule, setRules, onAfterCreate }: Props) {
  const isCreate = !rule

  const [name,        setName]       = useState(rule?.name     ?? "")
  const [ruleType,    setRuleType]   = useState(rule?.ruleType ?? "overlap")
  const [severity,    setSeverity]   = useState(rule?.severity ?? "medium")
  const [message,     setMessage]    = useState(rule?.message  ?? "")
  const [hasOverride, setHasOverride] = useState(!!rule?.styleOverride)
  const [overrideColor,   setOverrideColor]   = useState(rule?.styleOverride?.fillColor   ?? "#ff0000")
  const [overrideOpacity, setOverrideOpacity] = useState(rule?.styleOverride?.fillOpacity ?? 0.6)

  const canSave = !!name.trim() && !!message.trim()

  const handleSave = async () => {
    if (!canSave) return

    const payload = {
      name:      name.trim(),
      ruleType:  ruleType as RuleRecord["ruleType"],
      severity:  severity as RuleRecord["severity"],
      message:   message.trim(),
      styleOverride: hasOverride
        ? { fillColor: overrideColor, fillOpacity: overrideOpacity }
        : undefined,
    }

    if (rule) {
      const updated = await updateRule(rule.id, payload)
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r))
    } else {
      const created = await createRule(payload)
      setRules(prev => [...prev, created])
      onAfterCreate?.(created.id)
    }
  }

  return (
    <div className="rule-detail">

      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Name</label>
          <input
            className="form-input"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Rule name"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Type</label>
          <select className="form-select" value={ruleType} onChange={e => setRuleType(e.target.value)}>
            <option value="overlap">Overlap — camp cannot overlap this area</option>
            <option value="proximity">Proximity — camp cannot be within X metres</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Severity</label>
          <select className="form-select" value={severity} onChange={e => setSeverity(e.target.value)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div className="form-field">
          <label className="form-label">Message</label>
          <textarea
            className="form-input"
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Shown to the visitor when this rule is violated"
            rows={3}
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            <input
              type="checkbox"
              checked={hasOverride}
              onChange={e => setHasOverride(e.target.checked)}
              style={{ marginRight: "0.4rem" }}
            />
            Apply style override on violation
          </label>

          {hasOverride && (
            <div className="form-field" style={{ marginTop: "0.5rem" }}>
              <label className="form-label">Override fill colour</label>
              <input
                type="color"
                value={overrideColor}
                onChange={e => setOverrideColor(e.target.value)}
              />
              <label className="form-label" style={{ marginTop: "0.5rem" }}>
                Override opacity: {overrideOpacity.toFixed(2)}
              </label>
              <input
                type="range"
                min={0} max={1} step={0.05}
                value={overrideOpacity}
                onChange={e => setOverrideOpacity(Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      <div className="form-actions">
        <wa-button onClick={handleSave} size="xs" appearance={isCreate ? "filled" : "outlined"} disabled={!canSave}>
          <wa-icon slot="start" name="floppy-disk"></wa-icon>
          {isCreate ? "Create" : "Save changes"}
        </wa-button>
      </div>

      {rule && (
        <p className="tagline" style={{ marginTop: "1rem" }}>
          Created: {new Date(rule.createdAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}