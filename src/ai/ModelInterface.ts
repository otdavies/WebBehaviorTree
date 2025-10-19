import { EditorState } from '../state/EditorState.js';
import { Viewport } from '../editor/Viewport.js';
import { SelectionManager } from '../editor/SelectionManager.js';
import { OperationHistory } from '../core/Operation.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import { NodeRegistry } from '../core/NodeRegistry.js';
import { AddNodeOperation, RemoveNodeOperation, MoveNodeOperation } from '../actions/NodeOperations.js';
import { ConnectNodesOperation, DisconnectNodeOperation } from '../actions/ConnectionOperations.js';
import { UpdateNodeCodeOperation } from '../actions/EditorActions.js';

/**
 * ModelInterface: Programmatic API for AI to manipulate the behavior tree
 *
 * This class provides a high-level, operation-based API that allows AI models
 * to perform all user operations programmatically. All operations go through
 * the Operation pattern for proper undo/redo support.
 *
 * Usage:
 * ```typescript
 * const modelInterface = new ModelInterface(editorState, viewport, selectionManager, operationHistory);
 *
 * // Create a node
 * const result = modelInterface.createNode('sequence', { x: 100, y: 200 });
 * if (result.success) {
 *   console.log('Created node:', result.nodeId);
 * }
 * ```
 */

/**
 * Result of an operation
 */
export interface OperationResult {
    /** Whether the operation succeeded */
    success: boolean;

    /** Error message if operation failed */
    error?: string;

    /** Additional data returned by the operation */
    data?: any;
}

/**
 * Result of node creation
 */
export interface NodeCreationResult extends OperationResult {
    /** ID of the created node */
    nodeId?: string;

    /** Reference to the created node */
    node?: TreeNode;
}

/**
 * Result of connection operation
 */
export interface ConnectionResult extends OperationResult {
    /** Whether children were reordered */
    reordered?: boolean;
}

/**
 * Position specification
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * ModelInterface class
 */
export class ModelInterface {
    constructor(
        private editorState: EditorState,
        private viewport: Viewport,
        private selectionManager: SelectionManager,
        private operationHistory: OperationHistory
    ) {}

    // ========================================================================
    // NODE OPERATIONS
    // ========================================================================

    /**
     * Creates a new node and adds it to the tree
     *
     * @param type - Node type (e.g., "sequence", "action", "custom_walk")
     * @param position - Position in world space
     * @param label - Optional custom label (defaults to type-based label)
     * @param code - Optional custom code (for action nodes)
     * @returns Result with nodeId if successful
     */
    public createNode(
        type: string,
        position: Position,
        label?: string,
        code?: string
    ): NodeCreationResult {
        try {
            // Create node using registry
            const node = NodeRegistry.create(type);
            if (!node) {
                return {
                    success: false,
                    error: `Unknown node type: ${type}`
                };
            }

            // Set position
            node.position = new Vector2(position.x, position.y);

            // Set label if provided
            if (label) {
                node.label = label;
            }

            // Set code if provided
            if (code) {
                node.code = code;
            }

            // Execute add operation
            const operation = new AddNodeOperation(this.editorState, node);
            this.operationHistory.execute(operation);

            return {
                success: true,
                nodeId: node.id,
                node: node
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to create node: ${(error as Error).message}`
            };
        }
    }

    /**
     * Deletes a node by ID
     *
     * @param nodeId - ID of the node to delete
     * @returns Result indicating success/failure
     */
    public deleteNode(nodeId: string): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            const operation = new RemoveNodeOperation(this.editorState, node);
            this.operationHistory.execute(operation);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to delete node: ${(error as Error).message}`
            };
        }
    }

    /**
     * Updates the code of a node
     *
     * @param nodeId - ID of the node to update
     * @param code - New code content
     * @returns Result indicating success/failure
     */
    public updateNodeCode(nodeId: string, code: string): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            const operation = new UpdateNodeCodeOperation(node, code);
            this.operationHistory.execute(operation);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to update node code: ${(error as Error).message}`
            };
        }
    }

    /**
     * Moves a node to a new position
     *
     * @param nodeId - ID of the node to move
     * @param position - New position in world space
     * @returns Result indicating success/failure
     */
    public moveNode(nodeId: string, position: Position): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            const newPosition = new Vector2(position.x, position.y);
            const operation = new MoveNodeOperation(node, newPosition);
            this.operationHistory.execute(operation);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to move node: ${(error as Error).message}`
            };
        }
    }

    /**
     * Duplicates a node
     *
     * @param nodeId - ID of the node to duplicate
     * @param offset - Optional position offset (defaults to {x: 50, y: 50})
     * @returns Result with new nodeId if successful
     */
    public duplicateNode(
        nodeId: string,
        offset?: Position
    ): NodeCreationResult {
        try {
            const originalNode = this.editorState.findNodeById(nodeId);
            if (!originalNode) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            // Create new node of same type
            const newNode = NodeRegistry.create(originalNode.type);
            if (!newNode) {
                return {
                    success: false,
                    error: `Failed to create node of type: ${originalNode.type}`
                };
            }

            // Copy properties
            const offsetPos = offset || { x: 50, y: 50 };
            newNode.position = originalNode.position.clone().add(
                new Vector2(offsetPos.x, offsetPos.y)
            );
            newNode.label = originalNode.label;
            if (originalNode.code) {
                newNode.code = originalNode.code;
            }

            // Add to tree
            const operation = new AddNodeOperation(this.editorState, newNode);
            this.operationHistory.execute(operation);

            return {
                success: true,
                nodeId: newNode.id,
                node: newNode
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to duplicate node: ${(error as Error).message}`
            };
        }
    }

    /**
     * Updates a node's label
     *
     * @param nodeId - ID of the node to update
     * @param label - New label
     * @returns Result indicating success/failure
     */
    public updateNodeLabel(nodeId: string, label: string): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            // Direct mutation (not critical for undo/redo)
            node.label = label;

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to update node label: ${(error as Error).message}`
            };
        }
    }

    // ========================================================================
    // CONNECTION OPERATIONS
    // ========================================================================

    /**
     * Connects a child node to a parent node
     *
     * @param parentId - ID of the parent node
     * @param childId - ID of the child node
     * @param index - Optional index in parent's children array
     * @returns Result indicating success/failure
     */
    public connectNodes(
        parentId: string,
        childId: string,
        index?: number
    ): ConnectionResult {
        try {
            const parent = this.editorState.findNodeById(parentId);
            if (!parent) {
                return {
                    success: false,
                    error: `Parent node not found: ${parentId}`
                };
            }

            const child = this.editorState.findNodeById(childId);
            if (!child) {
                return {
                    success: false,
                    error: `Child node not found: ${childId}`
                };
            }

            const operation = new ConnectNodesOperation(
                this.editorState,
                parent,
                child,
                index
            );
            this.operationHistory.execute(operation);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to connect nodes: ${(error as Error).message}`
            };
        }
    }

    /**
     * Disconnects a node from its parent
     *
     * @param nodeId - ID of the node to disconnect
     * @returns Result indicating success/failure
     */
    public disconnectNode(nodeId: string): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            if (!node.parent) {
                return {
                    success: false,
                    error: `Node has no parent: ${nodeId}`
                };
            }

            const operation = new DisconnectNodeOperation(this.editorState, node);
            this.operationHistory.execute(operation);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to disconnect node: ${(error as Error).message}`
            };
        }
    }

    // ========================================================================
    // TREE OPERATIONS
    // ========================================================================

    /**
     * Starts tree execution
     */
    public playTree(): OperationResult {
        try {
            this.editorState.behaviorTree.start();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to start tree: ${(error as Error).message}`
            };
        }
    }

    /**
     * Pauses tree execution
     */
    public pauseTree(): OperationResult {
        try {
            this.editorState.behaviorTree.pause();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to pause tree: ${(error as Error).message}`
            };
        }
    }

    /**
     * Steps tree execution by one tick
     */
    public stepTree(): OperationResult {
        try {
            this.editorState.behaviorTree.step();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to step tree: ${(error as Error).message}`
            };
        }
    }

    /**
     * Resets tree execution state
     */
    public resetTree(): OperationResult {
        try {
            this.editorState.behaviorTree.reset();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to reset tree: ${(error as Error).message}`
            };
        }
    }

    /**
     * Gets current execution state
     */
    public getExecutionState(): OperationResult {
        try {
            return {
                success: true,
                data: {
                    isRunning: this.editorState.behaviorTree.state === 'running',
                    tickCount: this.editorState.behaviorTree.tickCount,
                    rootId: this.editorState.behaviorTree.root?.id || null
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get execution state: ${(error as Error).message}`
            };
        }
    }

    // ========================================================================
    // SELECTION OPERATIONS
    // ========================================================================

    /**
     * Selects one or more nodes
     *
     * @param nodeIds - Array of node IDs to select
     * @param addToSelection - Whether to add to current selection (default: false)
     * @returns Result indicating success/failure
     */
    public selectNodes(
        nodeIds: string[],
        addToSelection: boolean = false
    ): OperationResult {
        try {
            if (!addToSelection) {
                this.selectionManager.clearSelection();
            }

            for (const nodeId of nodeIds) {
                const node = this.editorState.findNodeById(nodeId);
                if (!node) {
                    return {
                        success: false,
                        error: `Node not found: ${nodeId}`
                    };
                }
                this.selectionManager.selectNode(node, true);
            }

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to select nodes: ${(error as Error).message}`
            };
        }
    }

    /**
     * Deselects all nodes
     */
    public deselectAll(): OperationResult {
        try {
            this.selectionManager.clearSelection();
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to deselect all: ${(error as Error).message}`
            };
        }
    }

    // ========================================================================
    // VIEWPORT OPERATIONS
    // ========================================================================

    /**
     * Pans the viewport
     *
     * @param x - X offset in screen space
     * @param y - Y offset in screen space
     * @returns Result indicating success/failure
     */
    public panViewport(x: number, y: number): OperationResult {
        try {
            this.viewport.pan(new Vector2(x, y));
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to pan viewport: ${(error as Error).message}`
            };
        }
    }

    /**
     * Sets the viewport zoom level
     *
     * @param zoom - Zoom level (1.0 = 100%)
     * @returns Result indicating success/failure
     */
    public setZoom(zoom: number): OperationResult {
        try {
            this.viewport.zoom = Math.max(
                this.viewport.minZoom,
                Math.min(this.viewport.maxZoom, zoom)
            );
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to set zoom: ${(error as Error).message}`
            };
        }
    }

    /**
     * Focuses the viewport on a node
     *
     * @param nodeId - ID of the node to focus on
     * @returns Result indicating success/failure
     */
    public focusNode(nodeId: string): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            // Center viewport on node
            // Note: This is a simplified version - in practice you'd need canvas dimensions
            const screenPos = this.viewport.worldToScreen(node.position);
            this.viewport.offset = screenPos.multiply(-1);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: `Failed to focus node: ${(error as Error).message}`
            };
        }
    }

    // ========================================================================
    // QUERY OPERATIONS
    // ========================================================================

    /**
     * Gets information about a node
     *
     * @param nodeId - ID of the node
     * @returns Result with node data if successful
     */
    public getNode(nodeId: string): OperationResult {
        try {
            const node = this.editorState.findNodeById(nodeId);
            if (!node) {
                return {
                    success: false,
                    error: `Node not found: ${nodeId}`
                };
            }

            return {
                success: true,
                data: {
                    id: node.id,
                    type: node.type,
                    label: node.label,
                    category: node.category,
                    position: { x: node.position.x, y: node.position.y },
                    status: node.status,
                    code: node.code,
                    parentId: node.parent?.id || null,
                    childIds: node.children.map(c => c.id)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get node: ${(error as Error).message}`
            };
        }
    }

    /**
     * Gets all available node types
     *
     * @returns Result with array of node types
     */
    public getAvailableNodeTypes(): OperationResult {
        try {
            const registrations = NodeRegistry.getAll();
            const types = registrations.map(reg => ({
                type: reg.type,
                category: reg.category,
                label: reg.label,
                description: reg.description,
                icon: reg.icon
            }));

            return {
                success: true,
                data: types
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to get node types: ${(error as Error).message}`
            };
        }
    }
}
