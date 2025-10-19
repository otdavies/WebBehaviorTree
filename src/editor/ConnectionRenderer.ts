import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { NodeRenderer } from './NodeRenderer.js';
import { Theme } from '../utils/Theme.js';

/**
 * ConnectionRenderer: Draws bezier curves between parent and child nodes.
 */
export class ConnectionRenderer {
    public lineColor: string = Theme.ui.connection;
    public activeLineColor: string = Theme.ui.hover;
    public lineWidth: number = 2;

    // Flash animation for reordered connections
    private flashingConnections: Map<string, number> = new Map(); // key: "parentId-childId", value: timestamp
    private flashDuration: number = 500; // milliseconds

    /**
     * Renders all connections in the tree
     */
    public renderConnections(ctx: CanvasRenderingContext2D, nodes: TreeNode[], nodeRenderer: NodeRenderer): void {
        nodes.forEach(node => {
            if (node.children.length > 0) {
                this.renderNodeConnections(ctx, node, nodeRenderer);
            }
        });
    }

    /**
     * Renders connections for a single node to its children
     */
    private renderNodeConnections(ctx: CanvasRenderingContext2D, node: TreeNode, nodeRenderer: NodeRenderer): void {
        const hasAddPort = node.canAddMoreChildren();
        const outputPositions = nodeRenderer.getOutputPortPositions(
            node,
            node.position,
            node.children.length,
            hasAddPort
        );

        node.children.forEach((child, index) => {
            const fromPos = outputPositions[index];
            const toPos = nodeRenderer.getInputPortPosition(child, child.position);

            // Check if this connection is flashing
            const connectionKey = `${node.id}-${child.id}`;
            const flashStart = this.flashingConnections.get(connectionKey);
            let isFlashing = false;
            let flashIntensity = 0;

            if (flashStart) {
                const elapsed = Date.now() - flashStart;
                if (elapsed < this.flashDuration) {
                    isFlashing = true;
                    // Fade from 1 to 0 over the duration
                    flashIntensity = 1 - (elapsed / this.flashDuration);
                } else {
                    // Flash expired, remove it
                    this.flashingConnections.delete(connectionKey);
                }
            }

            this.drawConnection(ctx, fromPos, toPos, false, isFlashing, flashIntensity);
        });
    }

    /**
     * Triggers a flash animation for a parent's connections (when reordered)
     */
    public flashConnectionsForParent(parent: TreeNode): void {
        const timestamp = Date.now();
        parent.children.forEach(child => {
            const key = `${parent.id}-${child.id}`;
            this.flashingConnections.set(key, timestamp);
        });
    }

    /**
     * Draws a single bezier connection
     */
    public drawConnection(
        ctx: CanvasRenderingContext2D,
        from: Vector2,
        to: Vector2,
        isDashed: boolean = false,
        isFlashing: boolean = false,
        flashIntensity: number = 0
    ): void {
        const controlPointOffset = Math.abs(to.y - from.y) * 0.5;

        const cp1 = new Vector2(from.x, from.y + controlPointOffset);
        const cp2 = new Vector2(to.x, to.y - controlPointOffset);

        // Apply flash effect if active
        if (isFlashing && flashIntensity > 0) {
            // Draw glow layer
            ctx.shadowColor = '#F1C40F';
            ctx.shadowBlur = 20 * flashIntensity;
            ctx.strokeStyle = `rgba(241, 196, 15, ${flashIntensity})`;
            ctx.lineWidth = this.lineWidth + 4 * flashIntensity;
        } else {
            ctx.strokeStyle = this.lineColor;
            ctx.lineWidth = this.lineWidth;
            ctx.shadowBlur = 0;
        }

        if (isDashed) {
            ctx.setLineDash([5, 5]);
        } else {
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
        ctx.stroke();

        // Reset effects
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
    }

    /**
     * Draws a temporary connection (used while dragging)
     */
    public drawTemporaryConnection(
        ctx: CanvasRenderingContext2D,
        from: Vector2,
        to: Vector2
    ): void {
        this.drawConnection(ctx, from, to, true, true);
    }
}
