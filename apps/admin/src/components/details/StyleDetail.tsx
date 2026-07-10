import { useState } from "react";
import type { StyleRecord } from "../../db/types";
import { updateStyle, createStyle, deleteStyle } from "../../db";
import DeleteButton from "./DeleteButton";

interface Props {
  /** Undefined in create mode. */
  style?: StyleRecord;
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>;
  goBack?: () => void;
  /** Called with the new style's id after a successful create. */
  onAfterCreate?: (styleId: string) => void;
}

export default function StyleDetail({ style, setStyles, goBack, onAfterCreate }: Props) {
  const isCreate = !style;

  // type key is only editable in create mode — immutable after creation
  // since entities reference it as a foreign key.
  const [typeKey, setTypeKey] = useState(style?.type ?? "");
  const [displayName, setDisplayName] = useState(style?.displayName ?? "");
  const [fillColor, setFillColor] = useState(style?.fillColor ?? "#3b82f6");
  const [borderColor, setBorderColor] = useState(style?.borderColor ?? "#1d4ed8");
  const [fillOpacity, setFillOpacity] = useState(style?.fillOpacity ?? 0.3);
  const [borderWidth, setBorderWidth] = useState(style?.borderWidth ?? 2);
  const [dashPattern, setDashPattern] = useState(style?.dashPattern ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const canSave = isCreate
    ? !!typeKey.trim() && !!displayName.trim()
    : !!displayName.trim();

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);

    const payload = {
      type: typeKey.trim().replace(/\s+/g, ""),   // Slugify: strip whitespace from type key.
      displayName: displayName.trim(),
      fillColor,
      borderColor,
      fillOpacity,
      borderWidth,
      dashPattern,
    };

    if (style) {
      const updated = await updateStyle(style.id, payload);
      setStyles((prev) => prev.map((s) => s.id === updated.id ? updated : s));
    } else {
      const created = await createStyle(payload);
      setStyles((prev) => [...prev, created]);
      onAfterCreate?.(created.id);
    }

    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!style) return;
    await deleteStyle(style.id);
    setStyles((prev) => prev.filter((s) => s.id !== style.id));
    goBack?.();
  };

  return (
    <div className="style-detail">
      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">
            Type key
            {isCreate
              ? <span className="form-hint"> — slug, no spaces (e.g. neighbourhood)</span>
              : <span className="form-hint"> — read-only after creation</span>}
          </label>
          <wa-input
            value={isCreate ? typeKey : style.type}
            placeholder="e.g. neighbourhood"
            disabled={!isCreate || undefined}
            style={!isCreate ? { opacity: 0.5 } : undefined}
            onInput={(e: Event) => {
              if (isCreate) setTypeKey((e.target as HTMLInputElement).value);
            }}
          />
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

        {/* Live preview updates as the user adjusts style values. */}
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
        {!isCreate && (
          <DeleteButton
            message={`Delete "${style.displayName}"? Entities using it will fall back to the default style.`}
            onDelete={handleDelete}
          />
        )}
        <wa-button
          size="xs"
          appearance="outlined"
          disabled={(!canSave || isSaving) || undefined}
          onClick={handleSave}
        >
          <wa-icon slot="start" name="floppy-disk"></wa-icon>
          {isSaving ? "Saving…" : isCreate ? "Create" : "Save"}
        </wa-button>
      </div>

      {style && (
        <p className="tagline">Created: {new Date(style.createdAt).toLocaleString()}</p>
      )}
    </div>
  );
}