import type { EntityRecord, StyleRecord } from "../../db/types";
import { deleteEntity } from "../../db";
import DeleteButton from "./DeleteButton";

interface Props {
  entity: EntityRecord;
  styles: StyleRecord[];
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  goBack?: () => void;
}

export default function POIDetail({ entity, styles, setEntities, goBack }: Props) {
  const style = styles.find((s) => s.type === entity.styleType);

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
          <p>{entity.name ?? "—"}</p>
        </div>
        <div className="form-field">
          <label className="form-label">Style</label>
          <p>{style?.displayName ?? entity.styleType}</p>
        </div>
        {entity.tagline && (
          <div className="form-field">
            <label className="form-label">Tagline</label>
            <p>{entity.tagline}</p>
          </div>
        )}
        {entity.description && (
          <div className="form-field">
            <label className="form-label">Description</label>
            <p>{entity.description}</p>
          </div>
        )}
        {entity.link && (
          <div className="form-field">
            <label className="form-label">Link</label>
            <a href={entity.link} target="_blank" rel="noreferrer" className="item-meta">
              {entity.link}
            </a>
          </div>
        )}
        {entity.rules.length > 0 && (
          <div className="form-field">
            <label className="form-label">Rules</label>
            <ul>
              {entity.rules.map((r) => (
                <li key={r.ruleId} className="item-meta">
                  {r.ruleId}{r.distanceMeters ? ` (${r.distanceMeters} m)` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="form-actions">
        <DeleteButton
          message={`Delete "${entity.name ?? "this POI"}"? This cannot be undone.`}
          onDelete={handleDelete}
        />
      </div>
      <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
    </div>
  );
}