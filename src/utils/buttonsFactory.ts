import * as L from 'leaflet';
import { showDrawer, showNotification } from '../messages';
import ToKML from '@maphubs/tokml';

export function edit(isEditMode: boolean, onClickCallback: () => void): L.Control {
    const button = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: () => {
            let btn = L.DomUtil.create('button', 'btn button-shake-animate');
            btn.title = 'Edit';
            btn.textContent = 'Edit';
            L.DomEvent.disableClickPropagation(btn);

            let _isEditMode = isEditMode;

            btn.onclick = () => {
                onClickCallback();
                _isEditMode = !_isEditMode;
                btn.textContent = _isEditMode ? 'Done' : 'Edit';
                btn.title = _isEditMode ? 'Done' : 'Edit';
            };

            return btn;
        },
    });

    return new button;
}

export function download(map: L.Map): L.Control {
    const button = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: () => {
            let btn = L.DomUtil.create('button', 'leaflet-bar help-button');
            btn.title = 'Save everything';
            btn.textContent = '💾';
            L.DomEvent.disableClickPropagation(btn);

            btn.onclick = async () => {
                const quit = !confirm(
                    'This will download all the current map information as several KML and GeoJSON files, are you sure?',
                );
                if (quit) {
                    return;
                }
                const exportableLayers = [
                    ['mapstuff'],
                    ['poi'],
                    ['powergrid'],
                    ['soundguide'],
                    ['plazas'],
                    ['names'],
                    ['neighbourhoods'],
                    ['placement'],
                ];
                showNotification('Downloading map data...');
                for (const [groupName] of exportableLayers) {
                    try {
                        const layer = map.groups[groupName];
                        const geojson = layer.toGeoJSON();
                        var kml = ToKML(geojson, {
                            documentName: groupName,
                            name: 'name',
                            description: 'description',
                        });
                        for (const [data, filetype] of [
                            [kml, '.kml'],
                            [JSON.stringify(geojson), '.geojson'],
                        ]) {
                            const link = document.createElement('a');
                            const uri = 'data:text/kml;charset=utf-8,' + encodeURIComponent(data);
                            link.download = groupName + filetype;
                            link.target = '_blank';
                            link.href = uri;
                            link.click();
                            console.log('Downloading map data from layergroup ' + groupName);
                            await new Promise((r) => setTimeout(r, 500));
                        }
                    } catch (err) {
                        console.error(err);
                        console.warn('Failed to download map data from layergroup ' + groupName);
                    }
                }
            };

            return btn;
        },
    });

    return new button;
}

export function guide(onClickCallback: () => any): L.Control {
    const button = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: () => {
            let btn = L.DomUtil.create('button', 'leaflet-bar help-button');
            btn.title = 'Guide to the placement process';
            btn.textContent = 'ℹ️';
            L.DomEvent.disableClickPropagation(btn);

            btn.onclick = () => {
                showDrawer({
                    file: 'guide-home',
                    position: 'end',
                    onClose: () => {
                        localStorage.setItem('hasSeenPlacementWelcome2025', 'true');
                    },
                });
            };

            return btn;
        },
    });

    return new button;
}
