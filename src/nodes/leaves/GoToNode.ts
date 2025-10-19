import { TreeNode } from '../../core/TreeNode.js';
import { NodeStatus } from '../../core/NodeStatus.js';
import { Blackboard } from '../../core/Blackboard.js';
import { NodeExecutor } from '../../core/NodeExecutor.js';
import { Theme } from '../../utils/Theme.js';

/**
 * GoToNode: Finds and executes another action node by name.
 *
 * This allows for dynamic branching and reusable action sequences.
 * The target node's code is executed in this node's context.
 */
export class GoToNode extends TreeNode {
    private ticksSinceStart: number = 0;

    constructor(label: string = 'GoTo') {
        super('goto', label, 'leaf', 'fa-arrow-right', Theme.node.leaf);

        // Define parameters
        this.parameters.define('targetName', {
            type: 'string',
            label: 'Target Action Name',
            defaultValue: '',
            description: 'Name of the action node to execute'
        });

        this.parameters.define('failIfNotFound', {
            type: 'boolean',
            label: 'Fail If Not Found',
            defaultValue: true,
            description: 'Return FAILURE if target node is not found'
        });

        // Initialize with template code
        this.code = this.getTemplateCode();
    }

    private getTemplateCode(): string {
        return `// GoTo Node - Executes another action by name

function OnStart() {
    // Initialize GoTo execution
}

function OnUpdate(tick) {
    // Get the target node name from parameters
    const targetName = params.targetName;

    if (!targetName) {
        return params.failIfNotFound ? NodeStatus.FAILURE : NodeStatus.SUCCESS;
    }

    // Try to get the target node from the blackboard
    // (The editor should populate this with a reference to all nodes)
    const allNodes = blackboard.get('__allNodes') || [];

    // Find the target node by label
    const targetNode = allNodes.find(node =>
        node.label === targetName &&
        (node.type === 'action' || node.type === 'wait' || node.type === 'goto')
    );

    if (!targetNode) {
        return params.failIfNotFound ? NodeStatus.FAILURE : NodeStatus.SUCCESS;
    }

    // Execute the target node's code
    if (targetNode.code) {
        // Create a function to execute the target's code
        try {
            const executeFunction = new Function(
                'blackboard',
                'NodeStatus',
                'nodeId',
                'console',
                'tick',
                'params',
                targetNode.code
            );

            const result = executeFunction(
                blackboard,
                NodeStatus,
                nodeId,
                console,
                tick,
                targetNode.parameters || {}
            );

            return result;
        } catch (error) {
            return NodeStatus.FAILURE;
        }
    }

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
