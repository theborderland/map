import { useMapEvent } from "react-leaflet";

// Deselects the active entity when clicking empty map space.
export function MapClickHandler({ onClearSelection }: { onClearSelection: () => void; }) {
  useMapEvent("click", () => { onClearSelection(); });
  return null;
}
