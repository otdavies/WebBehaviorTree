import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * UntilSuccessNode: Repeats its child until it succeeds.
 *
 * Returns RUNNING while child fails.
 * Returns SUCCESS when child succeeds.
 *
 * Use case: "Keep trying X until it succeeds"
 */
export class UntilSuccessNode extends TreeNode {
    constructor() {
        super('until-success', 'Until Success', 'decorator', 'fa-check-circle', Theme.node.decorator);
        this.maxChildren = 1; // Decorators can only have one child
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        const child = this.children[0];
        const childStatus = child.tick(blackboard);

        if (childStatus === NodeStatus.SUCCESS) {
            // Child succeeded, we succeed
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        if (childStatus === NodeStatus.RUNNING) {
            // Child still running
            this.status = NodeStatus.RUNNING;
            return this.status;
        }

        // Child failed, reset it and keep running
        child.reset();
        this.status = NodeStatus.RUNNING;
        return this.status;
    }
}
