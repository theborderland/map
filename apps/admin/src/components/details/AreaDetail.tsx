import type { EntityRecord, RuleRecord, StyleRecord } from "../../db/types";
import { updateEntity, createEntity, deleteEntity } from "../../db";
import { ROAD_TYPES } from "../../types";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import { useEntityDetailForm } from "../../hooks/useEntityDetailForm";
import { useState } from "react";

interface Props {
  /** Undefined in create mode. */
  entity?: EntityRecord;
  styles: StyleRecord[];
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  /** Called with the new area's id after a successful create. */
  onAfterCreate?: (entityId: string) => void;
}

export default function AreaDetail({
  entity, styles, rules, setEntities, goBack, bumpMapKey, onAfterCreate,
}: Props) {
  const [styleType, setStyleType] = useState(entity?.styleType ?? "");
  const compatibleStyles = styles.filter((s) => !ROAD_TYPES.has(s.type));
  // Last-saved styleType — compared against current styleType to feed
  // extraFieldsDirty so the shared hook's Save button reacts to this too.
  const [styleTypeBaseline, setStyleTypeBaseline] = useState(entity?.styleType ?? "");

  const form = useEntityDetailForm({
    entity, setEntities, bumpMapKey, goBack,
    extraFieldsValid: !!styleType,
    extraFieldsDirty: styleType !== styleTypeBaseline,
  });

  const handleSave = () =>
    form.runSave(
      () => ({ styleType }),
      {
        updateEntity: (id, payload) => updateEntity(id, payload),
        // @ts-ignore
        createEntity: (payload) => createEntity(payload), 
        onCreate: (created) => onAfterCreate?.(created.id),
        onSaved: () => setStyleTypeBaseline(styleType),
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
            placeholder="Area name"
            autocomplete="off"
            onInput={(e: Event) => form.setName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Style</label>
          <wa-select
            value={styleType}
            onChange={(e: Event) => setStyleType((e.target as HTMLSelectElement).value)}
          >
            {form.isCreate && <wa-option value="">Select style…</wa-option>}
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

        <RulesSelector
          attachedRules={form.attachedRules}
          allRules={rules}
          onChange={form.setAttachedRules}
        />

        {form.geometry ? (
          <GeometryEditor geometry={form.geometry} onChange={form.setPendingGeometry} />
        ) : (
          <p className="item-meta">
            Use the "Add area" button on the map to draw this area.
          </p>
        )}

        {form.hasOpenDrawSession && (
          <p className="item-meta form-hint-warning">
            Finish the current polygon (Save or Cancel on the map) before saving the form.
          </p>
        )}
      </div>

      <div className="form-actions">
        {!form.isCreate && (
          <DeleteButton
            message={`Delete "${entity!.name ?? "this area"}"? This cannot be undone.`}
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
          {form.isSaving ? "Saving…" : form.isCreate ? "Create" : "Save"}
        </wa-button>
      </div>

      {entity && (
        <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
      )}
    </div>
  );
}