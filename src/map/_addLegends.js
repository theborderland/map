import L from 'leaflet';

export const addLegends = async (map, toggableLayers) => {
    // Create the slope legend
    let slopeLegend = L.control({ position: 'bottomright' });
    slopeLegend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML += '<img src="./img/slopelegend.png" alt="legend" width="100" height="141">';
        return div;
    };

    // Create the height legend
    let heightlegend = L.control({ position: 'bottomright' });
    heightlegend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML += '<img src="./img/heightlegend.png" alt="legend" width="100" height="124">';
        return div;
    };

    // Create the sound legend
    let soundLegend = L.control({ position: 'bottomright' });
    soundLegend.onAdd = function (map) {
        var div = L.DomUtil.create('div', 'legend');
        div.innerHTML += '<img src="./img/soundlegend.png" alt="legend" width="150" height="165">';
        return div;
    };

    // Toggle what legends to show when layers are made visible
    map.on('overlayadd', function (eventLayer) {
        switch (eventLayer.name) {
            case 'Slope':
                slopeLegend.addTo(map);
                break;
            case 'Height':
                heightlegend.addTo(map);
                break;
            case 'Soundguide':
                soundLegend.addTo(map);
                break;
        }
    });

    // Toggle what legends to show when layers are made hidden
    map.on('overlayremove', function (eventLayer) {
        switch (eventLayer.name) {
            case 'Slope':
                map.removeControl(slopeLegend);
                break;
            case 'Height':
                map.removeControl(heightlegend);
                break;
            case 'Soundguide':
                map.removeControl(soundLegend);
                break;
        }
    });

    // Add scale indicator to the UI
    //L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);

    // Add all toggable layers as a control to the map
    L.control.layers(undefined, toggableLayers, { position: 'bottomright' }).addTo(map);
};
