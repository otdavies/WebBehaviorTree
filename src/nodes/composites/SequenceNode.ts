import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * SequenceNode: Executes children in order until one fails.
 *
 * - Returns SUCCESS only if ALL children succeed
 * - Returns FAILURE if ANY child fails
 * - Returns RUNNING if a child is still running
 *
 * Use case: "Do A, then B, then C"
 */
export class SequenceNode extends TreeNode {
    constructor() {
        super('sequence', 'Sequence', 'composite', 'fa-list', Theme.node.composite);
    }

    public tick(blackboard: Blackboard): NodeStatus {
        // No children means success
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        // Continue from where we left off
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const child = this.children[i];
            const childStatus = child.tick(blackboard);

            if (childStatus === NodeStatus.FAILURE) {
                // Child failed, sequence fails
                this.currentChildIndex = 0;
                this.status = NodeStatus.FAILURE;
                return this.status;
            }

            if (childStatus === NodeStatus.RUNNING) {
                // Child still running, remember position
                this.currentChildIndex = i;
                this.status = NodeStatus.RUNNING;
                return this.status;
            }

            // Child succeeded, continue to next
        }

        // All children succeeded
        this.currentChildIndex = 0;
        this.status = NodeStatus.SUCCESS;
        return this.status;
    }

    public reset(): void {
        super.reset();
        this.currentChildIndex = 0;
    }
}
