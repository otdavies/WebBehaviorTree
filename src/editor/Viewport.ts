import { Vector2 } from '../utils/Vector2.js';

/**
 * Viewport: Manages camera position, zoom, and coordinate transformations.
 *
 * Provides methods to convert between screen space and world space,
 * and handles panning and zooming.
 */
export class Viewport {
    // Camera position in world space
    public offset: Vector2 = new Vector2(0, 0);

    // Zoom level (1.0 = 100%, 0.5 = 50%, 2.0 = 200%)
    public zoom: number = 1.0;

    // Zoom limits
    public minZoom: number = 0.1;
    public maxZoom: number = 3.0;

    // Canvas dimensions (in CSS pixels)
    private canvasWidth: number = 0;
    private canvasHeight: number = 0;

    /**
     * Updates the canvas dimensions (call this on resize)
     */
    public setCanvasSize(width: number, height: number): void {
        this.canvasWidth = width;
        this.canvasHeight = height;
    }

    /**
     * Converts screen coordinates to world coordinates
     */
    public screenToWorld(screenPos: Vector2): Vector2 {
        return new Vector2(
            (screenPos.x - this.offset.x) / this.zoom,
            (screenPos.y - this.offset.y) / this.zoom
        );
    }

    /**
     * Converts world coordinates to screen coordinates
     */
    public worldToScreen(worldPos: Vector2): Vector2 {
        return new Vector2(
            worldPos.x * this.zoom + this.offset.x,
            worldPos.y * this.zoom + this.offset.y
        );
    }

    /**
     * Pans the viewport by a screen-space delta
     */
    public pan(delta: Vector2): void {
        this.offset = this.offset.add(delta);
    }

    /**
     * Zooms the viewport, centered on a screen position
     */
    public zoomAt(screenPos: Vector2, zoomDelta: number): void {
        // Get world position before zoom
        const worldPosBefore = this.screenToWorld(screenPos);

        // Apply zoom
        const newZoom = this.zoom * zoomDelta;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        // Get world position after zoom
        const worldPosAfter = this.screenToWorld(screenPos);

        // Adjust offset to keep the same world point under the cursor
        const worldDiff = worldPosAfter.subtract(worldPosBefore);
        this.offset = this.offset.add(worldDiff.multiply(this.zoom));
    }

    /**
     * Sets the zoom level directly
     */
    public setZoom(zoom: number): void {
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, zoom));
    }

    /**
     * Centers the viewport on a world position
     */
    public centerOn(worldPos: Vector2): void {
        this.offset = new Vector2(
            this.canvasWidth / 2 - worldPos.x * this.zoom,
            this.canvasHeight / 2 - worldPos.y * this.zoom
        );
    }

    /**
     * Resets the viewport to default state
     */
    public reset(): void {
        this.offset = new Vector2(this.canvasWidth / 2, this.canvasHeight / 2);
        this.zoom = 1.0;
    }

    /**
     * Gets the visible world bounds (for culling)
     */
    public getVisibleBounds(): { min: Vector2; max: Vector2 } {
        const topLeft = this.screenToWorld(new Vector2(0, 0));
        const bottomRight = this.screenToWorld(new Vector2(this.canvasWidth, this.canvasHeight));

        return {
            min: topLeft,
            max: bottomRight
        };
    }

    /**
     * Applies the viewport transformation to a canvas context
     */
    public applyTransform(ctx: CanvasRenderingContext2D): void {
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset
        ctx.translate(this.offset.x, this.offset.y);
        ctx.scale(this.zoom, this.zoom);
    }

    /**
     * Resets the canvas transform
     */
    public resetTransform(ctx: CanvasRenderingContext2D): void {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
}
