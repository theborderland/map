import * as L from 'leaflet';

export function editing(messageText: string): L.Control {
    const message = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: () => {
            let div = L.DomUtil.create('div', 'note-about-editing');
            div.innerHTML += messageText;
            return div;
        },
    });
    
    return new message;
}