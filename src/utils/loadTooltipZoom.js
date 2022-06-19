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
	// Borderland
	if (goal < 16)
	{
		if (map.hasLayer(map.groups.power_menu))
		{
			showHideLayer(map, map.groups.boarderlandMarker, false);
			showHideLayer(map, map.groups.powerBoarderlandMarker, true);
		}
		else
		{
			showHideLayer(map, map.groups.boarderlandMarker, true);
			showHideLayer(map, map.groups.powerBoarderlandMarker, false);
		}
	}
	else
	{
		showHideLayer(map, map.groups.boarderlandMarker, false);
		showHideLayer(map, map.groups.powerBoarderlandMarker, false);
	}

	// POI
	if (map.hasLayer(map.groups.poi_menu))
	{
		if (goal >= 17)
		{
			showHideLayer(map, map.groups.poi, true);
		}
		else
		{
			showHideLayer(map, map.groups.poi, false);
		}
	}
	else
	{
		showHideLayer(map, map.groups.poi, false);
	}

	// Zones
	if (goal < 16)
	{
		showHideLayer(map, map.groups.zoneNames, false);
		showHideLayer(map, map.groups.powerZoneNames, false);
	}
	else if (goal >= 16)
	{
		if (map.hasLayer(map.groups.power_menu))
		{
			showHideLayer(map, map.groups.zoneNames, false);
			showHideLayer(map, map.groups.powerZoneNames, true);
		}
		else
		{
			showHideLayer(map, map.groups.zoneNames, true);
			showHideLayer(map, map.groups.powerZoneNames, false);
		}
	}

	// Cluster Names
	let z1 = 17;
	let z2 = 19;
	if (map.hasLayer(map.groups.power_menu))
	{
		z1 = 18;
		z2 = 20;
	}
	if (map.hasLayer(map.groups.clusters))
	{
		if (goal < z1)
		{
			showHideLayer(map, map.groups.clusterNames, false);
			showHideLayer(map, map.groups.powerClustersNames, false);
		}
		else if (goal >= z1 && goal < z2)
		{
			if (map.hasLayer(map.groups.power_menu))
			{
				showHideLayer(map, map.groups.clusterNames, false);
				showHideLayer(map, map.groups.powerClustersNames, true);
			}
			else
			{
				showHideLayer(map, map.groups.clusterNames, true);
				showHideLayer(map, map.groups.powerClustersNames, false);
			}
		}
		else if (goal >= z2)
		{
			showHideLayer(map, map.groups.clusterNames, false);
			showHideLayer(map, map.groups.powerClustersNames, false);
		}
	}
	else
	{
		showHideLayer(map, map.groups.clusterNames, false);
		showHideLayer(map, map.groups.powerClustersNames, false);
	}

	// Camp Names
	if (map.hasLayer(map.groups.clusters))
	{
		if (goal < z2)
		{
			showHideLayer(map, map.groups.campNames, false);
			showHideLayer(map, map.groups.powerCampNames, false);
		}
		else if (goal >= z2)
		{
			if (map.hasLayer(map.groups.power_menu))
			{
				showHideLayer(map, map.groups.campNames, false);
				showHideLayer(map, map.groups.powerCampNames, true);
			}
			else
			{
				showHideLayer(map, map.groups.campNames, true);
				showHideLayer(map, map.groups.powerCampNames, false);
			}
		}
	}
	else
	{
		showHideLayer(map, map.groups.campNames, false);
		showHideLayer(map, map.groups.powerCampNames, false);
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
