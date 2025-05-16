import L from 'leaflet';

const SOUND_GUIDE_URL = "https://docs.google.com/document/d/1aDBv3UWOxngdjWd_z4N34Wcm7r7GvD-gINGwQIr4ti8";

export const addLegends = async (map, toggableLayers, visibleLayers) => {
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
        div.innerHTML +=
            `<a target="blank" href="${SOUND_GUIDE_URL}"><img src="./img/soundlegend.png" alt="legend" width="250"></a>`;
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

    // Add all toggable layers as a control to the map
    L.control.layers(undefined, toggableLayers, { position: 'bottomright' }).addTo(map);

    // Add all initial visible legends
    if (visibleLayers.has('Slope')) {
        slopeLegend.addTo(map);
    }
    if (visibleLayers.has('Height')) {
        heightlegend.addTo(map);
    }
    if (visibleLayers.has('Soundguide')) {
        soundLegend.addTo(map);
    }

    // Add scale indicator to the UI
    //L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);
};
