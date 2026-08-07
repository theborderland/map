import L, { Layer, Map, Point } from 'leaflet';
import { GRID_CONFIG, GridOptions, rotate } from '../utils/gridUtils';

/**
 * 
 * 
 * YOU MIGHT ALSO NEED TO UPDATE THE gridUtil.ts 
 * FILE WHEN DOING CHANGES HERE!
 * 
 * 
 * 
 * Canvas-based reference grid layer.
 * 
 * Draws:
 * - 50x50m grid cells
 * - Rotated by configured bearing
 * - Cell labels (A01-Z30)
 *
 * Uses a single canvas for good performance.
 * Honours devicePixelRatio so lines are crisp on retina displays.
 */
export class ReferenceGridLayer extends Layer {

    private mapInstance!: Map;
    private canvas!: HTMLCanvasElement;
    private ctx!: CanvasRenderingContext2D;
    private originProj!: Point;

    private readonly gridOptions: GridOptions;

    constructor(options?: Partial<GridOptions>) {
        super();
        this.gridOptions = { ...GRID_CONFIG, ...options };
    }

    // -------------------------------------------------------------------------
    // Leaflet lifecycle
    // -------------------------------------------------------------------------

    onAdd(map: Map): this {
        this.mapInstance = map;

        this.canvas = L.DomUtil.create('canvas');
        this.canvas.style.position = 'absolute';
        this.canvas.style.pointerEvents = 'none';

        map.getPanes().overlayPane.appendChild(this.canvas);
        map.on('move zoom resize', this.reset, this);

        this.reset();
        return this;
    }

    onRemove(map: Map): this {
        map.off('move zoom resize', this.reset, this);
        this.canvas?.remove();
        return this;
    }

    // -------------------------------------------------------------------------
    // Drawing
    // -------------------------------------------------------------------------

    private reset = (): void => {
        const map = this.mapInstance;
        const size = map.getSize();
        const dpr = window.devicePixelRatio || 1;

        // Physical pixels
        this.canvas.width = size.x * dpr;
        this.canvas.height = size.y * dpr;

        // CSS pixels (keeps layout correct)
        this.canvas.style.width = `${size.x}px`;
        this.canvas.style.height = `${size.y}px`;

        const topLeft = map.containerPointToLayerPoint([0, 0]);
        L.DomUtil.setPosition(this.canvas, topLeft);

        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        // Scale all draw calls by DPR so coordinates stay in CSS-pixel space
        ctx.scale(dpr, dpr);
        this.ctx = ctx;

        ctx.clearRect(0, 0, size.x, size.y);

        const { origin, cellSize, bearing, rows, cols, strokeStyle, lineWidth, font, textColor } = this.gridOptions;

        const crs = L.CRS.EPSG3857;
        this.originProj = crs.project(origin);

        ctx.strokeStyle = strokeStyle;
        ctx.lineWidth = lineWidth;
        ctx.font = font;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'top';

        for (let col = 0; col < cols; col++) {
            for (let row = 0; row < rows; row++) {
                this.drawCell(col, row);
            }
        }
    };

    /**
     * Draws a single grid cell and its label.
     */
    private drawCell(col: number, row: number): void {
        const { cellSize, bearing } = this.gridOptions;
        const ctx = this.ctx;

        const left = col * cellSize;
        const right = (col + 1) * cellSize;
        const top = -row * cellSize;
        const bottom = -(row + 1) * cellSize;

        // Rotate corners and convert to container points
        const corners = [
            this.toContainerPoint(rotate(left, top, bearing)),
            this.toContainerPoint(rotate(right, top, bearing)),
            this.toContainerPoint(rotate(right, bottom, bearing)),
            this.toContainerPoint(rotate(left, bottom, bearing)),
        ];

        // Cell outline
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
            ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        // Label (e.g. "A01") — placed at the visually top-left corner,
        const label = String.fromCharCode(65 + col) + String(row + 1).padStart(2, '0');
        ctx.fillText(label, corners[0].x + 2, corners[0].y + 2);
    }

    // -------------------------------------------------------------------------
    // Coordinate helpers
    // -------------------------------------------------------------------------

    private toContainerPoint(offset: { x: number; y: number }): Point {
        const crs = this.mapInstance.options.crs!;
        const latLng = crs.unproject(
            L.point(this.originProj.x + offset.x, this.originProj.y + offset.y)
        );
        return this.mapInstance.latLngToContainerPoint(latLng);
    }
}