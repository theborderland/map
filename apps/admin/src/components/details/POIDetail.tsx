import { useEffect, useState } from "react";
import type { Geometry } from "geojson";
import type { EntityRecord, RuleRecord } from "../../db/types";
import { updateEntity, createEntity, deleteEntity } from "../../db";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import IconPicker from "./IconPicker";
import { DEFAULT_POI_ICON } from "../../utils/Icons";
import { useMapEditStore } from "../../store/mapEditStore";

const POI_STYLE_TYPE = "poi";

interface Props {
  /** Undefined in create mode. */
  entity?: EntityRecord;
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  /** Called with the new POI's id after a successful create. */
  onAfterCreate?: (entityId: string) => void;
  selectedPOIIcon: string;
  onSelectedPOIIconChange: (icon: string) => void;
}

export default function POIDetail({
  entity,
  rules,
  setEntities,
  goBack,
  bumpMapKey,
  onAfterCreate,
  selectedPOIIcon,
  onSelectedPOIIconChange,
}: Props) {
  const isCreate = !entity;

  const editMode = useMapEditStore((s) => s.editMode);

  const [name, setName] = useState(entity?.name ?? "");
  const [tagline, setTagline] = useState(entity?.tagline ?? "");
  const [description, setDescription] = useState(entity?.description ?? "");
  const [link, setLink] = useState(entity?.link ?? "");
  const [attachedRules, setAttachedRules] = useState(entity?.rules ?? []);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const geometry = pendingGeometry ?? useMapEditStore.getState().pendingGeometry ?? entity?.geometry ?? null;

  // Sync the shared icon state to this entity's icon on mount / when
  // switching between entities, so the map draw preview matches this POI.
  useEffect(() => {
    onSelectedPOIIconChange(entity?.icon ?? DEFAULT_POI_ICON);
  }, [entity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Block form save while a draw session is still open (Save/Cancel visible
  // on the map toolbar) — force the user to confirm that session first so
  // its temporary layer doesn't get orphaned on the map.
  const hasOpenDrawSession = editMode !== "idle";
  const canSave = !hasOpenDrawSession && (isCreate ? (!!name.trim() && !!geometry) : !!name.trim());

  const handleSave = async () => {
    if (!canSave) return;
    setIsSaving(true);

    if (entity) {
      const updated = await updateEntity(entity.id, {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        link: link.trim(),
        icon: selectedPOIIcon,
        rules: attachedRules,
        geometry: geometry!,
      });
      setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    } else {
      const created = await createEntity({
        styleType: POI_STYLE_TYPE,
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        link: link.trim(),
        icon: selectedPOIIcon,
        rules: attachedRules,
        geometry: geometry!,
      });
      setEntities((prev) => [...prev, created]);
      onAfterCreate?.(created.id);
    }

    useMapEditStore.getState().setPendingGeometry(null);
    bumpMapKey();
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
          <label className="form-label">Tagline</label>
          <wa-input
            value={tagline}
            placeholder="Short tagline (optional)"
            onInput={(e: Event) => setTagline((e.target as HTMLInputElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Description</label>
          <wa-textarea
            value={description}
            placeholder="Description (optional)"
            rows={3}
            onInput={(e: Event) => setDescription((e.target as HTMLTextAreaElement).value)}
          />
        </div>

        <div className="form-field">
          <label className="form-label">Link</label>
          <wa-input
            type="url"
            value={link}
            placeholder="https://… (optional)"
            onInput={(e: Event) => setLink((e.target as HTMLInputElement).value)}
          />
        </div>

        <IconPicker value={selectedPOIIcon} onChange={onSelectedPOIIconChange} />

        <RulesSelector
          attachedRules={attachedRules}
          allRules={rules}
          onChange={setAttachedRules}
        />

        {geometry ? (
          <GeometryEditor geometry={geometry} onChange={setPendingGeometry} />
        ) : (
          <p className="item-meta">
            Use the "Add POI" button on the map to place this POI.
          </p>
        )}

        {hasOpenDrawSession && (
          <p className="item-meta form-hint-warning">
            Finish the current point (Save or Cancel on the map) before saving the form.
          </p>
        )}
      </div>

      <div className="form-actions">
        {!isCreate && (
          <DeleteButton
            message={`Delete "${entity!.name ?? "this POI"}"? This cannot be undone.`}
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