import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { Theme } from '../../utils/Theme.js';

/**
 * InverterNode: Inverts the result of its child.
 *
 * - SUCCESS → FAILURE
 * - FAILURE → SUCCESS
 * - RUNNING → RUNNING
 *
 * Use case: "Do the opposite of X"
 */
export class InverterNode extends TreeNode {
    constructor() {
        super('inverter', 'Inverter', 'decorator', 'fa-exchange-alt', Theme.node.decorator);
        this.maxChildren = 1; // Decorators can only have one child
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (this.children.length === 0) {
            this.status = NodeStatus.FAILURE;
            return this.status;
        }

        // Tick the only child (decorators have single child)
        const child = this.children[0];
        const childStatus = child.tick(blackboard);

        // Invert success and failure
        if (childStatus === NodeStatus.SUCCESS) {
            this.status = NodeStatus.FAILURE;
        } else if (childStatus === NodeStatus.FAILURE) {
            this.status = NodeStatus.SUCCESS;
        } else {
            // RUNNING or IDLE stays the same
            this.status = childStatus;
        }

        return this.status;
    }
}
