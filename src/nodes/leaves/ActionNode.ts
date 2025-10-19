import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { NodeExecutor } from '../../core/NodeExecutor.js';
import { Theme } from '../../utils/Theme.js';

/**
 * ActionNode: A user-programmable leaf node.
 *
 * Executes custom JavaScript code defined by the user.
 * Code has access to the blackboard and must return a NodeStatus.
 * Supports lifecycle methods: OnStart(), OnUpdate(tick), OnEnd(status)
 *
 * Use case: Custom actions defined by the user
 */
export class ActionNode extends TreeNode {
    // Track ticks since this node started
    private ticksSinceStart: number = 0;

    constructor(label: string = 'Action') {
        super('action', label, 'leaf', 'fa-bolt', Theme.node.leaf);

        // Initialize with default code
        this.code = NodeExecutor.getDefaultCode();
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (!this.code) {
            // No code means success
            this.status = NodeStatus.SUCCESS;
            this.ticksSinceStart = 0;
            return this.status;
        }

        // Execute the user's code with tick count and parameters
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
            // Reset tick count when complete
            this.ticksSinceStart = 0;
        }

        return this.status;
    }

    public reset(): void {
        super.reset();
        this.ticksSinceStart = 0;
    }
}
