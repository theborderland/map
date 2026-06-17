// EntityCard
// Small, reusable card used to present a single entity in lists.
// - Uses CSS variables `--swatch-fill` and `--swatch-border` to render the color swatch.
// - Shows the entity name, and meta text.
// - Exposes an `onOpen` callback used by parent lists to open a detail view.
import type { EntityRecord, StyleRecord } from "../db/types";
import type { CSSProperties } from "react";

export default function EntityCard({
  entity,
  style,
  onOpen,
}: {
  entity: EntityRecord;
  style: StyleRecord | undefined;
  onOpen: () => void;
}) {
  // Set CSS variables for the swatch colors. Allows each card to display its
  // own style's fill and border colors without hardcoding them.
  const vars: CSSProperties = {
    ["--swatch-fill" as any]: style?.fillColor ?? "#e5e7eb",
    ["--swatch-border" as any]: style?.borderColor ?? "#d1d5db",
  } as CSSProperties;

  return (
    <div className="card card--entity" style={vars}>
      <div className="card-content">
        <div className="swatch" />
        <div>
          <h3 className="card-title">{entity.name || entity.id}</h3>
          <p className="card-sub">{entity.geometry.type} · {entity.rules.length} drawn</p>
        </div>
      </div>
      <wa-button size="xs" appearance="outlined" className="action-button" onClick={onOpen}>
        <wa-icon slot="start" name="pen"></wa-icon>
        Edit
      </wa-button>
    </div>
  );
}
