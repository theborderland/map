interface LayerEntry {
  styleType: string;
  displayName: string;
  fillColor: string;
}

interface Props {
  layers: LayerEntry[];
  hiddenTypes: Set<string>;
  onToggle: (styleType: string, visible: boolean) => void;
}

/**
 * Floating panel listing every distinct entity styleType currently present
 * on the map, each with a checkbox and a colour dot matching its style's
 * fill colour. Rendered outside <MapContainer> — plain positioned div, no
 * react-leaflet dependency needed since it doesn't touch the Leaflet API.
 */
export default function MapLayerControl({ layers, hiddenTypes, onToggle }: Props) {
  if (layers.length === 0) return null;

  return (
    <div className="map-layer-control">
      <div className="map-layer-control-list">
        {layers.map((layer) => (
          <label key={layer.styleType} className="map-layer-control-row">
            <input
              type="checkbox"
              checked={!hiddenTypes.has(layer.styleType)}
              onChange={(e) => onToggle(layer.styleType, e.target.checked)}
            />
            <span
              className="map-layer-control-dot"
              style={{ backgroundColor: layer.fillColor }}
            />
            <span className="map-layer-control-label">{layer.displayName}</span>
          </label>
        ))}
      </div>
    </div>
  );
}