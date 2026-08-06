import { useState } from "react";
import type { EntityRecord, RuleRecord, StyleRecord } from "../../db/types";
import { updateEntity, createEntity, deleteEntity } from "../../db";
import { ROAD_TYPES } from "../../types";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import { useEntityDetailForm } from "../../hooks/useEntityDetailForm";

interface Props {
  entity?: EntityRecord;
  styles: StyleRecord[];
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  onAfterCreate?: (entityId: string) => void;
}

export default function RoadDetail({
  entity, styles, rules, setEntities, goBack, bumpMapKey, onAfterCreate,
}: Props) {
  const [styleType, setStyleType] = useState(entity?.styleType ?? "");
  const [bufferMeters, setBufferMeters] = useState(
    entity?.bufferMeters ?? (entity?.styleType === "fireroad" ? 5 : 2)
  );
  const [extraBaseline, setExtraBaseline] = useState({
    styleType: entity?.styleType ?? "",
    bufferMeters: entity?.bufferMeters ?? (entity?.styleType === "fireroad" ? 5 : 2),
  });
  const compatibleStyles = styles.filter((s) => ROAD_TYPES.has(s.type));

  const form = useEntityDetailForm({
    entity, setEntities, bumpMapKey, goBack,
    extraFieldsValid: !!styleType,
    extraFieldsDirty:
      styleType !== extraBaseline.styleType ||
      bufferMeters !== extraBaseline.bufferMeters,
  });

  // Auto-fill a sensible buffer default the first time a type is chosen —
  // only in create mode, never overrides an existing road's saved value.
  const handleStyleTypeChange = (newType: string) => {
    setStyleType(newType);
    if (form.isCreate) setBufferMeters(newType === "fireroad" ? 5 : 2);
  };

  const handleSave = () =>
    form.runSave(
      () => ({ styleType, bufferMeters }),
      {
        updateEntity: (id, payload) => updateEntity(id, payload),
        createEntity: (payload) => createEntity(payload),
        onCreate: (created) => onAfterCreate?.(created.id),
        onSaved: () => setExtraBaseline({ styleType, bufferMeters }),
      }
    );

  const handleDelete = () => form.runDelete(deleteEntity);

  return (
    <div className="entity-detail">
      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Name</label>
          <wa-input
            value={form.name}
            placeholder="Name"
            onInput={(e: Event) => form.setName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Type</label>
          <wa-select
            value={styleType}
            onChange={(e: Event) => handleStyleTypeChange((e.target as HTMLSelectElement).value)}
          >
            {form.isCreate && <wa-option value="">Select type…</wa-option>}
            {compatibleStyles.map((s) => (
              <wa-option key={s.id} value={s.type}>{s.displayName}</wa-option>
            ))}
          </wa-select>
        </div>

        <div className="form-field">
          <label className="form-label">Tagline</label>
          <wa-input
            value={form.tagline}
            placeholder="Short tagline (optional)"
            onInput={(e: Event) => form.setTagline((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Road width (metres)</label>
          <wa-input
            type="number"
            value={bufferMeters.toString()}
            min={1}
            max={100}
            step={1}
            onInput={(e: Event) => setBufferMeters(Number((e.target as HTMLInputElement).value))}
          />
        </div>

        <RulesSelector
          attachedRules={form.attachedRules}
          allRules={rules}
          onChange={form.setAttachedRules}
        />

        {form.geometry ? (
          <GeometryEditor geometry={form.geometry} onChange={form.setPendingGeometry} />
        ) : (
          <p className="item-meta">
            Use the "Add road" button on the map to draw this road.
          </p>
        )}

        {form.hasOpenDrawSession && (
          <p className="item-meta form-hint-warning">
            Finish the current line (Save or Cancel on the map) before saving the form.
          </p>
        )}
      </div>

      <div className="form-actions">
        {!form.isCreate && (
          <DeleteButton
            message={`Delete "${entity!.name ?? "this road"}"? This cannot be undone.`}
            onDelete={handleDelete}
          />
        )}
        <wa-button
          size="xs"
          appearance="outlined"
          disabled={(!form.canSave || form.isSaving) || undefined}
          onClick={handleSave}
        >
          <wa-icon slot="start" name="floppy-disk"></wa-icon>
          {form.isSaving ? "Saving…" : form.isCreate ? "Create" : "Save changes"}
        </wa-button>
      </div>

      {entity && (
        <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
      )}
    </div>
  );
}