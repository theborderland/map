import { useState } from "react";
import type { EntityRecord, RuleRecord, StyleRecord } from "../../db/types";
import { updateEntity, createEntity, deleteRoad } from "../../api";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import { useEntityDetailForm } from "../../hooks/useEntityDetailForm";

const DEFAULT_ROAD_WIDTH_METER = 2;
interface Props {
  entity?: EntityRecord;
  initialStyleType?: string;
  styles: StyleRecord[];
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  onAfterCreate?: (entityId: string) => void;
}

export default function RoadDetail({
  entity, initialStyleType, styles, rules, setEntities, goBack, bumpMapKey, onAfterCreate,
}: Props) {
  const [styleType, setStyleType] = useState(entity?.styleType ?? initialStyleType ?? "");
  const [widthMeters, setWidthMeters] = useState(entity?.widthMeters ?? DEFAULT_ROAD_WIDTH_METER);
  const [extraBaseline, setExtraBaseline] = useState({
    styleType: entity?.styleType ?? initialStyleType ?? "",
    widthMeters: entity?.widthMeters,
  });

  const form = useEntityDetailForm({
    entity, setEntities, bumpMapKey, goBack,
    extraFieldsValid: !!styleType,
    extraFieldsDirty:
      styleType !== extraBaseline.styleType ||
      widthMeters !== extraBaseline.widthMeters,
  });

  const handleSave = () =>
    form.runSave(
      () => ({ styleType, widthMeters: widthMeters }),
      {
        updateEntity: (id, payload) => updateEntity(id, payload),
        // @ts-ignore
        createEntity: (payload) => createEntity(payload),
        onCreate: (created) => onAfterCreate?.(created.id),
        onSaved: () => setExtraBaseline({ styleType, widthMeters }),
      }
    );

  const handleDelete = () => form.runDelete(deleteRoad);
  const reset = () => {
    setStyleType(extraBaseline.styleType);
    setWidthMeters(extraBaseline.widthMeters ?? DEFAULT_ROAD_WIDTH_METER);
    form.reset();
  };

  const handleCancel = () => {
    if (form.isDirty) {
      reset();
    } else {
      goBack?.();
    }
  };

  return (
    <div className="entity-detail">
      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Name</label>
          <wa-input
            value={form.name}
            placeholder="Road name"
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
            {form.isCreate && <wa-option value="">Select style</wa-option>}
            {styles.map((s) => (
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
            value={widthMeters.toString()}
            min={1}
            max={100}
            step={1}
            onInput={(e: Event) => setWidthMeters(Number((e.target as HTMLInputElement).value))}
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

      {form.saveError && <p className="error-message">{form.saveError}</p>}

      <div className="form-actions">
        <DeleteButton
          message={`Delete "${entity?.name ?? "this road"}"? This cannot be undone.`}
          onDelete={handleDelete}
          disabled={form.isCreate}
        />
        <wa-button size="xs" appearance="outlined" onClick={handleCancel} disabled={form.isSaving}>
          <wa-icon slot="start" name={form.isDirty ? "xmark" : "chevron-left"}></wa-icon>
          {form.isDirty ? "Cancel" : "Back"}
        </wa-button>
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