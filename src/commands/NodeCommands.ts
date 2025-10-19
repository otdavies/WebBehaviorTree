import { Command } from '../core/Command.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';

/**
 * AddNodeCommand: Adds a node to the editor
 */
export class AddNodeCommand implements Command {
    public description: string;

    constructor(
        private editorState: EditorState,
        private node: TreeNode
    ) {
        this.description = `Add ${node.type} node`;
    }

    public execute(): void {
        this.editorState.addNode(this.node);
    }

    public undo(): void {
        this.editorState.removeNode(this.node);
    }
}

/**
 * RemoveNodeCommand: Removes a node from the editor
 */
export class RemoveNodeCommand implements Command {
    public description: string;
    private parentConnection: { parent: TreeNode; index: number } | null = null;

    constructor(
        private editorState: EditorState,
        private node: TreeNode
    ) {
        this.description = `Remove ${node.type} node`;

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
 * RemoveNodesCommand: Removes multiple nodes from the editor
 */
export class RemoveNodesCommand implements Command {
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
 * MoveNodeCommand: Moves a node to a new position
 */
export class MoveNodeCommand implements Command {
    public description: string;
    private oldPosition: Vector2;

    constructor(
        private node: TreeNode,
        private newPosition: Vector2
    ) {
        this.description = `Move ${node.type} node`;
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
 * MoveNodesCommand: Moves multiple nodes
 */
export class MoveNodesCommand implements Command {
    public description: string;
    private nodePositions: Map<TreeNode, { old: Vector2; new: Vector2 }> = new Map();

    constructor(
        nodes: TreeNode[],
        delta: Vector2
    ) {
        this.description = `Move ${nodes.length} node(s)`;

        nodes.forEach(node => {
            this.nodePositions.set(node, {
                old: node.position.clone(),
                new: node.position.clone().add(delta)
            });
        });
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
 * ConnectNodesCommand: Connects two nodes (parent-child relationship)
 */
export class ConnectNodesCommand implements Command {
    public description: string;
    private previousParent: TreeNode | null = null;
    private previousIndex: number = -1;

    constructor(
        private editorState: EditorState,
        private parent: TreeNode,
        private child: TreeNode,
        private childIndex?: number
    ) {
        this.description = `Connect nodes`;

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
 * DisconnectNodeCommand: Disconnects a node from its parent
 */
export class DisconnectNodeCommand implements Command {
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

        this.description = `Disconnect node`;
        this.previousParent = node.parent;
        this.previousIndex = node.parent.children.indexOf(node);
    }

    public execute(): void {
        this.editorState.disconnectNode(this.node);
    }

    public undo(): void {
        this.editorState.connectNodes(this.previousParent, this.node, this.previousIndex);
    }
}
