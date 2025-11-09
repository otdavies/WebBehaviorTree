import { TreeNode } from '../core/TreeNode.js';
import { NodeStatus } from '../core/NodeStatus.js';
import { Vector2 } from '../utils/Vector2.js';
import { Viewport } from './Viewport.js';
import { Theme } from '../utils/Theme.js';
import {
    NodeConstants,
    ShadowConstants,
    StrokeConstants,
    ProgressBarConstants,
    PulseAnimationConstants,
    HoverConstants
} from '../utils/RendererConstants.js';

/**
 * NodeRenderer: Renders individual nodes on the canvas.
 *
 * Draws nodes as styled rectangles with icons, labels, ports, and status indicators.
 */
export class NodeRenderer {
    // Node dimensions (use Theme constants)
    public static readonly NODE_MIN_WIDTH = Theme.layout.nodeMinWidth;
    public static readonly NODE_HEIGHT = Theme.layout.nodeHeight;
    public static readonly NODE_RADIUS = NodeConstants.CORNER_RADIUS;
    public static readonly NODE_PADDING = NodeConstants.INNER_PADDING;

    // Port dimensions (use Theme constants)
    public static readonly PORT_RADIUS = Theme.layout.portRadius;
    public static readonly PORT_CLICK_RADIUS = Theme.layout.portClickRadius;
    public static readonly OUTPUT_PORT_SPACING = Theme.layout.outputPortSpacing;
    public static readonly ADD_PORT_RADIUS = NodeConstants.ADD_PORT_RADIUS;

    /**
     * Calculates the width of a node based on its children count
     */
    public static getNodeWidth(node: TreeNode): number {
        const hasChildren = node.category === 'composite' || node.category === 'decorator';
        if (!hasChildren) {
            return this.NODE_MIN_WIDTH;
        }

        // For multi-ports, we only need the minimum width (one wide port fits all connections)
        if (node.outputPortType === 'multi') {
            return this.NODE_MIN_WIDTH;
        }

        // For single ports, calculate width needed for individual output ports
        const childCount = node.children.length;
        if (childCount === 0) {
            return this.NODE_MIN_WIDTH;
        }

        const widthForPorts = childCount * this.OUTPUT_PORT_SPACING + NodeConstants.PORT_WIDTH_MARGIN;
        return Math.max(this.NODE_MIN_WIDTH, widthForPorts);
    }

    /**
     * Gets the input port offset for a node
     */
    public static getInputPortOffset(node: TreeNode): Vector2 {
        return new Vector2(this.getNodeWidth(node) / 2, 0);
    }

    // Colors (use Theme constants)
    private static readonly STATUS_COLORS = {
        [NodeStatus.SUCCESS]: Theme.status.success,
        [NodeStatus.FAILURE]: Theme.status.failure,
        [NodeStatus.RUNNING]: Theme.status.running,
        [NodeStatus.IDLE]: Theme.status.idle
    };

    /**
     * Renders a node
     */
    public render(
        ctx: CanvasRenderingContext2D,
        node: TreeNode,
        viewport: Viewport,
        isSelected: boolean = false,
        isHovered: boolean = false
    ): void {
        const pos = node.position;

        ctx.save();

        // Draw shadow
        if (isSelected || isHovered) {
            this.drawShadow(ctx, pos, isSelected);
        }

        // Draw node body
        this.drawNodeBody(ctx, node, pos, node.color, isSelected, isHovered);

        // Draw label (centered, no icon)
        this.drawLabel(ctx, node, pos, node.label, viewport);

        // Draw status indicator
        this.drawStatusIndicator(ctx, node, pos, node.status);

        // Draw ports
        // Only draw input port if the node defines input ports
        if (node.numInputs > 0) {
            this.drawInputPort(ctx, node, pos);
        }

        if (node.category === 'composite' || node.category === 'decorator') {
            // Draw output ports (multi-port or individual ports based on node type)
            this.drawOutputPorts(ctx, node, pos, node.children.length, false);
        } else if (node.children.length > 0) {
            // Leaf nodes shouldn't have children, but if they do, show them
            this.drawOutputPorts(ctx, node, pos, node.children.length, false);
        }

        ctx.restore();
    }

    /**
     * Draws node shadow (for selection/hover)
     */
    private drawShadow(ctx: CanvasRenderingContext2D, _pos: Vector2, isSelected: boolean): void {
        if (isSelected) {
            ctx.shadowColor = Theme.ui.selection;
            ctx.shadowBlur = ShadowConstants.SELECTION_BLUR;
            ctx.shadowOffsetX = ShadowConstants.SELECTION_OFFSET_X;
            ctx.shadowOffsetY = ShadowConstants.SELECTION_OFFSET_Y;
        } else {
            ctx.shadowColor = `rgba(0, 0, 0, ${ShadowConstants.HOVER_OPACITY})`;
            ctx.shadowBlur = ShadowConstants.HOVER_BLUR;
            ctx.shadowOffsetX = ShadowConstants.HOVER_OFFSET_X;
            ctx.shadowOffsetY = ShadowConstants.HOVER_OFFSET_Y;
        }
    }

    /**
     * Draws the node body (rounded rectangle)
     */
    private drawNodeBody(
        ctx: CanvasRenderingContext2D,
        node: TreeNode,
        pos: Vector2,
        color: string,
        isSelected: boolean,
        isHovered: boolean
    ): void {
        const nodeWidth = NodeRenderer.getNodeWidth(node);
        const x = pos.x - nodeWidth / 2;
        const y = pos.y - NodeRenderer.NODE_HEIGHT / 2;

        // Draw background
        ctx.fillStyle = Theme.grid;
        this.roundRect(ctx, x, y, nodeWidth, NodeRenderer.NODE_HEIGHT, NodeRenderer.NODE_RADIUS);
        ctx.fill();

        // Draw progress bar for composite nodes that are executing
        if ((node.category === 'composite' || node.category === 'decorator') &&
            node.status === NodeStatus.RUNNING &&
            node.children.length > 0) {
            this.drawProgressBar(ctx, node, pos, nodeWidth);
        }

        // Reset shadow for border
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Draw border
        ctx.strokeStyle = color;
        ctx.lineWidth = isSelected ? StrokeConstants.NODE_SELECTED : StrokeConstants.NODE_NORMAL;
        this.roundRect(ctx, x, y, nodeWidth, NodeRenderer.NODE_HEIGHT, NodeRenderer.NODE_RADIUS);
        ctx.stroke();

        // Draw hover highlight
        if (isHovered && !isSelected) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${HoverConstants.HIGHLIGHT_OPACITY})`;
            ctx.lineWidth = StrokeConstants.NODE_HOVER_HIGHLIGHT;
            this.roundRect(
                ctx,
                x + HoverConstants.HIGHLIGHT_INSET,
                y + HoverConstants.HIGHLIGHT_INSET,
                nodeWidth - HoverConstants.HIGHLIGHT_INSET * 2,
                NodeRenderer.NODE_HEIGHT - HoverConstants.HIGHLIGHT_INSET * 2,
                NodeRenderer.NODE_RADIUS - HoverConstants.HIGHLIGHT_RADIUS_REDUCTION
            );
            ctx.stroke();
        }
    }

    /**
     * Draws a progress bar showing execution progress for composite/decorator nodes
     */
    private drawProgressBar(
        ctx: CanvasRenderingContext2D,
        node: TreeNode,
        pos: Vector2,
        nodeWidth: number
    ): void {
        const x = pos.x - nodeWidth / 2;
        const y = pos.y - NodeRenderer.NODE_HEIGHT / 2;

        // Calculate progress based on current child index
        const progress = node.children.length > 0
            ? (node.currentChildIndex + 1) / node.children.length
            : 0;

        // Draw progress bar fill
        const progressWidth = nodeWidth * progress;
        if (progressWidth > 0) {
            ctx.save();

            // Create clipping region for the rounded rectangle
            ctx.beginPath();
            this.roundRect(ctx, x, y, nodeWidth, NodeRenderer.NODE_HEIGHT, NodeRenderer.NODE_RADIUS);
            ctx.clip();

            // Draw gradient progress bar
            const gradient = ctx.createLinearGradient(x, y, x + progressWidth, y);
            gradient.addColorStop(0, `rgba(${ProgressBarConstants.GRADIENT_START_R}, ${ProgressBarConstants.GRADIENT_START_G}, ${ProgressBarConstants.GRADIENT_START_B}, ${ProgressBarConstants.GRADIENT_START_ALPHA})`);
            gradient.addColorStop(1, `rgba(${ProgressBarConstants.GRADIENT_END_R}, ${ProgressBarConstants.GRADIENT_END_G}, ${ProgressBarConstants.GRADIENT_END_B}, ${ProgressBarConstants.GRADIENT_END_ALPHA})`);

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, progressWidth, NodeRenderer.NODE_HEIGHT);

            ctx.restore();
        }
    }

    /**
     * Draws the node label (centered)
     */
    private drawLabel(ctx: CanvasRenderingContext2D, _node: TreeNode, pos: Vector2, label: string, viewport: Viewport): void {
        const fontSize = Theme.layout.fontSize / viewport.zoom;
        const labelX = pos.x;
        const labelY = pos.y;

        ctx.fillStyle = '#E0E0E0';
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
    }

    /**
     * Draws the status indicator (top-right corner)
     */
    private drawStatusIndicator(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2, status: NodeStatus): void {
        if (status === NodeStatus.IDLE) return; // Don't draw anything for idle

        const nodeWidth = NodeRenderer.getNodeWidth(node);
        const x = pos.x + nodeWidth / 2 - NodeConstants.STATUS_INDICATOR_OFFSET;
        const y = pos.y - NodeRenderer.NODE_HEIGHT / 2 + NodeConstants.STATUS_INDICATOR_OFFSET;
        const radius = NodeConstants.STATUS_INDICATOR_RADIUS;

        const color = NodeRenderer.STATUS_COLORS[status];

        // Add glow effect for active statuses
        if (status === NodeStatus.RUNNING) {
            // Pulsing glow for running
            const pulseRadius = radius +
                Math.sin(Date.now() / PulseAnimationConstants.PULSE_SPEED) *
                PulseAnimationConstants.PULSE_RADIUS_MIN +
                PulseAnimationConstants.PULSE_RADIUS_MAX;
            ctx.shadowColor = color;
            ctx.shadowBlur = ShadowConstants.STATUS_RUNNING_BLUR;
            ctx.fillStyle = color;
            ctx.globalAlpha = PulseAnimationConstants.PULSE_OPACITY;
            ctx.beginPath();
            ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        } else if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
            // Glow for completed statuses
            ctx.shadowColor = color;
            ctx.shadowBlur = ShadowConstants.STATUS_COMPLETED_BLUR;
        }

        // Draw main status indicator
        ctx.fillStyle = color;
        ctx.strokeStyle = Theme.background;
        ctx.lineWidth = StrokeConstants.PORT_BORDER;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
    }

    /**
     * Draws the input port (top center)
     */
    private drawInputPort(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2): void {
        const portPos = this.getInputPortPosition(node, pos);
        const isMultiPort = node.inputPortType === 'multi';

        ctx.fillStyle = Theme.ui.connection;
        ctx.strokeStyle = Theme.grid;
        ctx.lineWidth = StrokeConstants.PORT_BORDER;

        if (isMultiPort) {
            // Draw wide rectangular multi-port
            const halfWidth = Theme.layout.multiPortWidth / 2;
            const halfHeight = Theme.layout.multiPortHeight / 2;

            ctx.beginPath();
            ctx.roundRect(
                portPos.x - halfWidth,
                portPos.y - halfHeight,
                Theme.layout.multiPortWidth,
                Theme.layout.multiPortHeight,
                2
            );
            ctx.fill();
            ctx.stroke();
        } else {
            // Draw circular single port
            ctx.beginPath();
            ctx.arc(portPos.x, portPos.y, NodeRenderer.PORT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
    }

    /**
     * Draws output ports (bottom of node)
     * For multi-ports: draws one wide port that accepts unlimited connections
     * For single ports: draws individual circular ports (one per potential connection)
     */
    private drawOutputPorts(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2, count: number, _showAddPort: boolean): void {
        const isMultiPort = node.outputPortType === 'multi';

        ctx.fillStyle = Theme.ui.connection;
        ctx.strokeStyle = Theme.grid;
        ctx.lineWidth = StrokeConstants.PORT_BORDER;

        if (isMultiPort) {
            // Draw single wide multi-port (centered at bottom of node)
            const portPos = new Vector2(pos.x, pos.y + NodeRenderer.NODE_HEIGHT / 2);
            const halfWidth = Theme.layout.multiPortWidth / 2;
            const halfHeight = Theme.layout.multiPortHeight / 2;

            ctx.beginPath();
            ctx.roundRect(
                portPos.x - halfWidth,
                portPos.y - halfHeight,
                Theme.layout.multiPortWidth,
                Theme.layout.multiPortHeight,
                2
            );
            ctx.fill();
            ctx.stroke();
        } else {
            // Draw individual circular ports for each child (single port mode)
            const positions = this.getOutputPortPositions(node, pos, count, false);
            for (let i = 0; i < count; i++) {
                const portPos = positions[i];
                ctx.beginPath();
                ctx.arc(portPos.x, portPos.y, NodeRenderer.PORT_RADIUS, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }
        }
    }

    /**
     * Gets the input port position in world space
     */
    public getInputPortPosition(_node: TreeNode, nodePos: Vector2): Vector2 {
        return new Vector2(
            nodePos.x,
            nodePos.y - NodeRenderer.NODE_HEIGHT / 2
        );
    }

    /**
     * Gets output port positions in world space
     * @param node The tree node
     * @param nodePos Node position
     * @param count Number of child ports
     * @param _includeAddPort Deprecated (no longer used)
     */
    public getOutputPortPositions(node: TreeNode, nodePos: Vector2, count: number, _includeAddPort: boolean = false): Vector2[] {
        const positions: Vector2[] = [];
        const y = nodePos.y + NodeRenderer.NODE_HEIGHT / 2;

        // For multi-ports, all connections originate from the same center position
        if (node.outputPortType === 'multi') {
            const centerPos = new Vector2(nodePos.x, y);
            // Return the same position for all children
            for (let i = 0; i < count; i++) {
                positions.push(centerPos);
            }
            return positions;
        }

        // For single ports, each child gets its own position
        const spacing = NodeRenderer.OUTPUT_PORT_SPACING;
        if (count === 0) return positions;

        const totalWidth = (count - 1) * spacing;
        const startX = nodePos.x - totalWidth / 2;

        for (let i = 0; i < count; i++) {
            positions.push(new Vector2(
                startX + i * spacing,
                y
            ));
        }

        return positions;
    }

    /**
     * Checks if a point is inside a node
     */
    public isPointInNode(point: Vector2, node: TreeNode, nodePos: Vector2): boolean {
        const halfWidth = NodeRenderer.getNodeWidth(node) / 2;
        const halfHeight = NodeRenderer.NODE_HEIGHT / 2;

        return (
            point.x >= nodePos.x - halfWidth &&
            point.x <= nodePos.x + halfWidth &&
            point.y >= nodePos.y - halfHeight &&
            point.y <= nodePos.y + halfHeight
        );
    }

    /**
     * Finds which port (if any) is at a given point
     */
    public getPortAtPoint(node: TreeNode, point: Vector2): { type: 'input' | 'output'; index: number; isMultiPort?: boolean } | null {
        // Check input port (only if node has input ports)
        if (node.numInputs > 0) {
            const inputPos = this.getInputPortPosition(node, node.position);
            const isMultiPort = node.inputPortType === 'multi';

            // Multi-ports use rectangular hit testing
            if (isMultiPort) {
                const halfWidth = Theme.layout.multiPortWidth / 2;
                const halfHeight = Theme.layout.multiPortHeight / 2;
                const clickPadding = 5; // Extra padding for easier clicking

                if (point.x >= inputPos.x - halfWidth - clickPadding &&
                    point.x <= inputPos.x + halfWidth + clickPadding &&
                    point.y >= inputPos.y - halfHeight - clickPadding &&
                    point.y <= inputPos.y + halfHeight + clickPadding) {
                    return { type: 'input', index: 0, isMultiPort: true };
                }
            } else {
                // Single ports use circular hit testing
                if (inputPos.distanceTo(point) <= NodeRenderer.PORT_CLICK_RADIUS) {
                    return { type: 'input', index: 0, isMultiPort: false };
                }
            }
        }

        // Check output ports
        if (node.category === 'composite' || node.category === 'decorator') {
            const isMultiPort = node.outputPortType === 'multi';

            if (isMultiPort) {
                // Single wide multi-port at bottom center
                const portPos = new Vector2(node.position.x, node.position.y + NodeRenderer.NODE_HEIGHT / 2);
                const halfWidth = Theme.layout.multiPortWidth / 2;
                const halfHeight = Theme.layout.multiPortHeight / 2;
                const clickPadding = 5;

                if (point.x >= portPos.x - halfWidth - clickPadding &&
                    point.x <= portPos.x + halfWidth + clickPadding &&
                    point.y >= portPos.y - halfHeight - clickPadding &&
                    point.y <= portPos.y + halfHeight + clickPadding) {
                    return { type: 'output', index: 0, isMultiPort: true };
                }
            } else {
                // Individual ports for each child (single port mode)
                const outputPositions = this.getOutputPortPositions(node, node.position, node.children.length, false);
                for (let i = 0; i < node.children.length; i++) {
                    if (outputPositions[i].distanceTo(point) <= NodeRenderer.PORT_CLICK_RADIUS) {
                        return { type: 'output', index: i, isMultiPort: false };
                    }
                }
            }
        }

        return null;
    }

    /**
     * Helper to draw rounded rectangles
     */
    private roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }
}
