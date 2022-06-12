import L from 'leaflet';

export const loadSlopeMap = async (map) => 
{
    var imageUrl = './data/slopemap.png';
    var latLngBounds = L.latLngBounds([[57.6183258637506626, 14.9211877664388641], [57.6225237073944072,14.9346879887464876]]);

    var imageOverlay = L.imageOverlay(
        imageUrl, 
        latLngBounds, 
        {
            opacity: 1,
            interactive: false
        }
    );

    // var baseLayers = {"Slope": imageOverlay};

    // L.control.layers(null, baseLayers).addTo(map);

    return imageOverlay;
};