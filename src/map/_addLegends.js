import L from 'leaflet';
import GroupedLayers from '../utils/_groupedLayers.js';

const SOUND_GUIDE_URL = 'https://docs.google.com/document/d/1aDBv3UWOxngdjWd_z4N34Wcm7r7GvD-gINGwQIr4ti8';

export const addLegends = (map, toggableLayers, visibleLayers) => {
    const slopeLegend = createImageLegend('./img/slopelegend.png', 100, 141);
    const heightLegend = createImageLegend('./img/heightlegend.png', 100, 124);

    const soundLegendHtml = `
        <a target="_blank" href="${SOUND_GUIDE_URL}" title="Open the soundguide">
            <img src="./img/soundlegend.png" alt="legend" width="250">
            <div style="text-align:center">Click to open the soundguide</div>
        </a>`;
    const soundLegend = createHtmlLegend(soundLegendHtml);

    // Toggle legends when overlays are added/removed
    map.on('overlayadd', (eventLayer) => {
        switch (eventLayer.name) {
            case 'Slope':
                slopeLegend.addTo(map);
                break;
            case 'Height':
                heightLegend.addTo(map);
                break;
            case 'Soundguide':
                soundLegend.addTo(map);
                break;
            default:
                break;
        }
    });

    map.on('overlayremove', (eventLayer) => {
        switch (eventLayer.name) {
            case 'Slope':
                map.removeControl(slopeLegend);
                break;
            case 'Height':
                map.removeControl(heightLegend);
                break;
            case 'Soundguide':
                map.removeControl(soundLegend);
                break;
            default:
                break;
        }
    });

    // Add all toggable layers as a grouped control
    const groupedLayers = {
        Placement: {
            Camps: toggableLayers["Placement"],
            'Camp names': toggableLayers["Names"],
            'Roads etc.': toggableLayers["Placement_map"],
            Neighbourhoods: toggableLayers["Neighbourhoods"],
            Plazas: toggableLayers["Plazas"],
            'Places of Interest': toggableLayers["POI"],
            'Power grid': toggableLayers["PowerGrid"],
            Soundguide: toggableLayers["Soundguide"],
        },
        Background: {
            Slope: toggableLayers["Slope"],
            Height: toggableLayers["Height"],
            Terrain: toggableLayers["Terrain"],
            Handdrawn: toggableLayers["Handdrawn"],
            "Aftermath '22": toggableLayers["Aftermath22"],
            "Aftermath '23": toggableLayers["Aftermath23"],
            "Aftermath '24": toggableLayers["Aftermath24"],
            "Aftermath '25": toggableLayers["Aftermath25"],
        },
    };

    const layerControl = GroupedLayers(undefined, groupedLayers, { position: 'bottomright' });
    // let layerControl = L.control.layers(undefined, toggableLayers, { position: 'bottomright' })

    // Add scale indicator to the UI
    //L.control.scale({ metric: true, imperial: false, position: 'bottomright' }).addTo(map);
    
    // Add all initial visible legends
    if (visibleLayers && visibleLayers.has('Slope')) slopeLegend.addTo(map);
    if (visibleLayers && visibleLayers.has('Height')) heightLegend.addTo(map);
    if (visibleLayers && visibleLayers.has('Soundguide')) soundLegend.addTo(map);

    return layerControl;
};

function createImageLegend(src, width, height) {
    const ctrl = L.control({ position: 'topright' });
    ctrl.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `<img src="${src}" alt="legend" width="${width}" height="${height}">`;
        return div;
    };
    return ctrl;
}

function createHtmlLegend(html) {
    const ctrl = L.control({ position: 'topright' });
    ctrl.onAdd = function () {
        const div = L.DomUtil.create('div', 'legend');
        div.style.backgroundColor = 'white';
        div.innerHTML = html;
        return div;
    };
    return ctrl;
}
