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
	markerDiv += '<span>';
	markerDiv += boarderlandMarker.feature.properties.name;
	markerDiv += '</span>';
	boarderlandMarker.bindTooltip(
		markerDiv, {
			permanent: true,
			direction: 'center',
			className: 'borderland-marker'
		},
	);

	return group;
}
