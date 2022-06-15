export const loadCampMarkers = async(map) => {
    // Prepare searchable_features group
    if (!map.searchable_features)
    {
        map.searchable_features = new L.LayerGroup();
    }

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
					let combinedNames = '';
					let camps = '';
					// layer.feature.properties.size_usage_percent
					camps += '<h3>';
					camps += layer.feature.properties.sheetname;
					camps += " (" + layer.feature.properties.size_usage_percent + " % used)";
					camps += ':</h3>';
					camps += '<ul>';
					for (const [key, camp] of Object.entries(layer.feature.properties.camps))
					{
						let name = camp.name;
						if (name.length > 20)
						{
							name = name.substring(0, 20) + "…";
						}
						combinedNames += "[" + camp.type + "] " + camp.name;
						camps += "<li>[" + camp.type + "] " + name + "</li>";
					}
					camps += "</ul>";
					camps += '<span>(Click on area for details.)</span>';
					// Add Borderland tooltip, it should only be visible when zoomed out
					var areaMarker = L.circle(layer.getBounds().getCenter(), {
						color: "ddd",
						fillColor: "#fff",
						fillOpacity: 0.0,
						radius: size_radious
					}).addTo(map);
					areaMarker.bindTooltip(
						camps,
						{ permanent: true, direction: 'center', className: 'camps-list-tooltip' },
					);
					areaMarker.feature = {};
					areaMarker.feature.properties = {};
					areaMarker.feature.properties.minzoom = 19;
					areaMarker.feature.properties.name = combinedNames;
					var tooltip = areaMarker.getTooltip();
					tooltip._container.style.display = "none";

					//  Add to searchable_features group
					map.searchable_features.addLayer(areaMarker);
				}
			}
	
		}
	});
}
