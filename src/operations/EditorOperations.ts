import { Operation } from '../core/Operation.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';

/**
 * EditorOperations: Operations for editor UI state and batch execution
 *
 * These operations manage editor settings, selection state, and batch execution
 * of multiple operations as a single undoable unit.
 */

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
