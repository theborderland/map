// Small, reusable card used to present a single entity in lists.
// - Uses CSS variables `--swatch-fill` and `--swatch-border` to render the color swatch.
// - Shows the entity name, and meta text.
// - Exposes an `onOpen` callback used by parent lists to open a detail view.
import type { EntityRecord, StyleRecord } from "../db/types";
import type { CSSProperties } from "react";
import { getIconPath } from "../utils/Icons";

export default function EntityCard({
  entity,
  style,
  onOpen,
}: {
  entity: EntityRecord;
  style: StyleRecord | undefined;
  onOpen: () => void;
}) {
  const isPOI = entity.geometry.type === "Point";

  // Set CSS variables for the swatch colors. Allows each card to display its
  // own style's fill and border colors without hardcoding them.
  const cssVariables: CSSProperties = {
    ["--swatch-fill" as string]: style?.fillColor ?? "#e5e7eb",
    ["--swatch-border" as string]: style?.borderColor ?? "#d1d5db",
  };

  return (
    <div className="card cursor-pointer" style={cssVariables} onClick={onOpen}>
      <div className="card-content">
        {isPOI ? (
          // POIs use their icon image instead of the colour swatch.
          // Remove this conditional and always render <div className="swatch" />
          // if you want a uniform look across all entity types.
          <img
            src={getIconPath(entity.icon)}
            alt={entity.icon ?? "info"}
            width={36}
            height={36}
            style={{ objectFit: "contain", flexShrink: 0 }}
          />
        ) : (
          <div className="swatch" />
        )}
        <div>
          <h3 className="card-title">{entity.name || entity.id}</h3>
          <p className="card-sub">
            {entity.geometry.type} · {entity.rules.length} rule{entity.rules.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </div>
  );
}