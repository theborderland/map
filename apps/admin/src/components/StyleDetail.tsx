import type { StyleRecord } from "../db/types";

export default function StyleDetail({ style }: { style: StyleRecord }) {
  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", margin: "1rem 0" }}>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <wa-color-picker value={style.fillColor} label="Fill color" />
          <wa-slider
            label="Opacity"
            size="s"
            min={0}
            max={1}
            step={0.05}
            value={style.fillOpacity}
            with-tooltip
            style={{ flexGrow: 1, alignSelf: "end" }}
          >
            <span slot="reference">0</span>
            <span slot="reference">1</span>
          </wa-slider>
        </div>
        <wa-color-picker value={style.borderColor} label="Border color" />
        <div className="badge">Border width {style.borderWidth}px</div>
        <div className="badge">Dash {style.dashPattern || "solid"}</div>
      </div>
      <p className="item-meta">{style.type}</p>
      <p className="tagline">Created: {new Date(style.createdAt).toLocaleString()}</p>
    </div>
  );
}