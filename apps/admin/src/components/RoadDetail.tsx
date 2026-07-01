import type { EntityRecord, StyleRecord } from "../db/types"
import { useMapStore } from "../store/mapStore"
import { useEntityForm } from "../hooks/useEntityForm"
import { EntityFormFields } from "./EntityFormFields"
import { EntityGeometrySection } from "./EntityGeometrySection"
import { ROAD_TYPES } from "../types"

interface Props {
  entity?: EntityRecord
  styles: StyleRecord[]
  defaultStyleType?: string
  setEntities: React.Dispatch<React.SetStateAction<EntityRecord[]>>
  onCancel?: () => void
  onAfterCreate?: (id: string) => void
}

export default function RoadDetail({
  entity, styles, defaultStyleType, setEntities, onCancel, onAfterCreate,
}: Props) {
  const { startCreating } = useMapStore()
  const f = useEntityForm({ entity, defaultStyleType, setEntities, onCancel, onAfterCreate })

  const compatibleStyles = styles.filter(s => ROAD_TYPES.has(s.type))
  const canSave = f.isCreate
    ? !!f.name.trim() && !!f.selectedStyleType && !!f.pendingGeometry
    : !!f.name.trim()

  return (
    <div className="entity-detail">
      <div className="form-fields">
        <EntityFormFields
          name={f.name} setName={f.setName}
          selectedStyleType={f.selectedStyleType} setSelectedStyleType={f.setSelectedStyleType}
          tagline={f.tagline} setTagline={f.setTagline}
          compatibleStyles={compatibleStyles}
        />
      </div>

      <EntityGeometrySection
        isCreate={f.isCreate}
        entity={entity}
        isEditing={f.isEditing}
        pendingGeometry={f.pendingGeometry}
        startEditing={f.startEditing}
        startCreatingKind={() => startCreating("road")}
        handleCancelGeometry={f.handleCancelGeometry}
      />

      <div className="form-actions">
        {f.isCreate ? (
          <>
            <wa-button onClick={() => f.handleSave()} size="xs" appearance="filled" disabled={!canSave}>
              <wa-icon slot="start" name="floppy-disk"></wa-icon>
              Create
            </wa-button>
            <wa-button onClick={f.handleCancelGeometry} size="xs" appearance="outlined">
              <wa-icon slot="start" name="x"></wa-icon>
              Cancel
            </wa-button>
          </>
        ) : (
          <wa-button onClick={() => f.handleSave()} size="xs" appearance="outlined" disabled={!canSave}>
            <wa-icon slot="start" name="floppy-disk"></wa-icon>
            Save changes
          </wa-button>
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