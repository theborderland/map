import type { ReactNode } from "react";
import type { StyleRecord } from "../db/types";

export default function StylesTab({
  styles,
  openChild,
}: {
  styles: StyleRecord[];
  openChild: (content: ReactNode, title?: string) => void;
}) {
  const showDetail = (style: StyleRecord) => {
    const detail = (
      <div className="item-card">
        <h3>{style.displayName}</h3>
        <p className="item-meta">{style.type}</p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", margin: "1rem 0" }}>
          <div className="badge" style={{ background: style.fillColor, color: "white" }}>Fill</div>
          <div className="badge" style={{ background: style.borderColor, color: "white" }}>Border</div>
          <div className="badge">Opacity {style.fillOpacity}</div>
          <div className="badge">Width {style.borderWidth}px</div>
          <div className="badge">Dash {style.dashPattern || "solid"}</div>
        </div>
        <p className="tagline">Created: {new Date(style.createdAt).toLocaleString()}</p>
      </div>
    );

    openChild(detail, style.displayName);
  };

  return (
    <div>
      <p>Browse the map style definitions used by entities.</p>

      {styles.length === 0 ? (
        <p>No styles found.</p>
      ) : (
        <div className="tab-list">
          {styles.map((style) => (
            <div key={style.id} className="item-card">
              <div className="item-head">
                <div>
                  <h3 className="item-title">{style.displayName}</h3>
                  <p className="item-meta">{style.type}</p>
                </div>
                <span className="badge">{style.borderWidth}px</span>
              </div>
              <p className="tagline">{style.dashPattern ? `Dash ${style.dashPattern}` : "Solid"}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
                <span className="color-swatch" style={{ background: style.fillColor, borderColor: style.borderColor }} />
                <span>{style.fillColor} / {style.borderColor}</span>
                <wa-button size="s" onClick={() => showDetail(style)}>
                  Details
                </wa-button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}