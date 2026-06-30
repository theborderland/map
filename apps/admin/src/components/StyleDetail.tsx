import { useState } from "react"
import type { StyleRecord } from "../db/types"
import { createStyle, updateStyle } from "../db"

interface Props {
  style?: StyleRecord   // undefined = create mode
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>
  onAfterCreate?: (id: string) => void
}

export default function StyleDetail({ style, setStyles, onAfterCreate }: Props) {
  const isCreate = !style

  const [typeKey, setTypeKey] = useState(style?.type ?? "")
  const [displayName, setDisplayName] = useState(style?.displayName ?? "")
  const [fillColor, setFillColor] = useState(style?.fillColor ?? "#3b82f6")
  const [borderColor, setBorderColor] = useState(style?.borderColor ?? "#1d4ed8")
  const [fillOpacity, setFillOpacity] = useState(style?.fillOpacity ?? 0.3)
  const [borderWidth, setBorderWidth] = useState(style?.borderWidth ?? 2)
  const [dashPattern, setDashPattern] = useState(style?.dashPattern ?? "")

  const canSave = isCreate
    ? !!typeKey.trim() && !!displayName.trim()
    : !!displayName.trim()

  const handleSave = async () => {
    if (!canSave) return

    const payload = {
      type: typeKey.trim().replace(/\s+/g, ""),  // slugify
      displayName: displayName.trim(),
      fillColor,
      borderColor,
      fillOpacity,
      borderWidth,
      dashPattern,
    }

    if (style) {
      const updated = await updateStyle(style.id, payload)
      setStyles(prev => prev.map(s => s.id === updated.id ? updated : s))
    } else {
      const created = await createStyle(payload)
      setStyles(prev => [...prev, created])
      onAfterCreate?.(created.id)
    }
  }

  return (
    <div className="style-detail">

      <div className="form-fields">

        <div className="form-field">
          <label className="form-label">
            Type key
            {isCreate
              ? <span className="form-hint"> — slug, no spaces, e.g. neighbourhood</span>
              : <span className="form-hint"> — read-only after creation</span>}
          </label>
          <input
            className="form-input"
            type="text"
            value={typeKey}
            onChange={e => setTypeKey(e.target.value)}
            placeholder="e.g. neighbourhood"
            readOnly={!isCreate}
            style={{ opacity: isCreate ? 1 : 0.5 }}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Display name</label>
          <input
            className="form-input"
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="e.g. Neighbourhood"
          />
        </div>

        <div className="form-field">
          <label className="form-label">Fill colour</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <wa-color-picker value={fillColor} label="Fill" onChange={
              // @ts-ignore
              (e) => setFillColor(e.target.value)
            } />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Border colour</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <wa-color-picker value={borderColor} label="Border" onChange={
              // @ts-ignore
              (e) => setFillColor(e.target.value)
            } />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Fill opacity: {fillOpacity.toFixed(2)}</label>
          <input
            type="range" min={0} max={1} step={0.05}
            value={fillOpacity}
            onChange={e => setFillOpacity(Number(e.target.value))}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Border width (px)</label>
          <input
            className="form-input"
            type="number" min={0} max={20}
            value={borderWidth}
            onChange={e => setBorderWidth(Number(e.target.value))}
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            Dash pattern
            <span className="form-hint"> — e.g. 5,5 or empty for solid</span>
          </label>
          <input
            className="form-input"
            type="text"
            value={dashPattern}
            onChange={e => setDashPattern(e.target.value)}
            placeholder="5,5"
          />
        </div>

        {/* Live preview */}
        <div className="form-field">
          <label className="form-label">Preview</label>
          <div style={{
            height: 40,
            borderRadius: 6,
            background: fillColor,
            opacity: fillOpacity + 0.3,
            border: `${borderWidth}px ${dashPattern ? "dashed" : "solid"} ${borderColor}`,
          }} />
        </div>
      </div>

      <div className="form-actions">
        <wa-button onClick={handleSave} size="xs" appearance={isCreate ? "filled" : "outlined"} disabled={!canSave}>
          <wa-icon slot="start" name="floppy-disk"></wa-icon>
          {isCreate ? "Create" : "Save changes"}
        </wa-button>
      </div>

      {style && (
        <p className="tagline" style={{ marginTop: "1rem" }}>
          Created: {new Date(style.createdAt).toLocaleString()}
        </p>
      )}
    </div>
  )
}