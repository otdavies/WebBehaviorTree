/**
 * Operations: Centralized re-exports for all operation classes
 *
 * This file serves as the main entry point for all editor operations, providing
 * re-exports of all operation classes from focused modules.
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
