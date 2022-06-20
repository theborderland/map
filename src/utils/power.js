/*
States:
* ❓ Not given
* 🌱 Zero Power

Statistics:
* 🔺 High consumer
* 🔸 Median consumer
* ▼ Low consumer
loadPowerZoneNames, loadPowerClustersNames, loadPowerCampNames
*/

export const loadPowerZoneNames = async(map) => {
	// Zones
	let groupPowerZone = new L.LayerGroup();
	map.eachLayer(function(layer)
	{
		if (layer.feature && layer.feature.properties)
		{
			if (layer.feature.properties?.type)
			{
                if (layer.feature.properties.type == 'zone')
                {
                    // console.log('zone', layer.feature.properties.name);
                    var zoneMarker = L.circle(layer.getBounds().getCenter(), {
                        color: "ddd",
                        fillColor: "#fff",
                        fillOpacity: 0.0,
                        radius: 0.1
                    });
                    zoneMarker.feature = {};
                    zoneMarker.feature.properties = {};
                    zoneMarker.feature.properties.name = layer.feature.properties.name;
                    groupPowerZone.addLayer(zoneMarker);
                    let zoneDiv = '';
                    zoneDiv += '<h3>';
                    zoneDiv += zoneMarker.feature.properties.name;
                    zoneDiv += '</h3>';
					if (layer.feature.properties?.name && map.powerUsage.zones.hasOwnProperty(zoneMarker.feature.properties.name))
					{
						zoneDiv += '<h3>';
						// console.log(layer.feature.properties);
						let zonePower = map.powerUsage.zones[layer.feature.properties.name];
						// console.log(zonePower);
						if (zonePower.flags.using_power)
						{
							zoneDiv += zonePower.statistics.total;
							zoneDiv += ' W';
						}
						if (zonePower.flags.not_given)
						{
							zoneDiv += ' ❓';
						}
						zoneDiv += '</h3>';
					}	
                    zoneMarker.bindTooltip(
                        zoneDiv, {
                            permanent: true,
                            direction: 'center',
                            className: 'zone-tooltip'
                        },
                    );
                }
            }
        }
    });
	return groupPowerZone;
}

export const loadPowerClustersNames = async(map) => {
	// Cluster Names
	let powerClustersNames = new L.LayerGroup();
	map.eachLayer(function(layer)
	{
		if (layer.feature && layer.feature.properties)
		{
			if (layer.feature.properties.sheetname)
			{
				let size_radious = 0.1;
				let combinedNames = '';
				let clusterName = '';
				clusterName += '<h3>';
				clusterName += layer.feature.properties.sheetname;
				clusterName += '</h3>';
				if (layer.feature.properties?.zone && layer.feature.properties?.name)
				{
					clusterName += '<h3>';
					// console.log(layer.feature.properties);
					let clusterPower = map.powerUsage.zones[layer.feature.properties.zone].clusters[layer.feature.properties.name];
					// console.log(clusterPower);
					if (clusterPower.flags.using_power)
					{
						clusterName += clusterPower.statistics.total;
						clusterName += ' W';
						if (clusterPower.statistics.total > 5000)
						{
							clusterName += ' ⚡';
						}
					}
					if (clusterPower.flags.not_given)
					{
						clusterName += ' ❓';
					}
					clusterName += '</h3>';
				}
				var areaName = L.circle(layer.getBounds().getCenter(), {
					color: "ddd",
					fillColor: "#fff",
					fillOpacity: 0.0,
					radius: size_radious
				});
				powerClustersNames.addLayer(areaName);
				areaName.bindTooltip(
					clusterName, {
						permanent: true,
						direction: 'center',
						className: 'camps-list-tooltip'
					},
				);
			}
		}
	});
	return powerClustersNames;
}

export const loadPowerCampNames = async(map) => {
	// Camp Names
	let powerCampNames = new L.LayerGroup();
	map.eachLayer(function(layer)
	{
		if (layer.feature && layer.feature.properties)
		{
			if (layer.feature.properties?.camps)
			{
				if (Object.keys(layer.feature.properties.camps).length >= 0)
				{
					let size_radious = 0.1;
					// console.log(layer);
					/*
					if (layer.feature.properties.reservedarea > 0)
					{
						size_radious = Math.sqrt(layer.feature.properties.reservedarea) / 2;
					}
					*/
					let combinedNames = '';
					let camps = '';
					// layer.feature.properties.size_usage_percent
					let clusterPower = map.powerUsage.zones[layer.feature.properties.zone].clusters[layer.feature.properties.name];
					// console.log(clusterPower);
					camps += '<h3>';
					camps += layer.feature.properties.sheetname;
					camps += " (" + layer.feature.properties.size_usage_percent + " % used)";
					camps += '</h3>';
					camps += '<h3>';
					if (clusterPower.flags.using_power)
					{
						camps += clusterPower.statistics.total;
						camps += ' W ';
						if (clusterPower.statistics.total > 5000)
						{
							camps += '⚡';
						}
					}
					if (clusterPower.flags.not_given)
					{
						camps += ' ❓';
					}
					camps += '</h3>';
					camps += '<ul>';
					for (const [key, camp] of Object.entries(layer.feature.properties.camps))
					{
						let name = camp.name;
						let campPower = map.powerUsage.zones[camp.zone].clusters[camp.cluster].camps[camp.name_unique];
						let powerString = '';
						if (campPower.flags.zero)
						{
							powerString += '0 W';
							powerString += ' 🌱';
						}
						if (campPower.flags.not_given)
						{
							powerString += '❓';
							powerString += ' W';
						}
						if (campPower.flags.using_power)
						{
							powerString += campPower.total;
							powerString += ' W';
						}
						if (campPower.flags.using_power)
						{
							if (campPower.total > map.powerUsage.statistics.limit_high)
							{
								powerString += '🔺';
							}
							else if (campPower.total < map.powerUsage.statistics.limit_low)
							{
								powerString += '▼';
							}
							else
							{
								powerString += '🔸';
							}
						}
						//console.log(campPower);
						if (name.length > 20)
						{
							name = name.substring(0, 20) + "…";
						}
						combinedNames += "[" + camp.type + "] " + camp.name;
						camps += "<li>"+powerString+" [" + camp.type + "] " + name + "</li>";
					}
					camps += "</ul>";
					var areaCampNames = L.circle(layer.getBounds().getCenter(), {
						color: "ddd",
						fillColor: "#fff",
						fillOpacity: 0.0,
						radius: size_radious
					});
					powerCampNames.addLayer(areaCampNames);
					areaCampNames.bindTooltip(
						camps, {
							permanent: true,
							direction: 'center',
							className: 'camps-list-tooltip'
						},
					);
				}
			}
		}
	});

    return powerCampNames;
}

export const loadPowerBoarderlandMarker = async(map) => {
    let group = new L.LayerGroup();
	// Add Borderland tooltip, it should only be visible when zoomed out
	var boarderlandMarker = L.circle([57.621111, 14.927857], {
		color: "ddd",
		fillColor: "#fff",
		fillOpacity: 0.0,
		radius: 0.1
	});
	boarderlandMarker.feature = {};
	boarderlandMarker.feature.properties = {};
	boarderlandMarker.feature.properties.name = 'Borderland';
	boarderlandMarker.feature.properties.type = 'borderland';
	group.addLayer(boarderlandMarker);

	// console.log(map.powerUsage);

	let markerDiv = '';
	markerDiv += '<h1>';
	markerDiv += 'Borderland Power';
	markerDiv += '</h1>';

	markerDiv += '<h2>Total: ';
	markerDiv += map.powerUsage.statistics.total;
	markerDiv += ' W';
	markerDiv += '</h2>';

	markerDiv += '<h2>';
	markerDiv += 'Total exluding sound: ';
	markerDiv += map.powerUsage.statistics.total_excl_sound;
	markerDiv += ' W';
	markerDiv += ' (Only sound: ';
	markerDiv += map.powerUsage.statistics.total_only_sound;
	markerDiv += ' W)';
	markerDiv += '</h2>';

	markerDiv += '<h2>Median: ';
	markerDiv += map.powerUsage.statistics.median;
	markerDiv += ' W';
	markerDiv += '</h2>';

	markerDiv += '<h2>Avrage: ';
	markerDiv += map.powerUsage.statistics.avrage;
	markerDiv += ' W';
	markerDiv += '</h2>';

	let countMax = Math.min(...[11, map.powerUsage.statistics.valuesOrdered.length]);
	markerDiv += '<h2>Higest consumers:</h2>';
	markerDiv += '<ul>';
	let consumers = [];
	let iCamp = 0;
	for (let kCamp in map.powerUsage.statistics.valuesOrdered)
	{
		let camp = map.powerUsage.statistics.valuesOrdered[kCamp];
		if (camp.power_usage > 0)
		{
			consumers.push(camp);
		}
		if (iCamp > (map.powerUsage.statistics.valuesOrdered.length - countMax))
		{
			markerDiv += '<li>';
			markerDiv += camp.cluster;
			markerDiv += ' - ';
			markerDiv += camp.name;
			markerDiv += ' ';
			markerDiv += camp.power_usage;
			markerDiv += ' W';
			markerDiv += '</li>';
		}
		iCamp += 1;
	}
	markerDiv += '</ul>';

	markerDiv += '<h2>Power Consumers: ';
	markerDiv += consumers.length;
	markerDiv += ' camps/projects';
	markerDiv += '</h2>';

	boarderlandMarker.bindTooltip(
		markerDiv, {
			permanent: true,
			direction: 'center',
			className: 'borderland-marker'
		},
	);

	return group;
}
