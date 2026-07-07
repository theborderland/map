import { useState } from "react";
import type { Geometry } from "geojson";
import type { EntityRecord, RuleRecord, StyleRecord } from "../../db/types";
import { updateEntity, deleteEntity } from "../../db";
import { ROAD_TYPES } from "../../types";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";

interface Props {
  entity: EntityRecord;
  styles: StyleRecord[];
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
}

export default function RoadDetail({ entity, styles, rules, setEntities, goBack, bumpMapKey }: Props) {
  const [name, setName] = useState(entity.name ?? "");
  const [tagline, setTagline] = useState(entity.tagline ?? "");
  const [styleType, setStyleType] = useState(entity.styleType);
  const [attachedRules, setAttachedRules] = useState(entity.rules);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Only show road-specific styles in the dropdown.
  const compatibleStyles = styles.filter((s) => ROAD_TYPES.has(s.type));

  const handleSave = async () => {
    setIsSaving(true);
    const geometry = pendingGeometry ?? entity.geometry;
    const updated = await updateEntity(entity.id, {
      name: name.trim(),
      tagline: tagline.trim(),
      styleType,
      rules: attachedRules,
      geometry,
    });
    setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    if (pendingGeometry) bumpMapKey();
    setIsSaving(false);
  };

  const handleDelete = async () => {
    await deleteEntity(entity.id);
    setEntities((prev) => prev.filter((e) => e.id !== entity.id));
    goBack?.();
  };

  return (
    <div className="entity-detail">
      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Name</label>
          <wa-input
            value={name}
            placeholder="Name"
            onInput={(e: Event) => setName((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Type</label>
          <wa-select
            value={styleType}
            onChange={(e: Event) => setStyleType((e.target as HTMLSelectElement).value)}
          >
            {compatibleStyles.map((s) => (
              <wa-option key={s.id} value={s.type}>{s.displayName}</wa-option>
            ))}
          </wa-select>
        </div>

        <div className="form-field">
          <label className="form-label">Tagline</label>
          <wa-input
            value={tagline}
            placeholder="Short tagline (optional)"
            onInput={(e: Event) => setTagline((e.target as HTMLInputElement).value)}
          />
        </div>

        <RulesSelector
          attachedRules={attachedRules}
          allRules={rules}
          onChange={setAttachedRules}
        />

        <GeometryEditor
          geometry={pendingGeometry ?? entity.geometry}
          onChange={setPendingGeometry}
        />
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
          message={`Delete "${entity.name ?? "this road"}"? This cannot be undone.`}
          onDelete={handleDelete}
        />
      </div>

      <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
    </div>
  );
}