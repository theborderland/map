import type { EntityRecord, StyleRecord } from '../db/types'
import { useMapStore } from '../store/mapStore'
import { updateEntity } from '../db'

interface Props {
  entity: EntityRecord
  style?: StyleRecord
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>
}
export default function EntityDetail({ entity, style, setEntities }: Props) {
  const { isEditing, startEditing, stopEditing, pendingGeometry } = useMapStore();

  const handleSave = async () => {
    if (!pendingGeometry) return;
    const updated = await updateEntity(entity.id, { geometry: pendingGeometry });
    stopEditing();  // stop first, so the store is idle before entities updates
    setEntities(prev => prev.map(e => e.id === updated.id ? updated : e));
  }

  const handleCancel = () => {
    stopEditing();
  }

  return (
    <div>
      <div className="edit-controls">
        {isEditing ? (
          <>
            <wa-button key="save" onClick={handleSave} size="xs" appearance="outlined" disabled={!pendingGeometry}>
              <wa-icon slot="start" name="floppy-disk"></wa-icon>
              Save
            </wa-button>
            <wa-button key="cancel" onClick={handleCancel} size="xs" appearance="outlined">
              <wa-icon slot="start" name="x"></wa-icon>
              Cancel
            </wa-button>
          </>
        ) : (
          <wa-button key="edit" onClick={startEditing} size="xs" appearance="outlined">
            <wa-icon slot="start" name="pen"></wa-icon>
            Edit
          </wa-button>
        )}
      </div>

      <p className="item-meta">
        {style?.displayName ?? entity.styleType} · {entity.geometry.type}
      </p>
      {entity.tagline && <p className="tagline">{entity.tagline}</p>}
      {entity.description && <p>{entity.description}</p>}
      {entity.link && (
        <p>
          <a href={entity.link} target="_blank" rel="noreferrer">{entity.link}</a>
        </p>
      )}
      <p><strong>Rule references:</strong> {entity.rules.length}</p>
      {entity.rules.length > 0 && (
        <ul>
          {entity.rules.map(rule => (
            <li key={rule.ruleId}>
              {rule.ruleId}{rule.distanceMeters ? ` (${rule.distanceMeters}m)` : ''}
            </li>
          ))}
        </ul>
      )}
      <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
    </div>
  )
}