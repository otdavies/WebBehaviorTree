import { EditorState } from '../state/EditorState.js';
import { Vector2 } from './Vector2.js';
import { NodeRegistry } from '../core/NodeRegistry.js';
import { AddNodeOperation, ConnectNodesOperation } from '../operations/Operations.js';

/**
 * DemoTree: Creates a demo behavior tree to showcase the editor
 */
export class DemoTree {
    constructor(private editorState: EditorState) {}

    /**
     * Creates a simple demo tree with sequence and action nodes
     */
    public create(): void {
        // Create a simple demo tree
        const root = this.createNode('sequence', new Vector2(0, -100));
        const action1 = this.createNode('action', new Vector2(-100, 100));
        const action2 = this.createNode('action', new Vector2(100, 100));

        // Set labels
        root.label = 'Main Sequence';
        action1.label = 'Action 1';
        action2.label = 'Action 2';

        // Set demo code
        action1.code = `// Example: Set a value in the blackboard
blackboard.set('counter', 1);
console.log('Action 1 executed');
return NodeStatus.SUCCESS;`;

        action2.code = `// Example: Read from blackboard
const counter = blackboard.get('counter') || 0;
console.log('Counter value:', counter);
return NodeStatus.SUCCESS;`;

        // Connect nodes using operations (but don't add to history for demo tree)
        const op1 = new ConnectNodesOperation(this.editorState, root, action1);
        const op2 = new ConnectNodesOperation(this.editorState, root, action2);
        this.editorState.operationHistory.recordCompleted(op1);
        this.editorState.operationHistory.recordCompleted(op2);

        // Set as root
        this.editorState.behaviorTree.setRoot(root);
    }

    /**
     * Creates a node at a given world position using the operation pattern
     */
    private createNode(type: string, worldPos: Vector2) {
        const node = NodeRegistry.create(type);
        if (!node) {
            throw new Error(`Failed to create node of type: ${type}`);
        }

        node.position = worldPos;

        // Use operation for undo/redo support
        const operation = new AddNodeOperation(this.editorState, node);
        this.editorState.operationHistory.execute(operation);

        return node;
    }
}
