export const addSearch = async(map) => {
	map.searchable_features = new L.LayerGroup();

	// Go through zones and create new markers under searchable_features
	// console.log(map.groups.zones);
	for (var i_grouplayer in map.groups.zones._layers)
	{
		let grouplayer = map.groups.zones._layers[i_grouplayer];
		for (var i_layer in grouplayer._layers)
		{
			let layer = grouplayer._layers[i_layer];
			// console.log(layer);
			var zoneMarker = L.circle(layer.getBounds().getCenter(), {
				color: "ddd",
				fillColor: "#fff",
				fillOpacity: 0.0,
				radius: 0.1
			});
			zoneMarker.feature = {};
			zoneMarker.feature.properties = {};
			zoneMarker.feature.properties.name = layer.feature.properties.name;
			map.searchable_features.addLayer(zoneMarker);
		}
	}
	
	// Go through areas and create new markers under searchable_features
	for (var i_grouplayer in map.groups.clusters._layers)
	{
		let grouplayer = map.groups.clusters._layers[i_grouplayer];
		// console.log(grouplayer);
		for (var i_layer in grouplayer._layers)
		{
			let layer = grouplayer._layers[i_layer];
			// console.log(layer);
			var zoneMarker = L.circle(layer.getBounds().getCenter(), {
				color: "ddd",
				fillColor: "#fff",
				fillOpacity: 0.0,
				radius: 0.1
			});
			zoneMarker.feature = {};
			zoneMarker.feature.properties = {};
			zoneMarker.feature.properties.name = layer.feature.properties.name;
			map.searchable_features.addLayer(zoneMarker);
			// Go through camps and create new markers under searchable_features
			if (layer.feature.properties?.camps)
			{
				if (Object.keys(layer.feature.properties.camps).length > 0)
				{
					for (var i_camp in layer.feature.properties.camps)
					{
						let camp = layer.feature.properties.camps[i_camp];
						// console.log(camp);
						var campMarker = L.circle(layer.getBounds().getCenter(), {
							color: "ddd",
							fillColor: "#fff",
							fillOpacity: 0.0,
							radius: 0.1
						});
						campMarker.feature = {};
						campMarker.feature.properties = {};
						campMarker.feature.properties.name = "[" + camp.type + "] " + camp.name;
						map.searchable_features.addLayer(campMarker);
					}
				}
			}
		}
	}
	
	// Add search control
    var searchControl = new L.Control.Search({
        layer: map.searchable_features,
		propertyName: 'name',
        marker: false,
        zoom: 19,
        initial: false
	});
    map.addControl(searchControl);
	// Search control makes all layers visible, start by removing them
    map.searchable_features.remove()
}
