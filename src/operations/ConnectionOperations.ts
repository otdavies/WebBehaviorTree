import { Operation } from '../core/Operation.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';

/**
 * ConnectionOperations: Operations for connecting and disconnecting nodes
 *
 * These operations manage parent-child relationships in the behavior tree.
 * All connections are fully undoable/redoable.
 */

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
