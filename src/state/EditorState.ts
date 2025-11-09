import { BehaviorTree } from '../core/BehaviorTree.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { OperationHistory } from '../core/Operation.js';
import { NodeRegistry } from '../core/NodeRegistry.js';

/**
 * EditorState: Central state management for the behavior tree editor
 *
 * This class manages the state of the editor using an operation-based architecture.
 *
 * **Architecture:**
 * - Mutable state is stored in public properties
 * - State changes MUST go through Operation pattern for undo/redo
 * - Internal mutation methods are used by operations only
 *
 * **Usage Pattern:**
 * Good (use operations):
 * ```typescript
 * // UI code should dispatch operations
 * const operation = new AddNodeOperation(state, node);
 * state.operationHistory.execute(operation);
 * ```
 *
 * Bad (direct mutation):
 * ```typescript
 * // DON'T call internal methods from UI code
 * state.addNode(node); // ❌ Wrong - bypasses undo/redo
 * ```
 *
 * **Mutable State Properties:**
 * - `nodes`: All nodes in the editor (both connected and disconnected)
 * - `behaviorTree`: The behavior tree instance (contains root and execution state)
 * - `tempConnection`: Temporary connection being dragged (UI state)
 * - `showGrid`: Whether to display the grid
 * - `snapToGrid`: Whether to snap nodes to grid
 * - `isPanelOpen`: Which panel is currently open (if any)
 * - `editingNode`: The node currently being edited in Monaco
 *
 * **Immutable/Infrastructure:**
 * - `operationHistory`: Operation history for undo/redo operations
 *
 * **Method Categories:**
 * Methods are marked with JSDoc tags indicating their mutation behavior:
 * - `@internal` - Internal methods used by operations. Do not call from UI code.
 * - `@readonly` - Read-only queries that don't mutate state
 */
export class EditorState {
    // ===========================
    // MUTABLE STATE PROPERTIES
    // ===========================

    /**
     * The behavior tree instance containing the root node and execution logic
     * @mutation
     */
    public behaviorTree: BehaviorTree;

    /**
     * All nodes in the editor (both connected to tree and disconnected)
     * @mutation
     */
    public nodes: TreeNode[] = [];

    /**
     * Temporary connection being dragged (can be from output port to input, or input port to output)
     * @mutation
     */
    public tempConnection: {
        from: TreeNode;
        fromPort: number;
        toPos: Vector2;
        fromPortType?: 'input' | 'output';  // Which port type we started dragging from
    } | null = null;

    /**
     * Whether to display the background grid
     * @mutation
     */
    public showGrid: boolean = true;

    /**
     * Whether to snap node positions to grid
     * @mutation
     */
    public snapToGrid: boolean = false;

    /**
     * Which panel is currently open (settings, code editor, or none)
     * @mutation
     */
    public isPanelOpen: 'settings' | 'code' | null = null;

    /**
     * The node currently being edited in Monaco editor
     * @mutation
     */
    public editingNode: TreeNode | null = null;

    // ===========================
    // INFRASTRUCTURE
    // ===========================

    /**
     * Operation history for undo/redo functionality
     * This is the foundation for the operation-based architecture
     */
    public operationHistory: OperationHistory = new OperationHistory();

    constructor() {
        this.behaviorTree = new BehaviorTree();
    }

    // ===========================
    // NODE MANAGEMENT (INTERNAL - USED BY OPERATIONS)
    // ===========================

    /**
     * Adds a node to the editor
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * @mutation Adds node to nodes array and syncs with behavior tree
     * @param node - The node to add
     */
    public addNode(node: TreeNode): void {
        this.nodes.push(node);
        // Sync with BehaviorTree so it can find Start nodes
        this.behaviorTree.setAllNodes(this.nodes);
    }

    /**
     * Removes a node from the editor
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * This removes the node from:
     * - The nodes array
     * - The behavior tree (if it's the root)
     * - Its parent's children list
     *
     * @mutation Removes node from all internal structures
     * @param node - The node to remove
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
     * Removes multiple nodes from the editor
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * @mutation Removes all specified nodes and their connections
     * @param nodes - Array of nodes to remove
     */
    public removeNodes(nodes: TreeNode[]): void {
        nodes.forEach(node => this.removeNode(node));
        // Note: removeNode already calls setAllNodes, but let's ensure it's synced
        this.behaviorTree.setAllNodes(this.nodes);
    }

    // ===========================
    // NODE QUERIES (READ-ONLY)
    // ===========================

    /**
     * Finds a node by its unique ID
     *
     * @readonly Does not mutate state
     * @param id - The unique identifier of the node
     * @returns The node with the given ID, or null if not found
     */
    public findNodeById(id: string): TreeNode | null {
        return this.nodes.find(n => n.id === id) || null;
    }

    /**
     * Finds the topmost node at a given world position
     *
     * @readonly Does not mutate state
     * @param worldPos - The world position to check
     * @param nodeRenderer - The node renderer to use for hit testing
     * @returns The topmost node at the position, or null if none found
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
     * Gets all root nodes (nodes without parents)
     *
     * @readonly Does not mutate state
     * @returns Array of nodes that have no parent
     */
    public getRootNodes(): TreeNode[] {
        return this.nodes.filter(node => !node.parent);
    }

    // ===========================
    // CONNECTION MANAGEMENT (INTERNAL - USED BY OPERATIONS)
    // ===========================

    /**
     * Creates a connection between a parent and child node
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * This method:
     * - Validates the connection (no cycles, no self-connections)
     * - Checks parent's max children limit
     * - Removes child from previous parent if needed
     * - Adds child to new parent at the specified index (or at end)
     * - Auto-sorts children by X position to minimize visual crossing
     *
     * @mutation Modifies parent-child relationships
     * @param parent - The parent node
     * @param child - The child node to connect
     * @param childIndex - Optional index to insert child at
     * @returns Object with success status and whether children were reordered
     * @throws Error if attempting self-connection
     */
    public connectNodes(parent: TreeNode, child: TreeNode, childIndex?: number): { success: boolean; reordered: boolean } {
        // Prevent self-connection
        if (parent === child) {
            throw new Error('Node cannot be its own child');
        }

        // Prevent cycles
        if (child.isAncestorOf(parent)) {
            return { success: false, reordered: false };
        }

        // Check max children limit BEFORE removing from current parent
        if (!parent.canAddMoreChildren()) {
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
     *
     * @mutation Modifies the order of children in parent's children array
     * @param node - The parent node whose children should be sorted
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
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * @mutation Removes parent-child relationship
     * @param node - The child node to disconnect
     */
    public disconnectNode(node: TreeNode): void {
        if (node.parent) {
            node.parent.removeChild(node);
        }
    }

    // ===========================
    // STATE MANAGEMENT (INTERNAL - USED BY OPERATIONS)
    // ===========================

    /**
     * Clears all state including nodes, tree, and UI state
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * This resets:
     * - All nodes (array cleared)
     * - Behavior tree root (set to null)
     * - Temporary connection (cleared)
     * - Editing node reference (cleared)
     *
     * @mutation Clears all editor state
     */
    public clearAll(): void {
        this.nodes = [];
        this.behaviorTree.setRoot(null);
        this.behaviorTree.setAllNodes(this.nodes); // Sync with BehaviorTree
        this.tempConnection = null;
        this.editingNode = null;
    }

    // ===========================
    // SERIALIZATION (INTERNAL - USED BY OPERATIONS)
    // ===========================

    /**
     * Imports a tree from JSON data
     *
     * **@internal** Used by operations internally. Do not call directly from UI code.
     *
     * This method:
     * - Deserializes ALL nodes from JSON (both connected and disconnected)
     * - Rebuilds the behavior tree structure
     * - Updates editor state with all deserialized nodes
     * - Syncs behavior tree with all nodes
     *
     * @mutation Replaces all current nodes with imported nodes
     * @param data - The JSON data containing the tree structure
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
    }
}
