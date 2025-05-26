import * as L from 'leaflet';

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

export function download(onClickCallback: () => any): L.Control {
    const button = L.Control.extend({
        options: { position: 'topleft' },
        onAdd: () => {
            let btn = L.DomUtil.create('button', 'leaflet-bar help-button');
            btn.title = 'Save everything';
            btn.textContent = '💾';
            L.DomEvent.disableClickPropagation(btn);

            btn.onclick = () => { onClickCallback(); };

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
    
                btn.onclick = () => {onClickCallback();};
    
                return btn;
            },
        });
    
    return new button;
}
