// Small, reusable card used to present a single style in lists.
// - Uses CSS variables `--swatch-fill` and `--swatch-border` to render the color swatch.
// - Shows the entity name, and meta text.
// - Exposes an `onOpen` callback used by parent lists to open a detail view.
import type { StyleRecord } from "../db/types";
import type { CSSProperties } from "react";

export default function StyleCard({
  style,
  entityCount,
  onOpen,
}: {
  style: StyleRecord;
  entityCount: number;
  onOpen: () => void;
}) {
  // Set CSS variables for the swatch colors. Allows each card to display its
  // own style's fill and border colors without hardcoding them.
  const vars: CSSProperties = {
    ["--swatch-fill" as string]: style?.fillColor ?? "#e5e7eb",
    ["--swatch-border" as string]: style?.borderColor ?? "#d1d5db",
  } as CSSProperties;

  return (
    <div className="card cursor-pointer" style={vars} onClick={onOpen}>
      <div className="card-content">
        <div className="swatch" />
        <div>
          <h3 className="card-title">{style?.displayName || style.id}</h3>
          <p className="card-sub">
            {entityCount} {entityCount === 1 ? "entity" : "entities"}
          </p>
        </div>
      </div>
    </div>
  );
}
