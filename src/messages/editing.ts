import * as L from 'leaflet';

export function editing(messageText: string): L.Control {
    const Message = L.Control.extend({
        options: { position: 'bottomleft' },

        onAdd() {
            const div = L.DomUtil.create('div', 'note-about-editing');
            div.innerHTML = `
                <button class="note-close" title="Dismiss">✕</button>
                ${messageText}
                `;

            div.querySelector('.note-close')?.addEventListener('click', () => {
                this.remove();
            });

            return div;
        },
    });

    return new Message();
}