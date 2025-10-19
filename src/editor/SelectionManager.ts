import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { SelectionConstants } from '../utils/RendererConstants.js';

/**
 * SelectionManager: Handles node selection (single, multi, box select)
 */
export class SelectionManager {
    private selectedNodes: Set<TreeNode> = new Set();
    private hoveredNode: TreeNode | null = null;

    // Box selection
    private isBoxSelecting: boolean = false;
    private boxSelectStart: Vector2 | null = null;
    private boxSelectEnd: Vector2 | null = null;

    // Selection change callback
    public onSelectionChange?: (selectedNodes: TreeNode[]) => void;

    /**
     * Selects a single node (clears previous selection unless ctrl is held)
     */
    public selectNode(node: TreeNode, addToSelection: boolean = false): void {
        if (!addToSelection) {
            this.selectedNodes.clear();
        }
        this.selectedNodes.add(node);
        this.notifySelectionChange();
    }

    /**
     * Deselects a node
     */
    public deselectNode(node: TreeNode): void {
        this.selectedNodes.delete(node);
        this.notifySelectionChange();
    }

    /**
     * Toggles selection of a node
     */
    public toggleNode(node: TreeNode): void {
        if (this.selectedNodes.has(node)) {
            this.selectedNodes.delete(node);
        } else {
            this.selectedNodes.add(node);
        }
        this.notifySelectionChange();
    }

    /**
     * Clears all selections
     */
    public clearSelection(): void {
        this.selectedNodes.clear();
        this.notifySelectionChange();
    }

    /**
     * Notifies listeners that selection has changed
     */
    private notifySelectionChange(): void {
        if (this.onSelectionChange) {
            this.onSelectionChange(this.getSelectedNodes());
        }
    }

    /**
     * Gets all selected nodes
     */
    public getSelectedNodes(): TreeNode[] {
        return Array.from(this.selectedNodes);
    }

    /**
     * Checks if a node is selected
     */
    public isSelected(node: TreeNode): boolean {
        return this.selectedNodes.has(node);
    }

    /**
     * Gets the count of selected nodes
     */
    public getSelectionCount(): number {
        return this.selectedNodes.size;
    }

    /**
     * Sets the hovered node
     */
    public setHoveredNode(node: TreeNode | null): void {
        this.hoveredNode = node;
    }

    /**
     * Gets the currently hovered node
     */
    public getHoveredNode(): TreeNode | null {
        return this.hoveredNode;
    }

    /**
     * Checks if a node is hovered
     */
    public isHovered(node: TreeNode): boolean {
        return this.hoveredNode === node;
    }

    /**
     * Starts box selection
     */
    public startBoxSelect(worldPos: Vector2): void {
        this.isBoxSelecting = true;
        this.boxSelectStart = worldPos;
        this.boxSelectEnd = worldPos;
    }

    /**
     * Updates box selection
     */
    public updateBoxSelect(worldPos: Vector2): void {
        if (this.isBoxSelecting) {
            this.boxSelectEnd = worldPos;
        }
    }

    /**
     * Ends box selection and selects nodes within the box
     */
    public endBoxSelect(nodes: TreeNode[], addToSelection: boolean = false): void {
        if (!this.isBoxSelecting || !this.boxSelectStart || !this.boxSelectEnd) {
            this.isBoxSelecting = false;
            return;
        }

        const box = this.getBoxSelectBounds();
        if (!box) {
            this.isBoxSelecting = false;
            return;
        }

        if (!addToSelection) {
            this.selectedNodes.clear();
        }

        // Select all nodes within the box
        nodes.forEach(node => {
            if (this.isNodeInBox(node, box)) {
                this.selectedNodes.add(node);
            }
        });

        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectEnd = null;

        // Notify once after all selections are made
        this.notifySelectionChange();
    }

    /**
     * Cancels box selection
     */
    public cancelBoxSelect(): void {
        this.isBoxSelecting = false;
        this.boxSelectStart = null;
        this.boxSelectEnd = null;
    }

    /**
     * Gets the box selection bounds
     */
    public getBoxSelectBounds(): { min: Vector2; max: Vector2 } | null {
        if (!this.boxSelectStart || !this.boxSelectEnd) {
            return null;
        }

        return {
            min: new Vector2(
                Math.min(this.boxSelectStart.x, this.boxSelectEnd.x),
                Math.min(this.boxSelectStart.y, this.boxSelectEnd.y)
            ),
            max: new Vector2(
                Math.max(this.boxSelectStart.x, this.boxSelectEnd.x),
                Math.max(this.boxSelectStart.y, this.boxSelectEnd.y)
            )
        };
    }

    /**
     * Checks if currently doing box selection
     */
    public isBoxSelectActive(): boolean {
        return this.isBoxSelecting;
    }

    /**
     * Checks if a node is within a box
     */
    private isNodeInBox(node: TreeNode, box: { min: Vector2; max: Vector2 }): boolean {
        const nodeX = node.position.x;
        const nodeY = node.position.y;

        return (
            nodeX >= box.min.x &&
            nodeX <= box.max.x &&
            nodeY >= box.min.y &&
            nodeY <= box.max.y
        );
    }

    /**
     * Renders the box selection rectangle
     */
    public renderBoxSelect(ctx: CanvasRenderingContext2D): void {
        const box = this.getBoxSelectBounds();
        if (!box) return;

        const width = box.max.x - box.min.x;
        const height = box.max.y - box.min.y;

        ctx.strokeStyle = '#F39C12';
        ctx.fillStyle = `rgba(243, 156, 18, ${SelectionConstants.BOX_FILL_OPACITY})`;
        ctx.lineWidth = SelectionConstants.BOX_STROKE_WIDTH;
        ctx.setLineDash([SelectionConstants.BOX_DASH_LONG, SelectionConstants.BOX_DASH_SHORT]);

        ctx.fillRect(box.min.x, box.min.y, width, height);
        ctx.strokeRect(box.min.x, box.min.y, width, height);

        ctx.setLineDash([]);
    }
}
