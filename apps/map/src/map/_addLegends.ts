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

    const kidsLegendHtml = `
    <div style="background-color: white; padding: 5px; border: 2px solid black; cursor: default;">
      <span style="font-weight: bold; font-size: 24px;">Kids zones</span>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="margin-bottom: 10px;">
          <span style="display:inline-block; width:20px; height:20px; background-color:#00ff00; margin-right:5px;"></span>
          These areas are particularly recommended<br>for camping with kids.
        </li>
        <li style="margin-bottom: 10px;">
          <span style="display:inline-block; width:20px; height:20px; background-color:#ffd54f; margin-right:5px;"></span>
          Might be suitable for camping with kids.<br>Coordinate with neighbouring camps when<br>placing your camp.
        </li>
        <li>
          <span style="display:inline-block; width:20px; height:20px; background-color:#ff0000; margin-right:5px;"></span>
          Camping with kids is strongly advised against.
        </li>
      </ul>
    </div>
    `;
    const kidsLegend = createHtmlLegend(kidsLegendHtml);

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
            case 'Kids zones':
                kidsLegend.addTo(map);
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
            case 'Kids zones':
                map.removeControl(kidsLegend);
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
    if (visibleLayers && visibleLayers.has('Kids zones')) kidsLegend.addTo(map);

    return layerControl;
};
