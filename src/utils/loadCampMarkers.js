export const loadCampNames = async(map) => {
	let group = new L.LayerGroup();
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
					camps += '<h3>';
					camps += layer.feature.properties.sheetname;
					camps += " (" + layer.feature.properties.size_usage_percent + " % used)";
					camps += ':</h3>';
					camps += '<ul>';
					for (const [key, camp] of Object.entries(layer.feature.properties.camps))
					{
						let camprow = "";
						// console.log(camp);
						let name = camp.name;
						if (name.length > 20)
						{
							name = name.substring(0, 20) + "…";
						}
						camps += "<li>";
						combinedNames += "[" + camp.type + "] " + camp.name;
						camps += "[" + camp.type + "] " + name;
						if (!(camp?.power_usage >= 0))
						{
							camps += " ❓";
						}
						camps += "</li>";
					}
					camps += "</ul>";
					var areaCampNames = L.circle(layer.getBounds().getCenter(), {
						color: "ddd",
						fillColor: "#fff",
						fillOpacity: 0.0,
						radius: size_radious
					});
					group.addLayer(areaCampNames);
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
    return group;
}

export const loadClusterNames = async(map) => {
	let group = new L.LayerGroup();
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
				clusterName += ':</h3>';
				var areaName = L.circle(layer.getBounds().getCenter(), {
					color: "ddd",
					fillColor: "#fff",
					fillOpacity: 0.0,
					radius: size_radious
				});
				group.addLayer(areaName);
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
    return group;
}
