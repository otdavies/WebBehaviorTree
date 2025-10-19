import { Operation } from '../core/Operation.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';

/**
 * TreeOperations: Operations that affect the entire behavior tree
 *
 * These operations handle tree-level mutations like setting the root,
 * clearing all nodes, and importing entire trees from JSON.
 */

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
