// Compact card representing a group of entities that share a style type.
// - Uses CSS variables `--swatch-fill` and `--swatch-border` to render the color swatch.
// - Clicking the card triggers `onOpen` to open the group's child list.
import type { StyleRecord } from "../db/types";
import type { CSSProperties } from "react";

export default function GroupedEntityCard({
  groupName,
  groupCount,
  style,
  onOpen,
}: {
  groupName: string;
  groupCount: number;
  style: StyleRecord | undefined;
  onOpen: () => void;
}) {
  // Set CSS variables for the swatch colors, allowing each group card to
  // display its style's fill and border colors dynamically.
  const vars: CSSProperties = {
    ["--swatch-fill" as any]: style?.fillColor ?? "#e5e7eb",
    ["--swatch-border" as any]: style?.borderColor ?? "#d1d5db",
  } as CSSProperties;

  return (
    <div className="card grouped-card cursor-pointer" style={vars} onClick={onOpen}>
      <div className="card-content">
        <div className="swatch" />
        <div>
          <h2 className="card-title">{groupName}</h2>
          <p className="card-sub">{groupCount} item{groupCount === 1 ? "" : "s"}</p>
        </div>
      </div>
    </div>
  );
}
