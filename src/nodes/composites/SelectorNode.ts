import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * SelectorNode: Executes children in order until one succeeds.
 *
 * - Returns SUCCESS if ANY child succeeds
 * - Returns FAILURE only if ALL children fail
 * - Returns RUNNING if a child is still running
 *
 * Use case: "Try A, else try B, else try C"
 */
export class SelectorNode extends TreeNode {
    constructor() {
        super('selector', 'Selector', 'composite', 'fa-random', Theme.node.composite);
    }

    public tick(blackboard: Blackboard): NodeStatus {
        // No children means failure
        if (this.children.length === 0) {
            this.status = NodeStatus.FAILURE;
            return this.status;
        }

        // Continue from where we left off
        for (let i = this.currentChildIndex; i < this.children.length; i++) {
            const child = this.children[i];
            const childStatus = child.tick(blackboard);

            if (childStatus === NodeStatus.SUCCESS) {
                // Child succeeded, selector succeeds
                this.currentChildIndex = 0;
                this.status = NodeStatus.SUCCESS;
                return this.status;
            }

            if (childStatus === NodeStatus.RUNNING) {
                // Child still running, remember position
                this.currentChildIndex = i;
                this.status = NodeStatus.RUNNING;
                return this.status;
            }

            // Child failed, try next
        }

        // All children failed
        this.currentChildIndex = 0;
        this.status = NodeStatus.FAILURE;
        return this.status;
    }

    public reset(): void {
        super.reset();
        this.currentChildIndex = 0;
    }
}
