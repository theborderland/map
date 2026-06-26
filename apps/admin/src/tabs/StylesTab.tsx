import type { ReactNode } from "react";
import type { EntityRecord, StyleRecord } from "../db/types";
import StyleCard from "../components/StyleCard";

export default function StylesTab({
  entities,
  styles,
  openChild,
}: {
  entities: EntityRecord[];
  styles: StyleRecord[];
  openChild: (content: ReactNode, title?: string) => void;
}) {
  const showDetail = (style: StyleRecord) => {
    const detail = (
      <div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flexWrap: "wrap", margin: "1rem 0" }}>
          <div style={{ display: "flex", gap: '0.75rem' }}>
            <wa-color-picker value={style.fillColor} label="Fill color"></wa-color-picker>
            <wa-slider label="Opacity" size="s" min={0} max={1} step={0.05} value={style.fillOpacity} with-tooltip style={{ flexGrow: 1, alignSelf: 'end' }}>
              <span slot="reference">0</span>
              <span slot="reference">1</span>
            </wa-slider>
          </div>
          <wa-color-picker value={style.borderColor} label="Border color"></wa-color-picker>

          <div className="badge">Border width {style.borderWidth}px</div>
          <div className="badge">Dash {style.dashPattern || "solid"}</div>
        </div>
        <p className="item-meta">{style.type}</p>
        <p className="tagline">Created: {new Date(style.createdAt).toLocaleString()}</p>
      </div>
    );

    openChild(detail, style.displayName);
  };

  return (
    <div>
      <p className="grouped-entity-subtitle">Browse the map style definitions used by entities.</p>

      {styles.length === 0 ? (
        <p>No styles found.</p>
      ) : (
        <div className="grid">
          {styles.map((style) => (
            <StyleCard
              key={style.id}
              style={style}
              entityCount={entities.filter(e => e.styleType === style.type).length}
              onOpen={() => showDetail(style)}
            />
          ))}
        </div>
      )}
    </div>
  );
}