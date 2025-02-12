import * as L from 'leaflet';

export function edit(isEditMode: boolean, onClickCallback: () => void): L.Control {

    const button = L.Control.extend({
        options: { position: 'bottomleft' },

        onAdd: () => {
            let btn = L.DomUtil.create('button', 'btn btn-gradient1 button-shake-animate');
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

export function simple (title: string, onClickCallback: (e: any) => void) {
    let button = document.createElement('button');
    button.innerHTML = title;
    button.onclick = onClickCallback;

    return button;
}