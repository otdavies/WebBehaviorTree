import { Viewport } from './Viewport.js';

/**
 * Grid: Renders a background grid for the canvas.
 *
 * Provides visual reference and optional snapping functionality.
 */
export class Grid {
    public enabled: boolean = true;
    public cellSize: number = 20; // pixels at 100% zoom
    public lineColor: string = '#2D2D2D';
    public majorLineColor: string = '#404040';
    public majorLineInterval: number = 5; // Every 5th line is major

    /**
     * Renders the grid
     */
    public render(ctx: CanvasRenderingContext2D, viewport: Viewport): void {
        if (!this.enabled) return;

        const bounds = viewport.getVisibleBounds();

        // Calculate grid lines in world space
        const cellSizeWorld = this.cellSize;

        // Calculate start and end positions for grid lines
        const startX = Math.floor(bounds.min.x / cellSizeWorld) * cellSizeWorld;
        const endX = Math.ceil(bounds.max.x / cellSizeWorld) * cellSizeWorld;
        const startY = Math.floor(bounds.min.y / cellSizeWorld) * cellSizeWorld;
        const endY = Math.ceil(bounds.max.y / cellSizeWorld) * cellSizeWorld;

        ctx.lineWidth = 1 / viewport.zoom; // Keep lines thin regardless of zoom

        // Draw vertical lines
        for (let x = startX; x <= endX; x += cellSizeWorld) {
            const isMajor = Math.abs(x / cellSizeWorld) % this.majorLineInterval === 0;
            ctx.strokeStyle = isMajor ? this.majorLineColor : this.lineColor;

            ctx.beginPath();
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = startY; y <= endY; y += cellSizeWorld) {
            const isMajor = Math.abs(y / cellSizeWorld) % this.majorLineInterval === 0;
            ctx.strokeStyle = isMajor ? this.majorLineColor : this.lineColor;

            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
            ctx.stroke();
        }
    }

    /**
     * Snaps a world position to the grid
     */
    public snap(worldPos: { x: number; y: number }): { x: number; y: number } {
        return {
            x: Math.round(worldPos.x / this.cellSize) * this.cellSize,
            y: Math.round(worldPos.y / this.cellSize) * this.cellSize
        };
    }
}
