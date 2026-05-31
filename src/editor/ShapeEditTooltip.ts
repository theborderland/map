import * as L from 'leaflet';

export class ShapeEditTooltip {
    private _map: L.Map;
    private _tooltip: HTMLDivElement;
    private _mouseMoveListener: (evt: MouseEvent) => void;

    constructor(map: L.Map) {
        this._map = map;
        const container = this._map.getContainer();

        this._tooltip = document.createElement('div');
        this._tooltip.className = 'shape-edit-tooltip';
        this._tooltip.textContent = 'Ctrl-click to remove a point';

        this._mouseMoveListener = (evt: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            this._tooltip.style.left = `${evt.clientX - rect.left + 12}px`;
            this._tooltip.style.top = `${evt.clientY - rect.top + 12}px`;
        };

        container.appendChild(this._tooltip);
        this.setVisible(false);
    }

    public setVisible(visible: boolean) {
        if (visible) {
            this._tooltip.style.display = 'block';
            this._map.getContainer().addEventListener('mousemove', this._mouseMoveListener);
        } else {
            this._tooltip.style.display = 'none';
            this._map.getContainer().removeEventListener('mousemove', this._mouseMoveListener);
        }
    }

    public destroy() {
        this.setVisible(false);
        this._tooltip.remove();
    }
}
