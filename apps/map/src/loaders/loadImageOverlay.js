import L from 'leaflet';

export const loadImageOverlay = async (map, imageUrl, bounds) => 
{
    var latLngBounds = L.latLngBounds(bounds);

    var imageOverlay = L.imageOverlay(
        imageUrl, 
        latLngBounds, 
        {
            opacity: 1,
            interactive: false
        }
    );

    return imageOverlay;
};