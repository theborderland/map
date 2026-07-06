import type { StyleRecord } from "../../db/types";
import { deleteStyle } from "../../db";
import DeleteButton from "./DeleteButton";

interface Props {
  style: StyleRecord;
  setStyles: React.Dispatch<React.SetStateAction<StyleRecord[]>>;
  goBack?: () => void;
}

export default function StyleDetail({ style, setStyles, goBack }: Props) {
  const handleDelete = async () => {
    await deleteStyle(style.id);
    setStyles((prev) => prev.filter((s) => s.id !== style.id));
    goBack?.();
  };

  return (
    <div className="style-detail">
      <div className="form-fields">
        <div className="form-field">
          <label className="form-label">Type key</label>
          <p className="item-meta" style={{ fontFamily: "monospace" }}>{style.type}</p>
        </div>
        <div className="form-field">
          <label className="form-label">Display name</label>
          <p>{style.displayName}</p>
        </div>
        <div className="form-field">
          <label className="form-label">Preview</label>
          <div style={{
            height: 40,
            borderRadius: 6,
            background: style.fillColor,
            opacity: style.fillOpacity + 0.3,
            border: `${style.borderWidth}px ${style.dashPattern ? "dashed" : "solid"} ${style.borderColor}`,
          }} />
        </div>
        <div className="form-field">
          <label className="form-label">Dash pattern</label>
          <p className="item-meta">{style.dashPattern || "solid"}</p>
        </div>
        <div className="form-field">
          <label className="form-label">Border width</label>
          <p className="item-meta">{style.borderWidth} px</p>
        </div>
      </div>
      <div className="form-actions">
        <DeleteButton
          message={`Delete "${style.displayName}"? Entities using it will fall back to the default style.`}
          onDelete={handleDelete}
        />
      </div>
      <p className="tagline">Created: {new Date(style.createdAt).toLocaleString()}</p>
    </div>
  );
}