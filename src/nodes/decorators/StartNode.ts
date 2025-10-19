import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * StartNode: The root entry point of a behavior tree.
 *
 * This node simply executes its child and returns the result.
 * It serves as a visual indicator of where the tree execution begins.
 *
 * There should typically be only one Start node per behavior tree.
 */
export class StartNode extends TreeNode {
    constructor() {
        super('start', 'Start', 'decorator', 'fa-play', Theme.status.success);
        this.maxChildren = 1; // Start node can only have one child (the root of the tree)
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        // Execute the child and pass through its result
        const child = this.children[0];
        this.status = child.tick(blackboard);

        return this.status;
    }
}
