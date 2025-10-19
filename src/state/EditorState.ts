import { BehaviorTree } from '../core/BehaviorTree.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { CommandHistory } from '../core/Command.js';
import { NodeRegistry } from '../core/NodeRegistry.js';

/**
 * EditorState: Central state management for the editor
 */
export class EditorState {
    // Behavior tree
    public behaviorTree: BehaviorTree;

    // All nodes in the editor (not just in the tree)
    public nodes: TreeNode[] = [];

    // Temporary connection being dragged
    public tempConnection: {
        from: TreeNode;
        fromPort: number;
        toPos: Vector2;
    } | null = null;

    // Settings
    public showGrid: boolean = true;
    public snapToGrid: boolean = false;

    // UI state
    public isPanelOpen: 'settings' | 'code' | null = null;
    public editingNode: TreeNode | null = null;

    // Command history for undo/redo
    public commandHistory: CommandHistory = new CommandHistory();

    constructor() {
        this.behaviorTree = new BehaviorTree();
    }

    /**
     * Adds a node to the editor
     */
    public addNode(node: TreeNode): void {
        this.nodes.push(node);
        // Sync with BehaviorTree so it can find Start nodes
        this.behaviorTree.setAllNodes(this.nodes);
    }

    /**
     * Removes a node from the editor
     */
    public removeNode(node: TreeNode): void {
        const index = this.nodes.indexOf(node);
        if (index !== -1) {
            this.nodes.splice(index, 1);
        }

        // Also remove from tree if it's in there
        if (this.behaviorTree.root === node) {
            this.behaviorTree.setRoot(null);
        }

        // Remove from parent if it has one
        if (node.parent) {
            node.parent.removeChild(node);
        }

        // Sync with BehaviorTree
        this.behaviorTree.setAllNodes(this.nodes);
    }

    /**
     * Removes multiple nodes
     */
    public removeNodes(nodes: TreeNode[]): void {
        nodes.forEach(node => this.removeNode(node));
        // Note: removeNode already calls setAllNodes, but let's ensure it's synced
        this.behaviorTree.setAllNodes(this.nodes);
    }

    /**
     * Finds a node by ID
     */
    public findNodeById(id: string): TreeNode | null {
        return this.nodes.find(n => n.id === id) || null;
    }

    /**
     * Finds a node at a world position
     */
    public findNodeAtPosition(worldPos: Vector2, nodeRenderer: any): TreeNode | null {
        // Iterate in reverse order (top to bottom) for correct z-order
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (nodeRenderer.isPointInNode(worldPos, node, node.position)) {
                return node;
            }
        }
        return null;
    }

    /**
     * Creates a connection between two nodes
     * @returns Object with success status and whether children were reordered
     */
    public connectNodes(parent: TreeNode, child: TreeNode, childIndex?: number): { success: boolean; reordered: boolean } {
        // Prevent self-connection
        if (parent === child) {
            throw new Error('Node cannot be its own child');
        }

        // Prevent cycles
        if (child.isAncestorOf(parent)) {
            console.warn('Cannot create connection: would create a cycle');
            return { success: false, reordered: false };
        }

        // Check max children limit BEFORE removing from current parent
        if (!parent.canAddMoreChildren()) {
            const maxStr = parent.maxChildren === -1 ? 'unlimited' : parent.maxChildren.toString();
            console.warn(`Cannot create connection: Node "${parent.label}" has reached its maximum child limit (${maxStr})`);
            return { success: false, reordered: false };
        }

        // Remove child from its current parent
        if (child.parent) {
            child.parent.removeChild(child);
        }

        try {
            // Add child to parent
            if (childIndex !== undefined && childIndex < parent.children.length) {
                parent.children.splice(childIndex, 0, child);
                child.parent = parent;
            } else {
                parent.addChild(child);
            }
        } catch (error) {
            // Handle errors (e.g., decorator child limit, cycles, etc.)
            console.error('Failed to connect nodes:', error);
            return { success: false, reordered: false };
        }

        // Auto-sort children by X position (left to right) to prevent connection overlaps
        const reordered = this.sortChildren(parent);

        return { success: true, reordered };
    }

    /**
     * Sorts a node's children by their X position (left to right)
     * @returns true if the order changed, false otherwise
     */
    private sortChildren(node: TreeNode): boolean {
        // Capture original order
        const originalOrder = node.children.map(child => child.id);

        // Sort by X position
        node.children.sort((a, b) => a.position.x - b.position.x);

        // Check if order changed
        const newOrder = node.children.map(child => child.id);
        const orderChanged = !originalOrder.every((id, index) => id === newOrder[index]);

        return orderChanged;
    }

    /**
     * Disconnects a child from its parent
     */
    public disconnectNode(node: TreeNode): void {
        if (node.parent) {
            node.parent.removeChild(node);
        }
    }

    /**
     * Clears all nodes
     */
    public clearAll(): void {
        this.nodes = [];
        this.behaviorTree.setRoot(null);
        this.behaviorTree.setAllNodes(this.nodes); // Sync with BehaviorTree
        this.tempConnection = null;
        this.editingNode = null;
    }

    /**
     * Gets all root nodes (nodes without parents)
     */
    public getRootNodes(): TreeNode[] {
        return this.nodes.filter(node => !node.parent);
    }

    /**
     * Imports a tree including all disconnected nodes
     */
    public importTree(data: any): void {
        // Import the tree (this deserializes ALL nodes from JSON, including disconnected ones)
        this.behaviorTree.fromJSON(data, (type: string) => {
            const registration = NodeRegistry.get(type);
            return registration ? registration.factory() : NodeRegistry.create('action')!;
        });

        // Get ALL deserialized nodes (includes both connected and disconnected nodes)
        const allDeserializedNodes = this.behaviorTree.getAllDeserializedNodes();

        // Update editor state with all nodes
        this.nodes = allDeserializedNodes;

        // Sync with BehaviorTree
        this.behaviorTree.setAllNodes(this.nodes);

        const connectedCount = this.behaviorTree.getAllNodes().length;
        const disconnectedCount = this.nodes.length - connectedCount;
        console.log(`Imported ${this.nodes.length} total nodes (${connectedCount} connected, ${disconnectedCount} disconnected)`);
    }
}
