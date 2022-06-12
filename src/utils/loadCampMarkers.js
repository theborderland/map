export const loadCampMarkers = async(map) => {
	map.eachLayer(function(layer)
	{
		if (layer.feature && layer.feature.properties)
		{
			if (layer.feature.properties?.camps)
			{
				if (Object.keys(layer.feature.properties.camps).length > 0)
				{
					let size_radious = 1;
					// console.log(layer);
					if (layer.feature.properties.reservedarea > 0)
					{
						size_radious = Math.sqrt(layer.feature.properties.reservedarea) / 2;
					}
					size_radious = 0.1;
					let camps = '';
					camps += '<h3 class="camps-list-tooltip-header">Camp cluster: '+ layer.feature.properties.sheetname + ':</h3>';
					camps += '<ul class="camps-list-tooltip">';
					for (const [key, camp] of Object.entries(layer.feature.properties.camps))
					{
						camps += "<li>" + camp.name + "</li>";
					}
					camps += "</ul>";
					camps += '<span class="camps-list-span-tooltip">(Klick for details.)</span>';
					// Add Borderland tooltip, it should only be visible when zoomed out
					var areaMarker = L.circle(layer.getBounds().getCenter(), {
						color: "ddd",
						fillColor: "#fff",
						fillOpacity: 0.0,
						radius: size_radious
					}).addTo(map);
					areaMarker.bindTooltip(
						camps,
						{ permanent: true, direction: 'center' },
					);
					areaMarker.feature = {}
					areaMarker.feature.properties = {}
					areaMarker.feature.properties.minzoom = 19
					var tooltip = areaMarker.getTooltip();
					tooltip._container.style.display = "none";
				}
			}
	
		}
	});
}
