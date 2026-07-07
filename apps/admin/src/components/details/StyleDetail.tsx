import { useState } from "react";
import type { StyleRecord } from "../../db/types";
import { updateStyle, deleteStyle } from "../../db";
import DeleteButton from "./DeleteButton";

interface Props {
  style: StyleRecord;
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>;
  goBack?: () => void;
}

export default function StyleDetail({ style, setStyles, goBack }: Props) {
  const [displayName, setDisplayName] = useState(style.displayName);
  const [fillColor, setFillColor] = useState(style.fillColor);
  const [borderColor, setBorderColor] = useState(style.borderColor);
  const [fillOpacity, setFillOpacity] = useState(style.fillOpacity);
  const [borderWidth, setBorderWidth] = useState(style.borderWidth);
  const [dashPattern, setDashPattern] = useState(style.dashPattern);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const updated = await updateStyle(style.id, {
      displayName: displayName.trim(),
      fillColor,
      borderColor,
      fillOpacity,
      borderWidth,
      dashPattern,
    });
    setStyles((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    setIsSaving(false);
  };

  const handleDelete = async () => {
    await deleteStyle(style.id);
    setStyles((prev) => prev.filter((s) => s.id !== style.id));
    goBack?.();
  };

  return (
    <div className="style-detail">
      <div className="form-fields">
        {/* Type key is read-only after creation — it is used as a foreign key on entities. */}
        <div className="form-field">
          <label className="form-label">Type key</label>
          <wa-input value={style.type} disabled />
        </div>

        <div className="form-field">
          <label className="form-label">Display name</label>
          <wa-input
            value={displayName}
            placeholder="e.g. Neighbourhood"
            onInput={(e: Event) => setDisplayName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <div className="form-field">
            <wa-color-picker
              value={fillColor}
              label="Fill colour"
              onChange={(e: Event) => setFillColor((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="form-field">
            <wa-color-picker
              value={borderColor}
              label="Border colour"
              onChange={(e: Event) => setBorderColor((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div className="form-field">
          <label className="form-label">Fill opacity: {fillOpacity.toFixed(2)}</label>
          <wa-slider
            min={0}
            max={1}
            step={0.05}
            value={fillOpacity}
            onInput={(e: Event) => setFillOpacity(Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Border width (px)</label>
          <wa-input
            type="number"
            value={borderWidth.toString()}
            min={0}
            max={20}
            onInput={(e: Event) => setBorderWidth(Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <div className="form-field">
          <label className="form-label">
            Dash pattern
            <span className="form-hint"> — e.g. 5,5 or empty for solid</span>
          </label>
          <wa-input
            value={dashPattern}
            placeholder="5,5"
            onInput={(e: Event) => setDashPattern((e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Live preview updates in real time as the user adjusts style values. */}
        <div className="form-field">
          <label className="form-label">Preview</label>
          <div
            style={{
              height: 40,
              borderRadius: 6,
              background: fillColor,
              opacity: Math.min(fillOpacity + 0.3, 1),
              border: `${borderWidth}px ${dashPattern ? "dashed" : "solid"} ${borderColor}`,
            }}
          />
        </div>
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
          message={`Delete "${style.displayName}"? Entities using it will fall back to the default style.`}
          onDelete={handleDelete}
        />
      </div>

      <p className="tagline">Created: {new Date(style.createdAt).toLocaleString()}</p>
    </div>
  );
}