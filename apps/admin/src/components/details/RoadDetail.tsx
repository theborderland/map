import { useState } from "react";
import type { Geometry } from "geojson";
import type { EntityRecord, RuleRecord, StyleRecord } from "../../db/types";
import { updateEntity, createEntity, deleteEntity } from "../../db";
import { ROAD_TYPES } from "../../types";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import { useMapEditStore } from "../../store/mapEditStore";

interface Props {
  entity?: EntityRecord;
  styles: StyleRecord[];
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  /** Called with the new road's id after a successful create. */
  onAfterCreate?: (entityId: string) => void;
}

export default function RoadDetail({
  entity, styles, rules, setEntities, goBack, bumpMapKey, onAfterCreate,
}: Props) {
  const isCreate = !entity;

  // Only editMode is subscribed reactively — it drives canSave/hasOpenDrawSession
  // and needs to trigger a re-render when a draw session starts/ends.
  const editMode = useMapEditStore((s) => s.editMode);

  const [name,            setName]            = useState(entity?.name ?? "");
  const [tagline,         setTagline]         = useState(entity?.tagline ?? "");
  const [styleType,       setStyleType]       = useState(entity?.styleType ?? "");
  const [attachedRules,   setAttachedRules]   = useState(entity?.rules ?? []);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [isSaving,        setIsSaving]        = useState(false);
  const [bufferMeters,    setBufferMeters]    = useState(
    entity?.bufferMeters ?? (entity?.styleType === "fireroad" ? 5 : 2)
  );

  // Only show road-specific styles in the dropdown.
  const compatibleStyles = styles.filter((s) => ROAD_TYPES.has(s.type));

  // Auto-fill a sensible buffer default the first time a type is chosen —
  // only in create mode, never overrides an existing road's saved value.
  const handleStyleTypeChange = (newType: string) => {
    setStyleType(newType);
    if (isCreate) setBufferMeters(newType === "fireroad" ? 5 : 2);
  };

  // Prefer local GeometryEditor edits, then map tool edits from the store
  // (read imperatively — same non-reactive semantics as the original ref),
  // then fall back to the entity's existing geometry.
  const geometry = pendingGeometry ?? useMapEditStore.getState().pendingGeometry ?? entity?.geometry ?? null;

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
        bufferMeters,
      });
      setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    } else {
      const created = await createEntity({
        styleType,
        name: name.trim(),
        tagline: tagline.trim(),
        rules: attachedRules,
        bufferMeters,
        geometry: geometry!,
      });
      setEntities((prev) => [...prev, created]);
      onAfterCreate?.(created.id);
    }

    useMapEditStore.getState().setPendingGeometry(null);
    bumpMapKey();
    // Exit geometry edit mode if active — restores buffered display.
    useMapEditStore.getState().cancelEdit();
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!entity) return;
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
            onChange={(e: Event) => handleStyleTypeChange((e.target as HTMLSelectElement).value)}
          >
            {isCreate && <wa-option value="">Select type…</wa-option>}
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
          attachedRules={attachedRules}
          allRules={rules}
          onChange={setAttachedRules}
        />

        {geometry ? (
          <GeometryEditor geometry={geometry} onChange={setPendingGeometry} />
        ) : (
          <p className="item-meta">
            Use the "Add road" button on the map to draw this road.
          </p>
        )}

        {hasOpenDrawSession && (
          <p className="item-meta form-hint-warning">
            Finish the current line (Save or Cancel on the map) before saving the form.
          </p>
        )}
      </div>

      <div className="form-actions">
        {!isCreate && (
          <DeleteButton
            message={`Delete "${entity!.name ?? "this road"}"? This cannot be undone.`}
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
          {isSaving ? "Saving…" : isCreate ? "Create" : "Save changes"}
        </wa-button>
      </div>

      {entity && (
        <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
      )}
    </div>
  );
}