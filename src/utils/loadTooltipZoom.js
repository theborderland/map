import L from 'leaflet';

export const loadTooltipZoom = async(map) => {
	// Hide tooltips dependent on zoom level
	map.on('zoomend', function() {
		var currentZoom = map.getZoom();
		map.eachLayer(function(layer)
		{
			if (layer.feature && layer.feature.properties)
			{
				if (layer.feature.properties.minzoom)
				{
					if (layer.getTooltip)
					{
						var tooltip = layer.getTooltip();
						if (tooltip)
						{
							if (currentZoom < layer.feature.properties.minzoom)
							{
								tooltip._container.style.display = "none";
							}
							else
							{
								tooltip._container.style.display = "block";
							}
						}
					}
				}
				if (layer.feature.properties.maxzoom)
				{
					if (layer.getTooltip)
					{
						var tooltip = layer.getTooltip();
						if (tooltip)
						{
							if (currentZoom > layer.feature.properties.maxzoom)
							{
								tooltip._container.style.display = "none";
							}
							else
							{
								tooltip._container.style.display = "block";
							}
						}
					}
				}
			}
		});
	});
    return true;
}

export const loadBoarderlandMarker = async(map) => {
	// Add Borderland tooltip, it should only be visible when zoomed out
    var borderlandMarker = L.circle([57.621111, 14.927857], {
        color: "ddd",
        fillColor: "#fff",
        fillOpacity: 0.0,
        radius: 10.0
    }).addTo(map);
    borderlandMarker.bindTooltip(
        "<span style='color: #fa6; opacity: 0.9; text-shadow: 2px 2px #000000; font-weight: bold; font-size: 1.8rem;'>Borderland</span>",
        { permanent: true, direction: 'center' },
    );
    borderlandMarker.feature = {}
    borderlandMarker.feature.properties = {}
    borderlandMarker.feature.properties.maxzoom = 15
	var tooltip = borderlandMarker.getTooltip();
	tooltip._container.style.display = "none";
    return true;
}
