import { useState } from "react";
import type { Geometry } from "geojson";
import type { EntityRecord, RuleRecord, StyleRecord } from "../../db/types";
import type { EditMode } from "../../types";
import { updateEntity, createEntity, deleteEntity } from "../../db";
import { ROAD_TYPES } from "../../types";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";

interface Props {
  /** Undefined in create mode. */
  entity?: EntityRecord;
  styles: StyleRecord[];
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  pendingGeometryRef: React.RefObject<Geometry | null>;
  onCancelEdit: () => void;
  /** Current global edit mode — used to block Save while an unsaved
   *  draw session is still open on the map (Save/Cancel on the toolbar). */
  editMode: EditMode;
  /** Called with the new area's id after a successful create. */
  onAfterCreate?: (entityId: string) => void;
}

export default function AreaDetail({
  entity,
  styles,
  rules,
  setEntities,
  goBack,
  bumpMapKey,
  pendingGeometryRef,
  onCancelEdit,
  editMode,
  onAfterCreate,
}: Props) {
  const isCreate = !entity;

  const [name, setName] = useState(entity?.name ?? "");
  const [tagline, setTagline] = useState(entity?.tagline ?? "");
  const [styleType, setStyleType] = useState(entity?.styleType ?? "");
  const [attachedRules, setAttachedRules] = useState(entity?.rules ?? []);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const compatibleStyles = styles.filter((s) => !ROAD_TYPES.has(s.type));

  const geometry = pendingGeometry ?? pendingGeometryRef.current ?? entity?.geometry ?? null;

  // Block form save while a draw session is still open on the map —
  // force the user to Save/Cancel that session first.
  const hasOpenDrawSession = editMode !== "idle";
  const canSave = !hasOpenDrawSession &&
    (isCreate ? (!!name.trim() && !!styleType && !!geometry) : !!name.trim());

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);

    if (entity) {
      const updated = await updateEntity(entity.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        styleType,
        rules: attachedRules,
        geometry: geometry!,
      });
      setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    } else {
      const created = await createEntity({
        styleType,
        name: name.trim(),
        tagline: tagline.trim(),
        rules: attachedRules,
        geometry: geometry!,
      });
      setEntities((prev) => [...prev, created]);
      onAfterCreate?.(created.id);
    }

    pendingGeometryRef.current = null;
    bumpMapKey();
    onCancelEdit();
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!entity) return;
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
            {isCreate && <wa-option value="">Select style…</wa-option>}
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

        {geometry ? (
          <GeometryEditor geometry={geometry} onChange={setPendingGeometry} />
        ) : (
          <p className="item-meta">
            Use the "Add area" button on the map to draw this area.
          </p>
        )}

        {hasOpenDrawSession && (
          <p className="item-meta form-hint-warning">
            Finish the current polygon (Save or Cancel on the map) before saving the form.
          </p>
        )}
      </div>

      <div className="form-actions">
        {!isCreate && (
          <DeleteButton
            message={`Delete "${entity!.name ?? "this area"}"? This cannot be undone.`}
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

      {entity && (
        <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
      )}
    </div>
  );
}