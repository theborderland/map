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
  pendingGeometryRef: React.RefObject<GeoJSON.Geometry | null>;
  onCancelEdit: () => void;
}

export default function AreaDetail({
  entity,
  styles,
  rules,
  setEntities,
  goBack,
  bumpMapKey,
  pendingGeometryRef,
  onCancelEdit
}: Props) {
  const [name, setName] = useState(entity.name ?? "");
  const [tagline, setTagline] = useState(entity.tagline ?? "");
  const [styleType, setStyleType] = useState(entity.styleType);
  const [attachedRules, setAttachedRules] = useState(entity.rules);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const compatibleStyles = styles.filter((s) => !ROAD_TYPES.has(s.type));

  const handleSave = async () => {
    setIsSaving(true);
    // Prefer local GeometryEditor edits, then map tool edits (vertex/drag),
    // then fall back to the entity's existing geometry.
    const geometry = pendingGeometry ?? pendingGeometryRef.current ?? entity.geometry;
    const updated = await updateEntity(entity.id, {
      name: name.trim(),
      tagline: tagline.trim(),
      styleType,
      rules: attachedRules,
      geometry,
    });

    setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    if (pendingGeometry || pendingGeometryRef.current) {
      // Bump map version so GeoJSON layers remount with the new geometry.
      bumpMapKey();
      // Clear the map edit ref so it isn't accidentally reused on next save.
      pendingGeometryRef.current = null;
    }

    // Exit geometry edit mode if it was active when the user clicked Save changes.
    onCancelEdit();
    setIsSaving(false);
  };

  const handleDelete = async () => {
    await deleteEntity(entity.id);
    setEntities((prev) => prev.filter((e) => e.id !== entity.id));
    goBack?.();
    onCancelEdit();
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
          <label className="form-label">Style</label>
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
        <DeleteButton
          message={`Delete "${entity.name ?? "this area"}"? This cannot be undone.`}
          onDelete={handleDelete}
        />
        <wa-button
          size="xs"
          appearance="outlined"
          disabled={isSaving || undefined}
          onClick={handleSave}
        >
          <wa-icon slot="start" name="floppy-disk"></wa-icon>
          {isSaving ? "Saving…" : "Save"}
        </wa-button>
      </div>

      <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
    </div>
  );
}