/**
 * Represents the execution status of a behavior tree node.
 *
 * - SUCCESS: The node completed successfully
 * - FAILURE: The node failed to complete its task
 * - RUNNING: The node is still executing and needs more ticks
 * - IDLE: The node has not been executed yet or has been reset
 */
export enum NodeStatus {
    SUCCESS = 'success',
    FAILURE = 'failure',
    RUNNING = 'running',
    IDLE = 'idle'
}
