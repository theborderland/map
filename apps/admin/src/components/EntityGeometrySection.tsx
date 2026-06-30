import type { EntityRecord } from "../db/types"

export function EntityGeometrySection({
  isCreate,
  entityKind,
  entity,
  isEditing,
  pendingGeometry,
  startEditing,
  startCreatingKind,
  handleCancelGeometry,
}: {
  isCreate: boolean
  entityKind?: "area" | "road" | "poi"
  entity?: EntityRecord
  isEditing: boolean
  pendingGeometry: GeoJSON.Geometry | null
  startEditing: (g: GeoJSON.Geometry) => void
  startCreatingKind: () => void
  handleCancelGeometry: () => void
}) {
  return (
    <div className="geometry-section">
      {isCreate ? (
        <>
          <p className={pendingGeometry ? "item-meta" : "item-meta form-hint-warning"}>
            {pendingGeometry ? "✓ Shape drawn — use the map toolbar to adjust it" : "No shape drawn yet"}
          </p>
          <wa-button onClick={startCreatingKind} size="xs" appearance="outlined" disabled={isEditing}>
            <wa-icon slot="start" name="pen"></wa-icon>
            {pendingGeometry ? "Redraw geometry" : "Draw geometry"}
          </wa-button>
        </>
      ) : (
        <div className="edit-controls">
          {isEditing ? (
            <wa-button onClick={handleCancelGeometry} size="xs" appearance="outlined">
              <wa-icon slot="start" name="x"></wa-icon>
              Cancel shape edit
            </wa-button>
          ) : (
            <wa-button onClick={() => startEditing(entity!.geometry)} size="xs" appearance="outlined">
              <wa-icon slot="start" name="pen"></wa-icon>
              Edit geometry
            </wa-button>
          )}
        </div>
      )}
    </div>
  )
}