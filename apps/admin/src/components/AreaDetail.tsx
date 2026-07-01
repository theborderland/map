import type { EntityRecord, StyleRecord } from "../db/types"
import { useMapStore } from "../store/mapStore"
import { useEntityForm } from "../hooks/useEntityForm"
import { EntityFormFields } from "./EntityFormFields"
import { EntityGeometrySection } from "./EntityGeometrySection"
import { ROAD_TYPES } from "../types"
import DeleteButton from "./DeleteButton"

interface Props {
  entity?: EntityRecord;
  styles: StyleRecord[];
  defaultStyleType?: string;
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>;
  onCancel?: () => void;
  onAfterCreate?: (id: string) => void;
  onDelete?: () => void;
}

export default function AreaDetail({
  entity, styles, defaultStyleType, setEntities, onCancel, onAfterCreate, onDelete
}: Props) {
  const { startCreating } = useMapStore()
  const entityForm = useEntityForm({ entity, defaultStyleType, setEntities, onCancel, onAfterCreate, onDelete })

  const compatibleStyles = styles.filter(s => !ROAD_TYPES.has(s.type))
  const canSave = entityForm.isCreate
    ? !!entityForm.name.trim() && !!entityForm.selectedStyleType && !!entityForm.pendingGeometry
    : !!entityForm.name.trim()

  return (
    <div className="entity-detail">
      <div className="form-fields">
        <EntityFormFields
          name={entityForm.name} setName={entityForm.setName}
          selectedStyleType={entityForm.selectedStyleType} setSelectedStyleType={entityForm.setSelectedStyleType}
          tagline={entityForm.tagline} setTagline={entityForm.setTagline}
          compatibleStyles={compatibleStyles}
        />
      </div>

      <EntityGeometrySection
        isCreate={entityForm.isCreate}
        entity={entity}
        isEditing={entityForm.isEditing}
        pendingGeometry={entityForm.pendingGeometry}
        startEditing={entityForm.startEditing}
        startCreatingKind={() => startCreating("area")}
        handleCancelGeometry={entityForm.handleCancelGeometry}
      />

      <div className="form-actions">
        {entityForm.isCreate ? (
          <>
            <wa-button onClick={() => entityForm.handleSave()} size="xs" appearance="filled" disabled={!canSave}>
              <wa-icon slot="start" name="floppy-disk"></wa-icon>
              Create
            </wa-button>
            <wa-button onClick={entityForm.handleCancelGeometry} size="xs" appearance="outlined">
              <wa-icon slot="start" name="x"></wa-icon>
              Cancel
            </wa-button>
          </>
        ) : (
          <>
            <wa-button onClick={() => entityForm.handleSave()} size="xs" appearance="outlined" disabled={!canSave}>
              <wa-icon slot="start" name="floppy-disk"></wa-icon>
              Save changes
            </wa-button>
            <DeleteButton onDelete={entityForm.handleDelete} />
          </>
        )}
      </div>

      {entity && (
        <div className="entity-meta">
          <p className="item-meta">{entity.geometry.type}</p>
          {entity.rules.length > 0 && (
            <>
              <p><strong>Rules:</strong> {entity.rules.length}</p>
              <ul>
                {entity.rules.map(r => (
                  <li key={r.ruleId}>{r.ruleId}{r.distanceMeters ? ` (${r.distanceMeters} m)` : ""}</li>
                ))}
              </ul>
            </>
          )}
          <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}