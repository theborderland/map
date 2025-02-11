import * as L from 'leaflet';

export function editing(messageText: string): L.Control {
    const message = L.Control.extend({
        options: { position: 'bottomleft' },
        onAdd: () => {
            let div = L.DomUtil.create('p', 'btn btn-gradient1 button-shake-animate');
            div.innerHTML += messageText;
            return div;
        },
    });
    
    return new message;
}