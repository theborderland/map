import { useState, useEffect } from "react";
import type { Geometry } from "geojson";

interface Props {
  geometry: Geometry;
  /** Called only when the textarea contains valid GeoJSON — invalid input shows an error but does not propagate. */
  onChange: (geometry: Geometry) => void;
}

export default function GeometryEditor({ geometry, onChange }: Props) {
  const [raw, setRaw] = useState(() => JSON.stringify(geometry, null, 2));
  const [error, setError] = useState<string | null>(null);

  // Sync textarea when the geometry prop changes externally (e.g. after save or future Geoman edit).
  useEffect(() => {
    setRaw(JSON.stringify(geometry, null, 2));
    setError(null);
  }, [geometry]);

  const handleInput = (e: Event) => {
    const text = (e.target as HTMLTextAreaElement).value;
    setRaw(text);
    try {
      const parsed = JSON.parse(text) as Geometry;
      if (typeof parsed !== "object" || !parsed.type) {
        setError("Missing 'type' field.");
        return;
      }
      setError(null);
      onChange(parsed);
    } catch {
      setError("Invalid JSON.");
    }
  };

  return (
    <div className="form-field">
      <label className="form-label">Geometry (GeoJSON)</label>
      <wa-textarea
        value={raw}
        rows={8}
        resize="vertical"
        onInput={handleInput as EventListener}
        className="form-textarea-geojson"
      />
      {error && (
        <p style={{ color: "red", marginTop: "0.25rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}