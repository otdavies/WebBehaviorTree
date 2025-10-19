import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { NodeExecutor } from '../../core/NodeExecutor.js';
import { Theme } from '../../utils/Theme.js';

/**
 * WaitNode: Waits for a specified number of ticks before succeeding.
 *
 * This is a template node with a predefined parameter and behavior,
 * but the code is still editable if users want to customize it.
 */
export class WaitNode extends TreeNode {
    private ticksSinceStart: number = 0;

    constructor(label: string = 'Wait') {
        super('wait', label, 'leaf', 'fa-clock', Theme.node.leaf);

        // Define the waitTicks parameter
        this.parameters.define('waitTicks', {
            type: 'number',
            label: 'Wait Ticks',
            defaultValue: 10,
            min: 1,
            max: 1000,
            description: 'Number of ticks to wait before succeeding'
        });

        // Initialize with template code
        this.code = this.getTemplateCode();
    }

    private getTemplateCode(): string {
        return `// Wait Node - Waits for specified number of ticks

function OnStart() {
    // Initialize wait
}

function OnUpdate(tick) {
    const remaining = params.waitTicks - tick;

    if (remaining > 0) {
        // Still waiting
        return NodeStatus.RUNNING;
    }

    // Wait complete
    return NodeStatus.SUCCESS;
}

function OnEnd(status) {
    // Cleanup if needed
}

// Execute lifecycle
if (tick === 0) {
    OnStart();
}

const result = OnUpdate(tick);

if (result !== NodeStatus.RUNNING) {
    OnEnd(result);
}

return result;`;
    }

    public tick(blackboard: Blackboard): NodeStatus {
        if (!this.code) {
            this.status = NodeStatus.SUCCESS;
            this.ticksSinceStart = 0;
            return this.status;
        }

        // Execute the code with tick count and parameters
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
