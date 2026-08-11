import { useEffect, useState } from "react";
import type { EntityRecord, RuleRecord } from "../../db/types";
import { updateEntity, createEntity, deleteEntity } from "../../db";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import IconPicker from "./IconPicker";
import { DEFAULT_POI_ICON } from "../../utils/Icons";
import { useEntityDetailForm } from "../../hooks/useEntityDetailForm";

const POI_STYLE_TYPE = "poi";

interface Props {
  entity?: EntityRecord;
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
  onAfterCreate?: (entityId: string) => void;
  selectedPOIIcon: string;
  onSelectedPOIIconChange: (icon: string) => void;
}

export default function POIDetail({
  entity, rules, setEntities, goBack, bumpMapKey, onAfterCreate,
  selectedPOIIcon, onSelectedPOIIconChange,
}: Props) {
  const [description, setDescription] = useState(entity?.description ?? "");
  const [link, setLink] = useState(entity?.link ?? "");

  const [extraBaseline, setExtraBaseline] = useState({
    description: entity?.description ?? "",
    link: entity?.link ?? "",
    icon: entity?.icon ?? DEFAULT_POI_ICON,
  });

  const form = useEntityDetailForm({
    entity, setEntities, bumpMapKey, goBack,
    extraFieldsDirty:
      description !== extraBaseline.description ||
      link !== extraBaseline.link ||
      selectedPOIIcon !== extraBaseline.icon,
  });

  // Sync the shared icon state to this entity's icon on mount / when
  // switching between entities, so the map draw preview matches this POI.
  useEffect(() => {
    const icon = entity?.icon ?? DEFAULT_POI_ICON;
    onSelectedPOIIconChange(icon);
    setExtraBaseline({
      description: entity?.description ?? "",
      link: entity?.link ?? "",
      icon,
    });
  }, [entity?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () =>
    form.runSave(
      () => ({
        styleType: POI_STYLE_TYPE,
        description: description.trim(),
        link: link.trim(),
        icon: selectedPOIIcon,
      }),
      {
        updateEntity: (id, payload) => updateEntity(id, payload),
        // @ts-ignore
        createEntity: (payload) => createEntity(payload),
        onCreate: (created) => onAfterCreate?.(created.id),
        onSaved: () =>
          setExtraBaseline({ description: description.trim(), link: link.trim(), icon: selectedPOIIcon }),
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
            placeholder="POI name"
            autocomplete="off"
            onInput={(e: Event) => form.setName((e.target as HTMLInputElement).value)}
          />
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
          attachedRules={form.attachedRules}
          allRules={rules}
          onChange={form.setAttachedRules}
        />

        {form.geometry ? (
          <GeometryEditor geometry={form.geometry} onChange={form.setPendingGeometry} />
        ) : (
          <p className="item-meta">
            Use the "Add POI" button on the map to place this POI.
          </p>
        )}

        {form.hasOpenDrawSession && (
          <p className="item-meta form-hint-warning">
            Finish the current point (Save or Cancel on the map) before saving the form.
          </p>
        )}
      </div>

      <div className="form-actions">
        {!form.isCreate && (
          <DeleteButton
            message={`Delete "${entity!.name ?? "this POI"}"? This cannot be undone.`}
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