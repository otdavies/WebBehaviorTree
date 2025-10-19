import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { NodeExecutor } from '../../core/NodeExecutor.js';
import { Theme } from '../../utils/Theme.js';

/**
 * CustomActionNode: A user-defined custom action node
 *
 * Similar to ActionNode but initialized with pre-defined custom code
 * from the CustomNodeCatalog.
 */
export class CustomActionNode extends TreeNode {
    private ticksSinceStart: number = 0;

    constructor(
        type: string,
        label: string,
        code: string,
        icon: string = 'fa-star'
    ) {
        super(type, label, 'leaf', icon, Theme.node.leaf);
        this.code = code;
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (!this.code) {
            this.status = NodeStatus.SUCCESS;
            this.ticksSinceStart = 0;
            return this.status;
        }

        // Execute the custom code with tick count and parameters
        this.status = NodeExecutor.execute(
            this.code,
            blackboard,
            this.id,
            this.ticksSinceStart,
            this.parameters.getValues()
        );

        // Increment tick count if still running
        if (this.status === NodeStatus.RUNNING) {
            this.ticksSinceStart++;
        } else {
            this.ticksSinceStart = 0;
        }

        return this.status;
    }

    public reset(): void {
        super.reset();
        this.ticksSinceStart = 0;
    }
}
