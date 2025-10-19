import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * UntilFailNode: Repeats its child until it fails.
 *
 * Returns RUNNING while child succeeds.
 * Returns SUCCESS when child fails.
 *
 * Use case: "Keep doing X until it fails"
 */
export class UntilFailNode extends TreeNode {
    constructor() {
        super('until-fail', 'Until Fail', 'decorator', 'fa-times-circle', Theme.node.decorator);
        this.maxChildren = 1; // Decorators can only have one child
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        const child = this.children[0];
        const childStatus = child.tick(blackboard);

        if (childStatus === NodeStatus.FAILURE) {
            // Child failed, we succeed
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        if (childStatus === NodeStatus.RUNNING) {
            // Child still running
            this.status = NodeStatus.RUNNING;
            return this.status;
        }

        // Child succeeded, reset it and keep running
        child.reset();
        this.status = NodeStatus.RUNNING;
        return this.status;
    }
}
