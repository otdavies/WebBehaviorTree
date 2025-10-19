import { TreeNode } from '../core/TreeNode.js';
import { NodeStatus } from '../core/NodeStatus.js';
import { Vector2 } from '../utils/Vector2.js';
import { Viewport } from './Viewport.js';
import { Theme } from '../utils/Theme.js';

/**
 * NodeRenderer: Renders individual nodes on the canvas.
 *
 * Draws nodes as styled rectangles with icons, labels, ports, and status indicators.
 */
export class NodeRenderer {
    // Node dimensions (use Theme constants)
    public static readonly NODE_MIN_WIDTH = Theme.layout.nodeMinWidth;
    public static readonly NODE_HEIGHT = Theme.layout.nodeHeight;
    public static readonly NODE_RADIUS = 8;
    public static readonly NODE_PADDING = 12;

    // Port dimensions (use Theme constants)
    public static readonly PORT_RADIUS = Theme.layout.portRadius;
    public static readonly PORT_CLICK_RADIUS = Theme.layout.portClickRadius;
    public static readonly OUTPUT_PORT_SPACING = Theme.layout.outputPortSpacing;
    public static readonly ADD_PORT_RADIUS = 6;

    /**
     * Calculates the width of a node based on its children count
     */
    public static getNodeWidth(node: TreeNode): number {
        const hasChildren = node.category === 'composite' || node.category === 'decorator';
        if (!hasChildren) {
            return this.NODE_MIN_WIDTH;
        }

        // Calculate width needed for output ports
        // Each child needs PORT_SPACING, plus room for the add port (if we can add more)
        const childCount = node.children.length;
        const canAddMore = node.canAddMoreChildren();
        const portsNeeded = canAddMore ? childCount + 1 : childCount; // +1 for add port if available
        const widthForPorts = portsNeeded * this.OUTPUT_PORT_SPACING + 40; // +40 for margins

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

        // Draw icon
        this.drawIcon(ctx, node, pos, node.icon, viewport);

        // Draw label
        this.drawLabel(ctx, node, pos, node.label, viewport);

        // Draw status indicator
        this.drawStatusIndicator(ctx, node, pos, node.status);

        // Draw ports
        this.drawInputPort(ctx, node, pos);

        if (node.category === 'composite' || node.category === 'decorator') {
            // Show existing child ports + an "add" port (only if we can add more children)
            const showAddPort = node.canAddMoreChildren();
            this.drawOutputPorts(ctx, node, pos, node.children.length, showAddPort);
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
            ctx.shadowBlur = 15;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        } else {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 4;
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
        ctx.lineWidth = isSelected ? 3 : 2;
        this.roundRect(ctx, x, y, nodeWidth, NodeRenderer.NODE_HEIGHT, NodeRenderer.NODE_RADIUS);
        ctx.stroke();

        // Draw hover highlight
        if (isHovered && !isSelected) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = 1;
            this.roundRect(ctx, x + 1, y + 1, nodeWidth - 2, NodeRenderer.NODE_HEIGHT - 2, NodeRenderer.NODE_RADIUS - 1);
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
            gradient.addColorStop(0, 'rgba(52, 152, 219, 0.3)'); // Blue with transparency
            gradient.addColorStop(1, 'rgba(52, 152, 219, 0.5)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, y, progressWidth, NodeRenderer.NODE_HEIGHT);

            ctx.restore();
        }
    }

    /**
     * Draws an icon (Font Awesome icon name)
     */
    private drawIcon(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2, icon: string, viewport: Viewport): void {
        const nodeWidth = NodeRenderer.getNodeWidth(node);
        const iconSize = 24 / viewport.zoom;
        const iconX = pos.x - nodeWidth / 2 + NodeRenderer.NODE_PADDING + iconSize / 2;
        const iconY = pos.y - iconSize / 2;

        ctx.fillStyle = '#E0E0E0';
        ctx.font = `900 ${iconSize}px "Font Awesome 6 Free"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Font Awesome uses unicode characters - we'll use simple shapes for now
        // In a real implementation, you'd use actual Font Awesome icons
        this.drawSimpleIcon(ctx, icon, iconX, iconY, iconSize);
    }

    /**
     * Draws simple icon shapes (placeholder for Font Awesome)
     */
    private drawSimpleIcon(ctx: CanvasRenderingContext2D, icon: string, x: number, y: number, size: number): void {
        ctx.strokeStyle = '#E0E0E0';
        ctx.fillStyle = '#E0E0E0';
        ctx.lineWidth = 2;

        // Map icon names to simple shapes
        switch (icon) {
            case 'fa-list': // Sequence
                for (let i = 0; i < 3; i++) {
                    ctx.fillRect(x - size / 3, y - size / 3 + i * size / 4, size / 2, 2);
                }
                break;
            case 'fa-random': // Selector
                ctx.beginPath();
                ctx.moveTo(x - size / 3, y);
                ctx.lineTo(x, y - size / 3);
                ctx.lineTo(x + size / 3, y);
                ctx.lineTo(x, y + size / 3);
                ctx.closePath();
                ctx.stroke();
                break;
            case 'fa-layer-group': // Parallel
                ctx.strokeRect(x - size / 3, y - size / 3, size / 2, size / 2);
                ctx.strokeRect(x - size / 4, y - size / 4, size / 2, size / 2);
                break;
            case 'fa-exchange-alt': // Inverter
                ctx.beginPath();
                ctx.arc(x, y, size / 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.fillRect(x - size / 4, y - 1, size / 2, 2);
                break;
            case 'fa-redo': // Repeater
                ctx.beginPath();
                ctx.arc(x, y, size / 3, Math.PI * 0.2, Math.PI * 1.8);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + size / 4, y - size / 4);
                ctx.lineTo(x + size / 3, y - size / 3);
                ctx.lineTo(x + size / 3, y - size / 6);
                ctx.fill();
                break;
            case 'fa-times-circle': // Until Fail
                ctx.beginPath();
                ctx.arc(x, y, size / 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - size / 5, y - size / 5);
                ctx.lineTo(x + size / 5, y + size / 5);
                ctx.moveTo(x + size / 5, y - size / 5);
                ctx.lineTo(x - size / 5, y + size / 5);
                ctx.stroke();
                break;
            case 'fa-check-circle': // Until Success
                ctx.beginPath();
                ctx.arc(x, y, size / 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x - size / 4, y);
                ctx.lineTo(x - size / 8, y + size / 4);
                ctx.lineTo(x + size / 3, y - size / 4);
                ctx.stroke();
                break;
            case 'fa-bolt': // Action
                ctx.beginPath();
                ctx.moveTo(x, y - size / 2);
                ctx.lineTo(x - size / 5, y);
                ctx.lineTo(x + size / 10, y);
                ctx.lineTo(x - size / 10, y + size / 2);
                ctx.lineTo(x + size / 5, y - size / 10);
                ctx.lineTo(x, y - size / 10);
                ctx.closePath();
                ctx.fill();
                break;
            default:
                // Default circle
                ctx.beginPath();
                ctx.arc(x, y, size / 3, 0, Math.PI * 2);
                ctx.fill();
        }
    }

    /**
     * Draws the node label
     */
    private drawLabel(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2, label: string, viewport: Viewport): void {
        const nodeWidth = NodeRenderer.getNodeWidth(node);
        const fontSize = 14 / viewport.zoom;
        const labelX = pos.x - nodeWidth / 2 + NodeRenderer.NODE_PADDING + 30;
        const labelY = pos.y;

        ctx.fillStyle = '#E0E0E0';
        ctx.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, labelX, labelY);
    }

    /**
     * Draws the status indicator (top-right corner)
     */
    private drawStatusIndicator(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2, status: NodeStatus): void {
        if (status === NodeStatus.IDLE) return; // Don't draw anything for idle

        const nodeWidth = NodeRenderer.getNodeWidth(node);
        const x = pos.x + nodeWidth / 2 - 12;
        const y = pos.y - NodeRenderer.NODE_HEIGHT / 2 + 12;
        const radius = 8;

        const color = NodeRenderer.STATUS_COLORS[status];

        // Add glow effect for active statuses
        if (status === NodeStatus.RUNNING) {
            // Pulsing glow for running
            const pulseRadius = radius + Math.sin(Date.now() / 200) * 2 + 3;
            ctx.shadowColor = color;
            ctx.shadowBlur = 15;
            ctx.fillStyle = color;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            ctx.shadowBlur = 0;
        } else if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
            // Glow for completed statuses
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
        }

        // Draw main status indicator
        ctx.fillStyle = color;
        ctx.strokeStyle = '#1E1E1E';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Reset shadow
        ctx.shadowBlur = 0;
    }

    /**
     * Draws the input port (top center)
     */
    private drawInputPort(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2): void {
        const portPos = this.getInputPortPosition(node, pos);

        // Draw click area outline for debugging
        ctx.strokeStyle = 'rgba(52, 152, 219, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(portPos.x, portPos.y, NodeRenderer.PORT_CLICK_RADIUS, 0, Math.PI * 2);
        ctx.stroke();

        // Draw actual port
        ctx.fillStyle = Theme.ui.connection;
        ctx.strokeStyle = Theme.grid;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(portPos.x, portPos.y, NodeRenderer.PORT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Draws output ports (bottom of node)
     */
    private drawOutputPorts(ctx: CanvasRenderingContext2D, node: TreeNode, pos: Vector2, count: number, showAddPort: boolean): void {
        const positions = this.getOutputPortPositions(node, pos, count, showAddPort);

        // Draw regular ports
        for (let i = 0; i < count; i++) {
            const portPos = positions[i];
            ctx.fillStyle = Theme.ui.connection;
            ctx.strokeStyle = Theme.grid;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.arc(portPos.x, portPos.y, NodeRenderer.PORT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Draw add port (+) if enabled
        if (showAddPort) {
            const addPortPos = positions[count];

            // Draw circle with dashed border
            ctx.fillStyle = 'rgba(127, 140, 141, 0.3)';
            ctx.strokeStyle = Theme.ui.hover;
            ctx.lineWidth = 2;
            ctx.setLineDash([3, 3]);

            ctx.beginPath();
            ctx.arc(addPortPos.x, addPortPos.y, NodeRenderer.ADD_PORT_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.setLineDash([]);

            // Draw + symbol
            ctx.strokeStyle = Theme.ui.hover;
            ctx.lineWidth = 2;
            const plusSize = 3;

            ctx.beginPath();
            ctx.moveTo(addPortPos.x - plusSize, addPortPos.y);
            ctx.lineTo(addPortPos.x + plusSize, addPortPos.y);
            ctx.moveTo(addPortPos.x, addPortPos.y - plusSize);
            ctx.lineTo(addPortPos.x, addPortPos.y + plusSize);
            ctx.stroke();
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
     * @param _node The tree node (reserved for future use)
     * @param nodePos Node position
     * @param count Number of child ports
     * @param includeAddPort Whether to include the add (+) port position
     */
    public getOutputPortPositions(_node: TreeNode, nodePos: Vector2, count: number, includeAddPort: boolean = false): Vector2[] {
        const positions: Vector2[] = [];
        const spacing = NodeRenderer.OUTPUT_PORT_SPACING;

        // Calculate total ports (children + add port if enabled)
        const totalPorts = includeAddPort ? count + 1 : count;

        // If no ports at all, return empty
        if (totalPorts === 0) return positions;

        const totalWidth = (totalPorts - 1) * spacing;
        const startX = nodePos.x - totalWidth / 2;
        const y = nodePos.y + NodeRenderer.NODE_HEIGHT / 2;

        for (let i = 0; i < totalPorts; i++) {
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
    public getPortAtPoint(node: TreeNode, point: Vector2): { type: 'input' | 'output'; index: number; isAddPort?: boolean } | null {
        // Check input port
        const inputPos = this.getInputPortPosition(node, node.position);
        if (inputPos.distanceTo(point) <= NodeRenderer.PORT_CLICK_RADIUS) {
            return { type: 'input', index: 0 };
        }

        // Check output ports
        if (node.category === 'composite' || node.category === 'decorator') {
            const hasAddPort = node.canAddMoreChildren();
            const outputPositions = this.getOutputPortPositions(node, node.position, node.children.length, hasAddPort);

            // Check existing child ports
            for (let i = 0; i < node.children.length; i++) {
                if (outputPositions[i].distanceTo(point) <= NodeRenderer.PORT_CLICK_RADIUS) {
                    return { type: 'output', index: i };
                }
            }

            // Check add port (only if we can add more children)
            if (hasAddPort && outputPositions.length > node.children.length) {
                const addPortPos = outputPositions[node.children.length];
                if (addPortPos.distanceTo(point) <= NodeRenderer.PORT_CLICK_RADIUS) {
                    return { type: 'output', index: node.children.length, isAddPort: true };
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
