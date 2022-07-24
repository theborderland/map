export const loadBoarderlandMarker = async(map) => {
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

	let markerDiv = '';
	markerDiv += '<h1>';
	markerDiv += boarderlandMarker.feature.properties.name;
	markerDiv += '</h1>';
	boarderlandMarker.bindTooltip(
		markerDiv, {
			permanent: true,
			direction: 'center',
			className: 'borderland-marker'
		},
	);

	return group;
}

export const loadDiscoDiffusion = async(map) => {
	// map.groups.discoDiffusion = await loadImageOverlay(map, './img/disco_diffusion.png', [[57.63029, 14.9155], [57.61400,14.9362]]);
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
	boarderlandMarker.feature.properties.name = 'Disco';
	group.addLayer(boarderlandMarker);

	var overlay = L.imageOverlay('./img/disco_diffusion.png', [[57.63029, 14.9155], [57.61400,14.9362]]);
	overlay.addTo(group);

	let markerDiv = '';
	markerDiv += '<h1>';
	markerDiv += boarderlandMarker.feature.properties.name;
	markerDiv += '</h1>';

	markerDiv += '<div class="container"><img id="image" style="filter: url(';
	markerDiv += "'#swirl'";
	markerDiv += ');" src="https://static.vecteezy.com/system/resources/previews/000/274/892/non_2x/vector-pastel-background.jpg"></div>';
	markerDiv += '<svg><filter id="swirl">';
	markerDiv += '<feTurbulence baseFrequency="0.010" numOctaves="2" result="wrap" type="fractalNoise"> </feTurbulence>';
	markerDiv += '<feDisplacementMap id="liquid" class="liquid" in="SourceGraphic" in2="wrap" scale="300" xChannelSelector="R" yChannelSelector="B"> </feDisplacementMap>';
	markerDiv += '</filter></svg>';

	/*
	boarderlandMarker.bindTooltip(
		markerDiv, {
			permanent: true,
			direction: 'center',
			className: 'borderland-marker'
		},
	);
	*/

	return group;
}
