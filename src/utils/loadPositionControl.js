import L from 'leaflet';

export const loadPositionControl = async(map) => {
    // Add Leaflet-locatecontrol plugin
    L.control.locate({ setView: 'once',
					keepCurrentZoomLevel: true,
					returnToPrevBounds: true,
					drawCircle: true,
					flyTo: true
				}).addTo(map);
    return true;
}
