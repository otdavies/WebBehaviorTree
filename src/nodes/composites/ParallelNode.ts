import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * ParallelNode: Executes all children simultaneously (every tick).
 *
 * Succeeds when a minimum number of children succeed.
 * Fails when too many children have failed (making success impossible).
 *
 * Configuration:
 * - minSuccess: Minimum number of children that must succeed (default: all)
 * - minFailure: Minimum number of children that must fail to cause failure (default: 1)
 *
 * Use case: "Do multiple things at once"
 */
export class ParallelNode extends TreeNode {
    constructor() {
        super('parallel', 'Parallel', 'composite', 'fa-layer-group', Theme.node.composite);

        // Default configuration
        this.config.minSuccess = -1; // -1 means all children must succeed
        this.config.minFailure = 1;   // Fail if any child fails
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        // Determine success/failure thresholds
        const minSuccess = this.config.minSuccess === -1
            ? this.children.length
            : this.config.minSuccess;

        const minFailure = this.config.minFailure || 1;

        // Tick all children
        let successCount = 0;
        let failureCount = 0;
        let runningCount = 0;

        for (const child of this.children) {
            const childStatus = child.tick(blackboard);

            if (childStatus === NodeStatus.SUCCESS) {
                successCount++;
            } else if (childStatus === NodeStatus.FAILURE) {
                failureCount++;
            } else if (childStatus === NodeStatus.RUNNING) {
                runningCount++;
            }
        }

        // Check if we have enough successes
        if (successCount >= minSuccess) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        // Check if we have too many failures
        if (failureCount >= minFailure) {
            this.status = NodeStatus.FAILURE;
            return this.status;
        }

        // Still running
        this.status = NodeStatus.RUNNING;
        return this.status;
    }
}
