import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { NodeRenderer } from './NodeRenderer.js';
import { Theme } from '../utils/Theme.js';
import { ConnectionConstants, ConnectionShadowConstants } from '../utils/RendererConstants.js';

/**
 * ConnectionRenderer: Draws bezier curves between parent and child nodes.
 */
export class ConnectionRenderer {
    public lineColor: string = Theme.ui.connection;
    public activeLineColor: string = Theme.ui.hover;
    public lineWidth: number = ConnectionConstants.DEFAULT_LINE_WIDTH;

    // Flash animation for reordered connections
    private flashingConnections: Map<string, number> = new Map(); // key: "parentId-childId", value: timestamp
    private flashDuration: number = ConnectionConstants.FLASH_DURATION; // milliseconds

    // Flow animation for active connections
    private animationOffset: number = 0;
    private flowSpeed: number = ConnectionConstants.FLOW_SPEED; // pixels per second

    /**
     * Updates animation state (call this every frame)
     * @param deltaTime - Time elapsed since last frame in seconds
     */
    public updateAnimation(deltaTime: number): void {
        this.animationOffset += this.flowSpeed * deltaTime;
        // Keep offset within dash pattern range to prevent overflow
        if (this.animationOffset > ConnectionConstants.FLOW_DASH_RESET) {
            this.animationOffset = 0;
        }
    }

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

            // Check if this connection is actively executing
            const isActive = this.isConnectionActive(node, index);

            this.drawConnection(ctx, fromPos, toPos, false, isFlashing, flashIntensity, isActive);
        });
    }

    /**
     * Determines if a connection is currently active (execution is flowing through it)
     */
    private isConnectionActive(parent: TreeNode, childIndex: number): boolean {
        // Parent must be running
        if (parent.status !== 'running') {
            return false;
        }

        const child = parent.children[childIndex];
        if (!child) {
            return false;
        }

        // For parallel nodes: all children execute simultaneously
        // Show connection as active if child is currently running
        if (parent.type === 'parallel') {
            return child.status === 'running';
        }

        // For sequential nodes (sequence, selector): only current child is active
        return parent.currentChildIndex === childIndex;
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
        flashIntensity: number = 0,
        isActive: boolean = false
    ): void {
        const controlPointOffset = Math.abs(to.y - from.y) * ConnectionConstants.CONTROL_POINT_OFFSET;

        const cp1 = new Vector2(from.x, from.y + controlPointOffset);
        const cp2 = new Vector2(to.x, to.y - controlPointOffset);

        // Apply active flow effect (takes priority over flash)
        if (isActive) {
            // Draw glow layer for active connections
            ctx.shadowColor = Theme.ui.activeConnection;
            ctx.shadowBlur = ConnectionShadowConstants.ACTIVE_BLUR;
            ctx.strokeStyle = Theme.ui.activeConnection;
            ctx.lineWidth = this.lineWidth + ConnectionConstants.ACTIVE_LINE_WIDTH_BONUS;

            // Animated dashes flowing downward
            ctx.setLineDash([ConnectionConstants.DASH_PATTERN_LONG, ConnectionConstants.DASH_PATTERN_SHORT]);
            ctx.lineDashOffset = -this.animationOffset; // Negative for downward flow
        }
        // Apply flash effect if active (and not actively executing)
        else if (isFlashing && flashIntensity > 0) {
            // Draw glow layer
            ctx.shadowColor = '#F1C40F';
            ctx.shadowBlur = ConnectionShadowConstants.FLASH_MAX_BLUR * flashIntensity;
            ctx.strokeStyle = `rgba(241, 196, 15, ${flashIntensity})`;
            ctx.lineWidth = this.lineWidth + ConnectionShadowConstants.FLASH_MAX_WIDTH_BONUS * flashIntensity;
            ctx.setLineDash([]);
        }
        // Default connection style
        else {
            ctx.strokeStyle = this.lineColor;
            ctx.lineWidth = this.lineWidth;
            ctx.shadowBlur = 0;

            if (isDashed) {
                ctx.setLineDash([ConnectionConstants.TEMPORARY_DASH_LONG, ConnectionConstants.TEMPORARY_DASH_SHORT]);
            } else {
                ctx.setLineDash([]);
            }
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, to.x, to.y);
        ctx.stroke();

        // Reset effects
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
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

    /**
     * Check if there are any active animations requiring continuous rendering
     */
    public hasActiveAnimations(): boolean {
        // Check for active flash animations
        if (this.flashingConnections.size > 0) {
            return true;
        }
        // Flow animations are always active if connections exist
        // Return false here to skip rendering when idle
        return false;
    }
}
