import L from 'leaflet';
import GroupedLayers from '../utils/_groupedLayers.js';
import { SOUND_GUIDE_URL } from '../../SETTINGS.js';

function createImageLegend(src: string, width: number, height: number): L.Control {
    const ctrl = new L.Control({ position: 'topright' });
    ctrl.onAdd = function (): HTMLElement {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `<img src="${src}" alt="legend" width="${width}" height="${height}">`;
        return div;
    };
    return ctrl;
}

function createHtmlLegend(html: string): L.Control {
    const ctrl = new L.Control({ position: 'topright' });
    ctrl.onAdd = function (): HTMLElement {
        const div = L.DomUtil.create('div', 'legend');
        div.style.backgroundColor = 'white';
        div.innerHTML = html;
        return div;
    };
    return ctrl;
}

export const addLegends = (
    map: L.Map,
    availableLayers: Array<{ name: string; layer: L.LayerGroup, type: string; }>,
    visibleLayers: Set<string>,
): L.Control => {
    const slopeLegend = createImageLegend('./img/slopelegend.png', 100, 141);
    const heightLegend = createImageLegend('./img/heightlegend.png', 100, 124);

    const soundLegendHtml = `
    <a target="_blank" href="${SOUND_GUIDE_URL}" title="Open the soundguide">
      <img src="./img/soundlegend.png" alt="legend" width="250">
      <div style="text-align:center">Click to open the soundguide</div>
    </a>`;
    const soundLegend = createHtmlLegend(soundLegendHtml);

    // Toggle legends when overlays are added/removed
    map.on('overlayadd', (eventLayer: L.LayersControlEvent) => {
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

    map.on('overlayremove', (eventLayer: L.LayersControlEvent) => {
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

    // Organize available layers by their type
    const layersByType: Record<string, Record<string, L.LayerGroup>> = {};
    for (const currentItem of availableLayers) {
        if (!layersByType[currentItem.type]) {
            layersByType[currentItem.type] = {};
        }
        layersByType[currentItem.type][currentItem.name] = currentItem.layer;
    }

    const layerControl = GroupedLayers(undefined, layersByType, { position: 'bottomright' });

    // Add all initial visible legends
    if (visibleLayers && visibleLayers.has('Slope')) slopeLegend.addTo(map);
    if (visibleLayers && visibleLayers.has('Height')) heightLegend.addTo(map);
    if (visibleLayers && visibleLayers.has('Soundguide')) soundLegend.addTo(map);

    return layerControl;
};
