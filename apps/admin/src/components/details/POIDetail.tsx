import { useState } from "react";
import type { Geometry } from "geojson";
import type { EntityRecord, RuleRecord } from "../../db/types";
import { updateEntity, deleteEntity } from "../../db";
import DeleteButton from "./DeleteButton";
import GeometryEditor from "./GeometryEditor";
import RulesSelector from "./RulesSelector";
import IconPicker from "./IconPicker";
import { DEFAULT_POI_ICON } from "../../utils/Icons";


interface Props {
  entity: EntityRecord;
  rules: RuleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
  bumpMapKey: () => void;
}

export default function POIDetail({ entity, rules, setEntities, goBack, bumpMapKey }: Props) {
  const [name, setName] = useState(entity.name ?? "");
  const [tagline, setTagline] = useState(entity.tagline ?? "");
  const [description, setDescription] = useState(entity.description ?? "");
  const [link, setLink] = useState(entity.link ?? "");
  const [icon, setIcon] = useState(entity.icon ?? DEFAULT_POI_ICON);
  const [attachedRules, setAttachedRules] = useState(entity.rules);
  const [pendingGeometry, setPendingGeometry] = useState<Geometry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const geometry = pendingGeometry ?? entity.geometry;
    const updated = await updateEntity(entity.id, {
      name: name.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      link: link.trim(),
      icon,
      rules: attachedRules,
      geometry,
    });
    setEntities((prev) => prev.map((e) => e.id === updated.id ? updated : e));
    bumpMapKey();
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

        <IconPicker value={icon} onChange={setIcon} />

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
          message={`Delete "${entity.name ?? "this POI"}"? This cannot be undone.`}
          onDelete={handleDelete}
        />
      </div>

      <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
    </div>
  );
}