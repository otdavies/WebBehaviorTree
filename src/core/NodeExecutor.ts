import { NodeStatus } from './NodeStatus.js';
import { Blackboard } from './Blackboard.js';

/**
 * NodeExecutor: Safely executes user-written JavaScript code within nodes.
 *
 * This class wraps user code in a try-catch block and provides a controlled
 * execution environment with access to the blackboard and NodeStatus enum.
 */
export class NodeExecutor {
    // Global callback for console.log interception
    public static onConsoleLog?: (message: string, nodeId?: string) => void;

    // Global callback for execution errors
    public static onError?: (message: string, nodeId?: string) => void;

    /**
     * Executes user code and returns a NodeStatus.
     *
     * @param code - The JavaScript code to execute
     * @param blackboard - The blackboard instance for data access
     * @param nodeId - Optional node ID for tracking blackboard access
     * @param tick - Current tick count since node started
     * @param params - Node parameters accessible in code
     * @returns The resulting NodeStatus, or FAILURE if execution fails
     */
    public static execute(
        code: string,
        blackboard: Blackboard,
        nodeId?: string,
        tick?: number,
        params?: Record<string, any>
    ): NodeStatus {
        if (!code || code.trim() === '') {
            // Empty code defaults to success
            return NodeStatus.SUCCESS;
        }

        // Wrap user code in strict mode
        const wrappedCode = `
            'use strict';
            ${code}
        `;

        // Create a custom console that intercepts log calls
        const customConsole = {
            log: (...args: any[]) => {
                const message = args.map(arg => String(arg)).join(' ');
                if (NodeExecutor.onConsoleLog) {
                    NodeExecutor.onConsoleLog(message, nodeId);
                }
                // Also log to real console
                console.log(...args);
            },
            error: console.error.bind(console),
            warn: console.warn.bind(console)
        };

        try {
            // Create the function with controlled scope
            const executeFunction = new Function(
                'blackboard',
                'NodeStatus',
                'nodeId',
                'console',
                'tick',
                'params',
                wrappedCode
            );

            // Execute the function
            const result = executeFunction(
                blackboard,
                NodeStatus,
                nodeId,
                customConsole,
                tick !== undefined ? tick : 0,
                params || {}
            );

            // Handle undefined return (common when code has no return statement)
            // Silently treat as FAILURE - this is expected behavior for incomplete code
            if (result === undefined) {
                return NodeStatus.FAILURE;
            }

            // Validate the result is a valid NodeStatus
            if (!this.isValidNodeStatus(result)) {
                console.error(
                    `Invalid return value from node code. Expected NodeStatus (SUCCESS/FAILURE/RUNNING/IDLE), got:`,
                    result,
                    `(type: ${typeof result})`
                );
                return NodeStatus.FAILURE;
            }

            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);

            // Enhanced error feedback
            if (NodeExecutor.onError) {
                NodeExecutor.onError(errorMessage, nodeId);
            }

            // Store error in blackboard for inspection
            if (nodeId) {
                blackboard.set(`__error_${nodeId}`, {
                    message: errorMessage,
                    timestamp: Date.now(),
                    code: code.substring(0, 100)
                });
            }

            // Log the error for debugging
            console.error('Node execution error:', error);

            // Return FAILURE on any exception
            return NodeStatus.FAILURE;
        }
    }

    /**
     * Validates that a value is a valid NodeStatus
     */
    private static isValidNodeStatus(value: any): value is NodeStatus {
        return (
            value === NodeStatus.SUCCESS ||
            value === NodeStatus.FAILURE ||
            value === NodeStatus.RUNNING ||
            value === NodeStatus.IDLE
        );
    }

    /**
     * Validates user code syntax without executing it.
     * Returns null if valid, or an error message if invalid.
     */
    public static validateSyntax(code: string): string | null {
        if (!code || code.trim() === '') {
            return null; // Empty code is valid
        }

        try {
            // Attempt to create the function to check syntax
            new Function('blackboard', 'NodeStatus', 'nodeId', code);
            return null; // Valid
        } catch (error) {
            if (error instanceof Error) {
                return error.message;
            }
            return 'Unknown syntax error';
        }
    }

    /**
     * Returns a default code template for new action nodes
     */
    public static getDefaultCode(): string {
        return `// OnStart - called once when node starts
function OnStart() {
    // Initialize any state here
    // Access params: params.yourParameter
}

// OnUpdate - called every tick, receives tick count
function OnUpdate(tick) {
    // Main execution logic
    // Access blackboard: blackboard.get('key') / blackboard.set('key', value)
    // Access params: params.yourParameter

    // Must return NodeStatus
    return NodeStatus.SUCCESS;
}

// OnEnd - called when node completes
function OnEnd(status) {
    // Cleanup code
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

    /**
     * Returns example code snippets for common patterns
     */
    public static getExamples(): Record<string, string> {
        return {
            'Simple Success': `return NodeStatus.SUCCESS;`,

            'Conditional Logic': `const health = blackboard.get('health');
if (health > 50) {
    return NodeStatus.SUCCESS;
} else {
    return NodeStatus.FAILURE;
}`,

            'Running State': `const startTime = blackboard.get('startTime');
if (!startTime) {
    blackboard.set('startTime', Date.now());
    return NodeStatus.RUNNING;
}

const elapsed = Date.now() - startTime;
if (elapsed < 2000) {
    return NodeStatus.RUNNING;
}

blackboard.set('startTime', null);
return NodeStatus.SUCCESS;`,

            'Random Outcome': `const random = Math.random();
if (random > 0.5) {
    return NodeStatus.SUCCESS;
} else {
    return NodeStatus.FAILURE;
}`,

            'Math Operations': `const a = blackboard.get('a') || 0;
const b = blackboard.get('b') || 0;
const result = a + b;

blackboard.set('result', result);
return NodeStatus.SUCCESS;`,
        };
    }
}
