import { MapContainer, TileLayer } from "react-leaflet";

export default function MapView() {
  // Alversjö, Eksjö, Sweden
  const position: [number, number] = [57.6226, 14.9276]

  return (
    <MapContainer
      center={position}
      zoom={15}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        subdomains={["mt0", "mt1", "mt2", "mt3"]}
      />
    </MapContainer>
  );
}