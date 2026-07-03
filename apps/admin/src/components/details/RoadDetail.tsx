import type { EntityRecord, StyleRecord } from "../../db/types"
import { useEntityForm } from "../../hooks/useEntityForm"
import { EntityFormFields } from "../EntityFormFields"
import { EntityGeometrySection } from "../EntityGeometrySection"
import { ROAD_TYPES } from "../../types"
import DeleteButton from "../DeleteButton"

interface Props {
  entity?: EntityRecord
  styles: StyleRecord[]
  defaultStyleType?: string
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>
  goBack?: () => void
  onAfterCreate?: (id: string) => void
}

export default function RoadDetail({
  entity, styles, defaultStyleType, setEntities, goBack, onAfterCreate, onDelete
}: Props) {
  const entityForm = useEntityForm({ entity, defaultStyleType, setEntities, goBack, onAfterCreate, onDelete })

  const compatibleStyles = styles.filter(s => ROAD_TYPES.has(s.type))
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

      <div className="form-actions">
        {entityForm.isCreate ? (
          <>
          {/* Create mode needs the geometry section above the actions for the status message */}
      {entityForm.isCreate && (
        <EntityGeometrySection
          isCreate={true}
          entity={entity}
          isEditing={entityForm.isEditing}
          pendingGeometry={entityForm.pendingGeometry}
          startEditing={entityForm.startEditing}
          handleCancelGeometry={entityForm.handleCancelGeometry}
        />
      )}
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
            {/* Edit geometry / Cancel shape edit sits alongside Save and Delete */}
            <EntityGeometrySection
              isCreate={false}
              entity={entity}
              isEditing={entityForm.isEditing}
              pendingGeometry={entityForm.pendingGeometry}
              startEditing={entityForm.startEditing}
              handleCancelGeometry={entityForm.handleCancelGeometry}
            />
            <DeleteButton onDelete={entityForm.handleDelete} />
          </>
        )}
      </div>

      {entity && (
        <div className="entity-meta">
          <p className="item-meta">{entity.geometry.type}</p>
          <p className="tagline">Created: {new Date(entity.createdAt).toLocaleString()}</p>
        </div>
      )}
    </div>
  )
}