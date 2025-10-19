import { Operation } from '../core/Operation.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';

/**
 * EditorActions: Centralized re-exports and convenience API for all operations
 *
 * This file serves as the main entry point for all editor operations, providing:
 * 1. Re-exports of all operation classes from focused modules
 * 2. Convenience factory functions for easier operation creation
 *
 * The operations are split across focused modules for better organization:
 * - NodeOperations: Add, remove, move, update operations
 * - ConnectionOperations: Connect and disconnect operations
 * - TreeOperations: Tree-level operations (root, clear, import)
 * - EditorOperations: UI state and batch operations
 *
 * IMPORTANT: All mutations to editor state should go through these operations
 * to maintain undo/redo consistency.
 */

// ============================================================================
// RE-EXPORTS FROM FOCUSED MODULES
// ============================================================================

// Node operations
export {
    AddNodeOperation,
    RemoveNodeOperation,
    RemoveNodesOperation,
    MoveNodeOperation,
    MoveNodesOperation,
    DuplicateNodesOperation,
    UpdateNodeLabelOperation,
    UpdateNodeCodeOperation,
    UpdateNodeParameterOperation,
    UpdateNodeConfigOperation
} from './NodeOperations.js';

// Connection operations
export {
    ConnectNodesOperation,
    DisconnectNodeOperation
} from './ConnectionOperations.js';

// Tree operations
export {
    SetRootOperation,
    ClearAllNodesOperation,
    ImportTreeOperation
} from './TreeOperations.js';

// Editor operations
export {
    SetSelectionOperation,
    ToggleGridOperation,
    ToggleSnapToGridOperation,
    BatchOperation
} from './EditorOperations.js';

// ============================================================================
// CONVENIENCE FACTORY FUNCTIONS
// ============================================================================

// Import operation classes for factory functions
import {
    AddNodeOperation,
    RemoveNodeOperation,
    RemoveNodesOperation,
    MoveNodeOperation,
    MoveNodesOperation,
    DuplicateNodesOperation,
    UpdateNodeLabelOperation,
    UpdateNodeCodeOperation,
    UpdateNodeParameterOperation,
    UpdateNodeConfigOperation
} from './NodeOperations.js';

import {
    ConnectNodesOperation,
    DisconnectNodeOperation
} from './ConnectionOperations.js';

import {
    SetRootOperation,
    ClearAllNodesOperation,
    ImportTreeOperation
} from './TreeOperations.js';

import {
    SetSelectionOperation,
    ToggleGridOperation,
    ToggleSnapToGridOperation,
    BatchOperation
} from './EditorOperations.js';

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
