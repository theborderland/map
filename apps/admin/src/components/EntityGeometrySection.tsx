import type { EntityRecord } from "../db/types";

export function EntityGeometrySection({
  isCreate,
  entity,
  isEditing,
  pendingGeometry,
  startEditing,
  handleCancelGeometry,
}: {
  isCreate: boolean;
  entity?: EntityRecord;
  isEditing: boolean;
  pendingGeometry: GeoJSON.Geometry | null;
  startEditing: (g: GeoJSON.Geometry) => void;
  handleCancelGeometry: () => void;
}) {
  if (isCreate) {
    // In create mode, show a status message and a draw button above the form actions.
    return (
      <div className="geometry-section">
        <p className={pendingGeometry ? "item-meta" : "item-meta form-hint-warning"}>
          {pendingGeometry
            ? "✓ Shape drawn — use the map toolbar to adjust it"
            : "No shape drawn yet"}
        </p>
      </div>
    );
  }

  // In edit mode, return just the button so the caller can place it
  // alongside Save and Delete inside .form-actions.
  if (isEditing) {
    return (
      <wa-button onClick={handleCancelGeometry} size="xs" appearance="outlined">
        <wa-icon slot="start" name="x"></wa-icon>
        Cancel shape edit
      </wa-button>
    );
  }

  return (
    <wa-button
      onClick={() => startEditing(entity!.geometry)}
      size="xs"
      appearance="outlined"
    >
      <wa-icon slot="start" name="pen"></wa-icon>
      Edit shape
    </wa-button>
  );
}