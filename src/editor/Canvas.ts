import { Viewport } from './Viewport.js';
import { Grid } from './Grid.js';
import { NodeRenderer } from './NodeRenderer.js';
import { ConnectionRenderer } from './ConnectionRenderer.js';
import { SelectionManager } from './SelectionManager.js';
import { FloatingMessageManager } from './FloatingMessage.js';
import { EditorState } from '../state/EditorState.js';
import { Vector2 } from '../utils/Vector2.js';
import { Theme } from '../utils/Theme.js';

/**
 * Canvas: Main rendering surface for the behavior tree editor
 */
export class Canvas {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    public viewport: Viewport;
    public grid: Grid;
    public nodeRenderer: NodeRenderer;
    public connectionRenderer: ConnectionRenderer;
    public selectionManager: SelectionManager;
    public floatingMessages: FloatingMessageManager;

    private editorState: EditorState;
    private animationFrameId: number | null = null;
    private isRendering: boolean = false;
    private boundResizeHandler = () => this.resizeCanvas();

    constructor(canvasElement: HTMLCanvasElement, editorState: EditorState) {
        this.canvas = canvasElement;
        this.editorState = editorState;

        const context = this.canvas.getContext('2d');
        if (!context) {
            throw new Error('Failed to get 2D context from canvas');
        }
        this.ctx = context;

        // Initialize components
        this.viewport = new Viewport();
        this.grid = new Grid();
        this.nodeRenderer = new NodeRenderer();
        this.connectionRenderer = new ConnectionRenderer();
        this.selectionManager = new SelectionManager();
        this.floatingMessages = new FloatingMessageManager();

        // Setup canvas
        this.resizeCanvas();
        this.viewport.reset();

        // Handle window resize
        window.addEventListener('resize', this.boundResizeHandler);
    }

    /**
     * Resizes the canvas to match its container
     */
    private resizeCanvas(): void {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        this.viewport.setCanvasSize(rect.width, rect.height);
    }

    /**
     * Starts the rendering loop
     */
    public startRendering(): void {
        if (this.isRendering) return;

        this.isRendering = true;
        this.renderLoop();
    }

    /**
     * Stops the rendering loop
     */
    public stopRendering(): void {
        this.isRendering = false;
        if (this.animationFrameId !== null) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Main rendering loop
     */
    private renderLoop = (): void => {
        if (!this.isRendering) return;

        this.render();
        this.animationFrameId = requestAnimationFrame(this.renderLoop);
    };

    /**
     * Renders a single frame
     */
    public render(): void {
        const ctx = this.ctx;
        const dpr = window.devicePixelRatio || 1;

        // Clear canvas completely (use physical pixels)
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = Theme.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();

        // Set up coordinate system: DPR scaling first
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Then apply viewport transform (on top of DPR scaling)
        ctx.translate(this.viewport.offset.x, this.viewport.offset.y);
        ctx.scale(this.viewport.zoom, this.viewport.zoom);

        // Render grid
        if (this.editorState.showGrid) {
            this.grid.render(ctx, this.viewport);
        }

        // Render connections
        this.connectionRenderer.renderConnections(
            ctx,
            this.editorState.nodes,
            this.nodeRenderer
        );

        // Render temporary connection (while dragging)
        if (this.editorState.tempConnection) {
            const temp = this.editorState.tempConnection;
            const hasAddPort = temp.from.category === 'composite' || temp.from.category === 'decorator';
            const fromPositions = this.nodeRenderer.getOutputPortPositions(
                temp.from,
                temp.from.position,
                temp.from.children.length,
                hasAddPort
            );
            const fromPos = fromPositions[temp.fromPort] || fromPositions[0];

            this.connectionRenderer.drawTemporaryConnection(ctx, fromPos, temp.toPos);
        }

        // Render nodes
        this.editorState.nodes.forEach(node => {
            const isSelected = this.selectionManager.isSelected(node);
            const isHovered = this.selectionManager.isHovered(node);

            this.nodeRenderer.render(ctx, node, this.viewport, isSelected, isHovered);
        });

        // Update and render floating messages
        this.floatingMessages.update();
        this.floatingMessages.render(ctx);

        // Render box selection
        if (this.selectionManager.isBoxSelectActive()) {
            this.selectionManager.renderBoxSelect(ctx);
        }
    }

    /**
     * Converts screen coordinates to world coordinates
     */
    public screenToWorld(screenPos: Vector2): Vector2 {
        return this.viewport.screenToWorld(screenPos);
    }

    /**
     * Converts world coordinates to screen coordinates
     */
    public worldToScreen(worldPos: Vector2): Vector2 {
        return this.viewport.worldToScreen(worldPos);
    }

    /**
     * Gets the mouse position in world space from a mouse event
     */
    public getWorldMousePos(event: MouseEvent): Vector2 {
        const rect = this.canvas.getBoundingClientRect();
        const screenPos = new Vector2(
            event.clientX - rect.left,
            event.clientY - rect.top
        );
        return this.screenToWorld(screenPos);
    }

    /**
     * Cleanup
     */
    public dispose(): void {
        this.stopRendering();
        window.removeEventListener('resize', this.boundResizeHandler);
    }
}
