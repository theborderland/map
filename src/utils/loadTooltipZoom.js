import L from 'leaflet';

export const showHideLayer = async(map, layer, show) => {
	if (map.hasLayer(layer))
	{
		//console.log("has layer", layer);
		if (show == true)
		{
			// console.log("add layer nothing", layer);
			// map.addLayer(layer);
		}
		else
		{
			// console.log("remove layer", layer);
			map.removeLayer(layer);
		}
	}
	else
	{
		//console.log("does not have layer", layer);
		if (show == true)
		{
			// console.log("add layer", layer);
			map.addLayer(layer);
		}
		else
		{
			// console.log("remove layer nothing", layer);
			// map.removeLayer(layer);
		}
	}
}

export const showHideTooltipsZoom = async(map, goalZoom) => {
	// Hide tooltips dependent on zoom level
	let goal = goalZoom;
	if (goal < 16)
	{
		showHideLayer(map, map.groups.boarderlandMarker, true);
		showHideLayer(map, map.groups.zoneNames, false);
		showHideLayer(map, map.groups.clusterNames, false);
		showHideLayer(map, map.groups.campNames, false);
		showHideLayer(map, map.groups.poi, false);
	}
	else if (goal >= 16 && goal < 17)
	{
		showHideLayer(map, map.groups.boarderlandMarker, false);
		showHideLayer(map, map.groups.zoneNames, true);
		showHideLayer(map, map.groups.clusterNames, false);
		showHideLayer(map, map.groups.campNames, false);
		showHideLayer(map, map.groups.poi, false);
	}
	else if (goal >= 17 && goal < 19)
	{
		showHideLayer(map, map.groups.boarderlandMarker, false);
		showHideLayer(map, map.groups.zoneNames, true);
		if (map.hasLayer(map.groups.clusters))
		{
			showHideLayer(map, map.groups.clusterNames, true);
			showHideLayer(map, map.groups.campNames, false);
		}
		else
		{
			showHideLayer(map, map.groups.clusterNames, false);
			showHideLayer(map, map.groups.campNames, false);
		}
		if (map.hasLayer(map.groups.poi_menu))
		{
			showHideLayer(map, map.groups.poi, true);
		}
		else
		{
			showHideLayer(map, map.groups.poi, false);
		}
	}
	else if (goal >= 19)
	{
		showHideLayer(map, map.groups.boarderlandMarker, false);
		showHideLayer(map, map.groups.zoneNames, true);
		if (map.hasLayer(map.groups.clusters))
		{
			showHideLayer(map, map.groups.clusterNames, false);
			showHideLayer(map, map.groups.campNames, true);
		}
		else
		{
			showHideLayer(map, map.groups.clusterNames, false);
			showHideLayer(map, map.groups.campNames, false);
		}
		if (map.hasLayer(map.groups.poi_menu))
		{
			showHideLayer(map, map.groups.poi, true);
		}
		else
		{
			showHideLayer(map, map.groups.poi, false);
		}
	}
}

export const loadTooltipZoom = async(map) => {
	// Show or hide tooltips dependent on zoom level
	map.on('zoomanim', function(event) {
		// console.log(event);
		let currentZoom = map.getZoom();
		let goal = currentZoom;
		if (event?.zoom)
		{
			goal = event.zoom;
		}
		// console.log("to zoom", goal);
		// console.log("current zoom", currentZoom);
		showHideTooltipsZoom(map, goal);
	});

	// Trigger showHideTooltipsZoom when selecting layers
	map.on('overlayadd', function(event) {
		let goal = map.getZoom();
		showHideTooltipsZoom(map, goal);
	});
	map.on('overlayremove', function(event) {
		let goal = map.getZoom();
		showHideTooltipsZoom(map, goal);
	});
}
