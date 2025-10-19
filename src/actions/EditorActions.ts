import { Operation } from '../core/Operation.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { NodeRegistry } from '../core/NodeRegistry.js';

/**
 * EditorActions: Comprehensive set of all operations that can mutate editor state
 *
 * This file centralizes all mutations to make state management predictable and
 * enable full undo/redo support. Each operation implements the Operation interface.
 *
 * IMPORTANT: All mutations to editor state should go through these operations.
 * Direct mutations should be avoided to maintain undo/redo consistency.
 */

// ============================================================================
// NODE OPERATIONS
// ============================================================================

/**
 * AddNodeOperation: Adds a single node to the editor
 */
export class AddNodeOperation implements Operation {
    public description: string;

    constructor(
        private editorState: EditorState,
        private node: TreeNode
    ) {
        this.description = `Add ${node.type} node "${node.label}"`;
    }

    public execute(): void {
        this.editorState.addNode(this.node);
    }

    public undo(): void {
        this.editorState.removeNode(this.node);
    }
}

/**
 * RemoveNodeOperation: Removes a single node from the editor
 *
 * Captures parent connection info for proper undo
 */
export class RemoveNodeOperation implements Operation {
    public description: string;
    private parentConnection: { parent: TreeNode; index: number } | null = null;

    constructor(
        private editorState: EditorState,
        private node: TreeNode
    ) {
        this.description = `Remove ${node.type} node "${node.label}"`;

        // Store parent connection info for undo
        if (node.parent) {
            this.parentConnection = {
                parent: node.parent,
                index: node.parent.children.indexOf(node)
            };
        }
    }

    public execute(): void {
        this.editorState.removeNode(this.node);
    }

    public undo(): void {
        this.editorState.addNode(this.node);

        // Restore parent connection if it existed
        if (this.parentConnection) {
            this.editorState.connectNodes(
                this.parentConnection.parent,
                this.node,
                this.parentConnection.index
            );
        }
    }
}

/**
 * RemoveNodesOperation: Removes multiple nodes from the editor
 *
 * Captures all parent connections for proper undo
 */
export class RemoveNodesOperation implements Operation {
    public description: string;
    private nodeData: Array<{
        node: TreeNode;
        parentConnection: { parent: TreeNode; index: number } | null;
    }> = [];

    constructor(
        private editorState: EditorState,
        nodes: TreeNode[]
    ) {
        this.description = `Remove ${nodes.length} node(s)`;

        // Store connection info for each node
        nodes.forEach(node => {
            let parentConnection: { parent: TreeNode; index: number } | null = null;
            if (node.parent) {
                parentConnection = {
                    parent: node.parent,
                    index: node.parent.children.indexOf(node)
                };
            }

            this.nodeData.push({ node, parentConnection });
        });
    }

    public execute(): void {
        this.nodeData.forEach(({ node }) => {
            this.editorState.removeNode(node);
        });
    }

    public undo(): void {
        // Restore in reverse order to maintain proper indices
        for (let i = this.nodeData.length - 1; i >= 0; i--) {
            const { node, parentConnection } = this.nodeData[i];
            this.editorState.addNode(node);

            if (parentConnection) {
                this.editorState.connectNodes(
                    parentConnection.parent,
                    node,
                    parentConnection.index
                );
            }
        }
    }
}

/**
 * MoveNodeOperation: Moves a single node to a new position
 */
export class MoveNodeOperation implements Operation {
    public description: string;
    private oldPosition: Vector2;

    constructor(
        private node: TreeNode,
        private newPosition: Vector2
    ) {
        this.description = `Move ${node.type} node "${node.label}"`;
        this.oldPosition = node.position.clone();
    }

    public execute(): void {
        this.node.position = this.newPosition.clone();
    }

    public undo(): void {
        this.node.position = this.oldPosition.clone();
    }
}

/**
 * MoveNodesOperation: Moves multiple nodes by a delta offset
 */
export class MoveNodesOperation implements Operation {
    public description: string;
    private nodePositions: Map<TreeNode, { old: Vector2; new: Vector2 }> = new Map();

    /**
     * Constructor for recording a move that hasn't happened yet
     * (calculates new positions from current position + delta)
     */
    constructor(nodes: TreeNode[], delta: Vector2);

    /**
     * Constructor for recording a move that already happened
     * (uses explicit old/new positions from a map)
     */
    constructor(nodes: TreeNode[], deltaOrOldPositions: Vector2 | Map<TreeNode, Vector2>);

    constructor(
        nodes: TreeNode[],
        deltaOrOldPositions: Vector2 | Map<TreeNode, Vector2>
    ) {
        this.description = `Move ${nodes.length} node(s)`;

        if (deltaOrOldPositions instanceof Vector2) {
            // Delta-based constructor (for future moves)
            const delta = deltaOrOldPositions;
            nodes.forEach(node => {
                this.nodePositions.set(node, {
                    old: node.position.clone(),
                    new: node.position.clone().add(delta)
                });
            });
        } else {
            // Map-based constructor (for recording completed moves)
            const oldPositions = deltaOrOldPositions;
            nodes.forEach(node => {
                const oldPos = oldPositions.get(node);
                if (oldPos) {
                    this.nodePositions.set(node, {
                        old: oldPos.clone(),
                        new: node.position.clone()
                    });
                }
            });
        }
    }

    public execute(): void {
        this.nodePositions.forEach((positions, node) => {
            node.position = positions.new.clone();
        });
    }

    public undo(): void {
        this.nodePositions.forEach((positions, node) => {
            node.position = positions.old.clone();
        });
    }
}

/**
 * DuplicateNodesOperation: Duplicates nodes with their internal connections
 *
 * Creates copies of nodes while preserving connections between duplicated nodes.
 * This is a complex operation that combines node creation and connection restoration.
 */
export class DuplicateNodesOperation implements Operation {
    public description: string;
    private duplicatedNodes: TreeNode[] = [];
    private connections: Array<{ parent: TreeNode; child: TreeNode; index: number }> = [];

    constructor(
        private editorState: EditorState,
        private sourceNodes: TreeNode[],
        private offset: Vector2 = new Vector2(50, 50)
    ) {
        this.description = `Duplicate ${sourceNodes.length} node(s)`;
    }

    public execute(): void {
        const nodeIds = new Set(this.sourceNodes.map(n => n.id));
        const idMap = new Map<string, string>(); // Old ID -> New ID
        this.duplicatedNodes = [];
        this.connections = [];

        // Capture connections between source nodes
        const sourceConnections: Array<{ parentId: string; childId: string; index: number }> = [];
        this.sourceNodes.forEach(node => {
            node.children.forEach((child, index) => {
                // Only capture connections where both parent and child are in the duplicated set
                if (nodeIds.has(child.id)) {
                    sourceConnections.push({
                        parentId: node.id,
                        childId: child.id,
                        index: index
                    });
                }
            });
        });

        // Create new nodes
        this.sourceNodes.forEach(sourceNode => {
            const nodeType = sourceNode.type;
            const registration = NodeRegistry.get(nodeType);
            if (!registration) {
                console.warn(`Cannot duplicate node of unknown type: ${nodeType}`);
                return;
            }

            const newNode = registration.factory();
            const newId = newNode.id; // Save the fresh, unique ID
            const oldId = sourceNode.id;

            newNode.fromJSON(sourceNode.toJSON());
            newNode.id = newId; // Restore the fresh ID to ensure uniqueness
            newNode.position = newNode.position.add(this.offset);

            // Store ID mapping for connection restoration
            idMap.set(oldId, newId);

            this.editorState.addNode(newNode);
            this.duplicatedNodes.push(newNode);
        });

        // Restore connections between duplicated nodes
        sourceConnections.forEach(conn => {
            const newParentId = idMap.get(conn.parentId);
            const newChildId = idMap.get(conn.childId);

            if (newParentId && newChildId) {
                const parent = this.editorState.findNodeById(newParentId);
                const child = this.editorState.findNodeById(newChildId);

                if (parent && child) {
                    this.editorState.connectNodes(parent, child, conn.index);
                    this.connections.push({ parent, child, index: conn.index });
                }
            }
        });
    }

    public undo(): void {
        // Disconnect all connections first
        this.connections.forEach(({ child }) => {
            this.editorState.disconnectNode(child);
        });

        // Remove all duplicated nodes
        this.duplicatedNodes.forEach(node => {
            this.editorState.removeNode(node);
        });

        // Clear cached data
        this.duplicatedNodes = [];
        this.connections = [];
    }

    /**
     * Gets the duplicated nodes (useful for selection after redo)
     */
    public getDuplicatedNodes(): TreeNode[] {
        return [...this.duplicatedNodes];
    }
}

/**
 * UpdateNodeLabelOperation: Updates a node's display label
 */
export class UpdateNodeLabelOperation implements Operation {
    public description: string;
    private oldLabel: string;

    constructor(
        private node: TreeNode,
        private newLabel: string
    ) {
        this.oldLabel = node.label;
        this.description = `Update node label from "${this.oldLabel}" to "${newLabel}"`;
    }

    public execute(): void {
        this.node.label = this.newLabel;
    }

    public undo(): void {
        this.node.label = this.oldLabel;
    }
}

/**
 * UpdateNodeCodeOperation: Updates a node's JavaScript code
 *
 * Primarily used for ActionNodes and ConditionNodes
 */
export class UpdateNodeCodeOperation implements Operation {
    public description: string;
    private oldCode: string | undefined;

    constructor(
        private node: TreeNode,
        private newCode: string
    ) {
        this.oldCode = node.code;
        this.description = `Update code for "${node.label}"`;
    }

    public execute(): void {
        this.node.code = this.newCode;
    }

    public undo(): void {
        this.node.code = this.oldCode;
    }
}

/**
 * UpdateNodeParameterOperation: Updates a single parameter value
 *
 * Used by the inspector panel when editing node parameters
 */
export class UpdateNodeParameterOperation implements Operation {
    public description: string;
    private oldValue: any;

    constructor(
        private node: TreeNode,
        private paramName: string,
        private newValue: any
    ) {
        this.oldValue = node.parameters.get(paramName);
        this.description = `Update parameter "${paramName}" for "${node.label}"`;
    }

    public execute(): void {
        this.node.parameters.set(this.paramName, this.newValue);
    }

    public undo(): void {
        this.node.parameters.set(this.paramName, this.oldValue);
    }
}

/**
 * UpdateNodeConfigOperation: Updates a node's configuration object
 *
 * Handles bulk config updates (e.g., when loading from JSON or applying presets)
 */
export class UpdateNodeConfigOperation implements Operation {
    public description: string;
    private oldConfig: Record<string, any>;

    constructor(
        private node: TreeNode,
        private newConfig: Record<string, any>
    ) {
        this.oldConfig = { ...node.config };
        this.description = `Update config for "${node.label}"`;
    }

    public execute(): void {
        this.node.config = { ...this.newConfig };
    }

    public undo(): void {
        this.node.config = { ...this.oldConfig };
    }
}

// ============================================================================
// CONNECTION OPERATIONS
// ============================================================================

/**
 * ConnectNodesOperation: Creates a parent-child relationship between two nodes
 *
 * Handles disconnection from previous parent and restores it on undo
 */
export class ConnectNodesOperation implements Operation {
    public description: string;
    private previousParent: TreeNode | null = null;
    private previousIndex: number = -1;

    constructor(
        private editorState: EditorState,
        private parent: TreeNode,
        private child: TreeNode,
        private childIndex?: number
    ) {
        this.description = `Connect "${child.label}" to "${parent.label}"`;

        // Store previous parent for undo
        if (child.parent) {
            this.previousParent = child.parent;
            this.previousIndex = child.parent.children.indexOf(child);
        }
    }

    public execute(): void {
        this.editorState.connectNodes(this.parent, this.child, this.childIndex);
    }

    public undo(): void {
        // Disconnect from current parent
        this.editorState.disconnectNode(this.child);

        // Restore previous parent connection if it existed
        if (this.previousParent) {
            this.editorState.connectNodes(this.previousParent, this.child, this.previousIndex);
        }
    }
}

/**
 * DisconnectNodeOperation: Removes a child from its parent
 *
 * Stores parent info for undo
 */
export class DisconnectNodeOperation implements Operation {
    public description: string;
    private previousParent: TreeNode;
    private previousIndex: number;

    constructor(
        private editorState: EditorState,
        private node: TreeNode
    ) {
        if (!node.parent) {
            throw new Error('Cannot disconnect a node that has no parent');
        }

        this.previousParent = node.parent;
        this.previousIndex = node.parent.children.indexOf(node);
        this.description = `Disconnect "${node.label}" from "${this.previousParent.label}"`;
    }

    public execute(): void {
        this.editorState.disconnectNode(this.node);
    }

    public undo(): void {
        this.editorState.connectNodes(this.previousParent, this.node, this.previousIndex);
    }
}

// ============================================================================
// TREE OPERATIONS
// ============================================================================

/**
 * SetRootOperation: Sets the behavior tree root node
 *
 * Note: In the current implementation, the root is auto-determined by Start nodes,
 * but this operation allows manual root setting for future flexibility
 */
export class SetRootOperation implements Operation {
    public description: string;
    private oldRoot: TreeNode | null;

    constructor(
        private editorState: EditorState,
        private newRoot: TreeNode | null
    ) {
        this.oldRoot = editorState.behaviorTree.root;
        this.description = newRoot
            ? `Set root to "${newRoot.label}"`
            : 'Clear root';
    }

    public execute(): void {
        this.editorState.behaviorTree.setRoot(this.newRoot);
    }

    public undo(): void {
        this.editorState.behaviorTree.setRoot(this.oldRoot);
    }
}

/**
 * ClearAllNodesOperation: Removes all nodes from the editor
 *
 * Captures complete tree state for undo
 */
export class ClearAllNodesOperation implements Operation {
    public description: string = 'Clear all nodes';
    private savedNodes: TreeNode[] = [];
    private savedRoot: TreeNode | null = null;
    private savedConnections: Array<{ parent: TreeNode; child: TreeNode; index: number }> = [];

    constructor(
        private editorState: EditorState
    ) {
        // Capture current state
        this.savedNodes = [...editorState.nodes];
        this.savedRoot = editorState.behaviorTree.root;

        // Capture all connections
        this.savedNodes.forEach(node => {
            node.children.forEach((child, index) => {
                this.savedConnections.push({ parent: node, child, index });
            });
        });
    }

    public execute(): void {
        this.editorState.clearAll();
    }

    public undo(): void {
        // Restore all nodes
        this.savedNodes.forEach(node => {
            this.editorState.addNode(node);
        });

        // Restore all connections
        this.savedConnections.forEach(({ parent, child, index }) => {
            this.editorState.connectNodes(parent, child, index);
        });

        // Restore root
        this.editorState.behaviorTree.setRoot(this.savedRoot);
    }
}

/**
 * ImportTreeOperation: Imports a behavior tree from JSON data
 *
 * Replaces the entire tree state. Captures previous state for undo.
 */
export class ImportTreeOperation implements Operation {
    public description: string = 'Import tree';
    private previousNodes: TreeNode[] = [];
    private previousRoot: TreeNode | null = null;
    private previousConnections: Array<{ parent: TreeNode; child: TreeNode; index: number }> = [];

    constructor(
        private editorState: EditorState,
        private jsonData: any
    ) {
        // Capture current state before import
        this.previousNodes = [...editorState.nodes];
        this.previousRoot = editorState.behaviorTree.root;

        // Capture all connections
        this.previousNodes.forEach(node => {
            node.children.forEach((child, index) => {
                this.previousConnections.push({ parent: node, child, index });
            });
        });
    }

    public execute(): void {
        this.editorState.importTree(this.jsonData);
    }

    public undo(): void {
        // Clear current state
        this.editorState.clearAll();

        // Restore previous nodes
        this.previousNodes.forEach(node => {
            this.editorState.addNode(node);
        });

        // Restore previous connections
        this.previousConnections.forEach(({ parent, child, index }) => {
            this.editorState.connectNodes(parent, child, index);
        });

        // Restore previous root
        this.editorState.behaviorTree.setRoot(this.previousRoot);
    }
}

// ============================================================================
// UI STATE OPERATIONS (Typically non-undoable, but tracked for completeness)
// ============================================================================

/**
 * SetSelectionOperation: Updates the current selection
 *
 * This is typically NOT added to the undo stack, but can be used
 * for selection tracking in complex multi-step operations
 */
export class SetSelectionOperation implements Operation {
    public description: string;
    private previousSelection: Set<TreeNode>;

    constructor(
        private selectionManager: any, // SelectionManager type
        private newSelection: Set<TreeNode>
    ) {
        this.description = `Select ${newSelection.size} node(s)`;
        this.previousSelection = new Set(this.selectionManager.getSelectedNodes());
    }

    public execute(): void {
        this.selectionManager.clearSelection();
        this.newSelection.forEach(node => {
            this.selectionManager.selectNode(node, true);
        });
    }

    public undo(): void {
        this.selectionManager.clearSelection();
        this.previousSelection.forEach(node => {
            this.selectionManager.selectNode(node, true);
        });
    }
}

/**
 * ToggleGridOperation: Toggles grid visibility
 *
 * Simple toggle operation for UI settings
 */
export class ToggleGridOperation implements Operation {
    public description: string = 'Toggle grid visibility';

    constructor(
        private editorState: EditorState
    ) {}

    public execute(): void {
        this.editorState.showGrid = !this.editorState.showGrid;
    }

    public undo(): void {
        this.editorState.showGrid = !this.editorState.showGrid;
    }
}

/**
 * ToggleSnapToGridOperation: Toggles snap-to-grid setting
 *
 * Simple toggle operation for UI settings
 */
export class ToggleSnapToGridOperation implements Operation {
    public description: string = 'Toggle snap to grid';

    constructor(
        private editorState: EditorState
    ) {}

    public execute(): void {
        this.editorState.snapToGrid = !this.editorState.snapToGrid;
    }

    public undo(): void {
        this.editorState.snapToGrid = !this.editorState.snapToGrid;
    }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * BatchOperation: Executes multiple operations as a single undoable unit
 *
 * Useful for complex operations that involve multiple steps
 */
export class BatchOperation implements Operation {
    public description: string;

    constructor(
        private operations: Operation[],
        description?: string
    ) {
        this.description = description || `Batch operation (${operations.length} operations)`;
    }

    public execute(): void {
        this.operations.forEach(operation => operation.execute());
    }

    public undo(): void {
        // Undo in reverse order
        for (let i = this.operations.length - 1; i >= 0; i--) {
            this.operations[i].undo();
        }
    }

    public redo(): void {
        this.execute();
    }
}

// ============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// ============================================================================

/**
 * Operation factory functions for easier usage
 *
 * These provide a cleaner API for creating operations without using 'new' everywhere
 */
export const EditorActions = {
    // Node operations
    addNode: (editorState: EditorState, node: TreeNode) =>
        new AddNodeOperation(editorState, node),

    removeNode: (editorState: EditorState, node: TreeNode) =>
        new RemoveNodeOperation(editorState, node),

    removeNodes: (editorState: EditorState, nodes: TreeNode[]) =>
        new RemoveNodesOperation(editorState, nodes),

    moveNode: (node: TreeNode, newPosition: Vector2) =>
        new MoveNodeOperation(node, newPosition),

    moveNodes: (nodes: TreeNode[], delta: Vector2) =>
        new MoveNodesOperation(nodes, delta),

    duplicateNodes: (editorState: EditorState, nodes: TreeNode[], offset?: Vector2) =>
        new DuplicateNodesOperation(editorState, nodes, offset),

    updateNodeLabel: (node: TreeNode, newLabel: string) =>
        new UpdateNodeLabelOperation(node, newLabel),

    updateNodeCode: (node: TreeNode, newCode: string) =>
        new UpdateNodeCodeOperation(node, newCode),

    updateNodeParameter: (node: TreeNode, paramName: string, newValue: any) =>
        new UpdateNodeParameterOperation(node, paramName, newValue),

    updateNodeConfig: (node: TreeNode, newConfig: Record<string, any>) =>
        new UpdateNodeConfigOperation(node, newConfig),

    // Connection operations
    connectNodes: (editorState: EditorState, parent: TreeNode, child: TreeNode, childIndex?: number) =>
        new ConnectNodesOperation(editorState, parent, child, childIndex),

    disconnectNode: (editorState: EditorState, node: TreeNode) =>
        new DisconnectNodeOperation(editorState, node),

    // Tree operations
    setRoot: (editorState: EditorState, root: TreeNode | null) =>
        new SetRootOperation(editorState, root),

    clearAllNodes: (editorState: EditorState) =>
        new ClearAllNodesOperation(editorState),

    importTree: (editorState: EditorState, jsonData: any) =>
        new ImportTreeOperation(editorState, jsonData),

    // UI state operations
    setSelection: (selectionManager: any, newSelection: Set<TreeNode>) =>
        new SetSelectionOperation(selectionManager, newSelection),

    toggleGrid: (editorState: EditorState) =>
        new ToggleGridOperation(editorState),

    toggleSnapToGrid: (editorState: EditorState) =>
        new ToggleSnapToGridOperation(editorState),

    // Batch operations
    batch: (operations: Operation[], description?: string) =>
        new BatchOperation(operations, description)
};
