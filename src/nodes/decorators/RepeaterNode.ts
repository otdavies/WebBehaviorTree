import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * RepeaterNode: Repeats its child N times.
 *
 * Configuration:
 * - count: Number of times to repeat (default: 3)
 * - repeatForever: If true, repeats indefinitely (default: false)
 *
 * Returns RUNNING while repeating, SUCCESS when done.
 *
 * Use case: "Do X three times"
 */
export class RepeaterNode extends TreeNode {
    private currentIteration: number = 0;

    constructor() {
        super('repeater', 'Repeater', 'decorator', 'fa-redo', Theme.node.decorator);
        this.maxChildren = 1; // Decorators can only have one child

        // Default configuration
        this.config.count = 3;
        this.config.repeatForever = false;
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (this.children.length === 0) {
            this.status = NodeStatus.SUCCESS;
            return this.status;
        }

        const child = this.children[0];
        const count = this.config.count || 3;
        const repeatForever = this.config.repeatForever || false;

        // If repeating forever, always run
        if (repeatForever) {
            child.tick(blackboard);

            // Reset child after each iteration
            if (child.status === NodeStatus.SUCCESS || child.status === NodeStatus.FAILURE) {
                child.reset();
            }

            this.status = NodeStatus.RUNNING;
            return this.status;
        }

        // Repeat for a specific count
        while (this.currentIteration < count) {
            const childStatus = child.tick(blackboard);

            if (childStatus === NodeStatus.RUNNING) {
                this.status = NodeStatus.RUNNING;
                return this.status;
            }

            // Child completed (success or failure), move to next iteration
            this.currentIteration++;
            child.reset();

            // If child failed, propagate failure
            if (childStatus === NodeStatus.FAILURE) {
                this.currentIteration = 0;
                this.status = NodeStatus.FAILURE;
                return this.status;
            }
        }

        // All iterations complete
        this.currentIteration = 0;
        this.status = NodeStatus.SUCCESS;
        return this.status;
    }

    public reset(): void {
        super.reset();
        this.currentIteration = 0;
    }
}
