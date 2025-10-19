import { TreeNode } from './TreeNode.js';
import { Blackboard } from './Blackboard.js';
import { NodeStatus } from './NodeStatus.js';
import { VersionManager } from '../utils/VersionManager.js';

/**
 * Execution state of the behavior tree
 */
export type TreeExecutionState = 'idle' | 'running' | 'paused';

/**
 * BehaviorTree: The main orchestrator for behavior tree execution.
 *
 * Manages the root node, blackboard, and tick-based execution loop.
 */
export class BehaviorTree {
    public root: TreeNode | null = null;
    public blackboard: Blackboard;
    public state: TreeExecutionState = 'idle';
    public tickCount: number = 0;

    // All nodes in the editor (needed to find all Start nodes)
    private allNodes: TreeNode[] = [];

    // All deserialized nodes from last fromJSON call (includes disconnected nodes)
    private deserializedNodes: TreeNode[] = [];

    // Execution control
    private tickInterval: number | null = null;
    private tickRate: number = 10; // ticks per second

    // Event callbacks
    private onTickCallbacks: Array<(status: NodeStatus) => void> = [];
    private onStateChangeCallbacks: Array<(state: TreeExecutionState) => void> = [];

    constructor() {
        this.blackboard = new Blackboard();
    }

    /**
     * Sets the root node of the tree
     */
    public setRoot(root: TreeNode | null): void {
        this.root = root;
        this.reset();
    }

    /**
     * Sets the list of all nodes (needed to find Start nodes)
     */
    public setAllNodes(nodes: TreeNode[]): void {
        this.allNodes = nodes;
    }

    /**
     * Finds all Start nodes sorted by X position (left to right)
     */
    private getStartNodes(): TreeNode[] {
        const startNodes = this.allNodes.filter(node => node.type === 'start');
        // Sort by X position (left to right)
        startNodes.sort((a, b) => a.position.x - b.position.x);
        return startNodes;
    }

    /**
     * Executes one tick of the behavior tree
     */
    public async tick(): Promise<NodeStatus> {
        // Find all Start nodes (the only valid execution entry points)
        const startNodes = this.getStartNodes();

        // If no Start nodes exist, fall back to root (for backward compatibility)
        if (startNodes.length === 0) {
            if (!this.root) {
                return NodeStatus.IDLE;
            }

            this.tickCount++;

            // Execute the root node
            const status = await this.root.tick(this.blackboard);

            // Notify listeners
            this.onTickCallbacks.forEach(callback => callback(status));

            // If tree completed, auto-reset for next tick
            if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
                this.root.reset();
            }

            return status;
        }

        // Execute all Start nodes in order (left to right)
        this.tickCount++;

        let overallStatus: NodeStatus = NodeStatus.SUCCESS;

        for (const startNode of startNodes) {
            const status = await startNode.tick(this.blackboard);

            // If any Start node is still running, overall status is running
            if (status === NodeStatus.RUNNING) {
                overallStatus = NodeStatus.RUNNING;
            }
            // If any Start node fails, mark overall as failure (but continue executing others)
            else if (status === NodeStatus.FAILURE) {
                overallStatus = NodeStatus.FAILURE;
            }

            // If tree completed (success or failure), auto-reset for next tick
            if (status === NodeStatus.SUCCESS || status === NodeStatus.FAILURE) {
                startNode.reset();
            }
        }

        // Notify listeners
        this.onTickCallbacks.forEach(callback => callback(overallStatus));

        return overallStatus;
    }

    /**
     * Starts continuous execution at the current tick rate
     */
    public start(): void {
        if (this.state === 'running') return;

        this.state = 'running';
        this.notifyStateChange();

        const interval = 1000 / this.tickRate;
        this.tickInterval = window.setInterval(() => {
            if (this.state === 'running') {
                this.tick();
            }
        }, interval);
    }

    /**
     * Pauses execution
     */
    public pause(): void {
        if (this.state !== 'running') return;

        this.state = 'paused';
        this.notifyStateChange();

        if (this.tickInterval !== null) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
    }

    /**
     * Stops execution and resets the tree
     */
    public stop(): void {
        this.pause();
        this.reset();
        this.blackboard.clear();
        this.state = 'idle';
        this.notifyStateChange();
    }

    /**
     * Resets the entire tree to initial state
     */
    public reset(): void {
        this.tickCount = 0;
        if (this.root) {
            this.root.reset();
        }
    }

    /**
     * Steps through one tick (useful for debugging)
     */
    public async step(): Promise<NodeStatus> {
        const previousState = this.state;
        this.state = 'paused';
        const status = await this.tick();
        if (previousState === 'idle') {
            this.state = 'idle';
        }
        this.notifyStateChange();
        return status;
    }

    /**
     * Sets the tick rate (ticks per second)
     */
    public setTickRate(rate: number): void {
        this.tickRate = Math.max(1, Math.min(60, rate)); // Clamp between 1-60

        // Restart interval if currently running
        if (this.state === 'running') {
            this.pause();
            this.start();
        }
    }

    /**
     * Gets the current tick rate
     */
    public getTickRate(): number {
        return this.tickRate;
    }

    /**
     * Registers a callback for tick events
     */
    public onTick(callback: (status: NodeStatus) => void): void {
        this.onTickCallbacks.push(callback);
    }

    /**
     * Registers a callback for state change events
     */
    public onStateChange(callback: (state: TreeExecutionState) => void): void {
        this.onStateChangeCallbacks.push(callback);
    }

    /**
     * Gets all nodes in the tree (flattened)
     */
    public getAllNodes(): TreeNode[] {
        if (!this.root) return [];

        const nodes: TreeNode[] = [this.root];
        nodes.push(...this.root.getAllDescendants());
        return nodes;
    }

    /**
     * Gets all nodes that were deserialized from the last fromJSON call
     * This includes disconnected nodes that aren't part of the tree hierarchy
     */
    public getAllDeserializedNodes(): TreeNode[] {
        return this.deserializedNodes;
    }

    /**
     * Finds a node by ID
     */
    public findNodeById(id: string): TreeNode | null {
        const allNodes = this.getAllNodes();
        return allNodes.find(node => node.id === id) || null;
    }

    /**
     * Serializes the tree to JSON
     */
    public toJSON(): any {
        const allNodes = this.getAllNodes();

        return {
            version: VersionManager.CURRENT_VERSION.toString(),
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                nodeCount: allNodes.length,
                editorVersion: VersionManager.CURRENT_VERSION
            },
            tree: {
                nodes: allNodes.map(node => node.toJSON()),
                root: this.root ? this.root.id : null
            },
            blackboard: {
                initialValues: this.blackboard.toJSON()
            }
        };
    }

    /**
     * Loads a tree from JSON
     */
    public fromJSON(data: any, nodeFactory: (type: string) => TreeNode): void {
        // Validate structure
        const validation = VersionManager.validate(data);
        if (!validation.valid) {
            const errorMsg = 'Invalid tree data:\n' + validation.errors.join('\n');
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        // Migrate to current version
        try {
            data = VersionManager.migrate(data);
        } catch (error) {
            console.error('Migration failed:', error);
            throw error;
        }

        // Clear existing tree
        this.root = null;
        this.blackboard.clear();
        this.deserializedNodes = [];

        // Create node instances
        const nodeMap = new Map<string, TreeNode>();

        if (!data.tree || !data.tree.nodes) {
            console.warn('No nodes found in tree data');
            return;
        }

        // First pass: create all nodes
        for (const nodeData of data.tree.nodes) {
            try {
                const node = nodeFactory(nodeData.type);
                if (!node) {
                    console.error(`Failed to create node of type: ${nodeData.type}`);
                    continue;
                }
                node.fromJSON(nodeData);
                nodeMap.set(node.id, node);
            } catch (error) {
                console.error(`Error creating node from data:`, nodeData, error);
            }
        }

        // Second pass: rebuild connections
        for (const nodeData of data.tree.nodes) {
            const parent = nodeMap.get(nodeData.id);
            if (!parent || !nodeData.children) continue;

            for (const childId of nodeData.children) {
                const child = nodeMap.get(childId);
                if (child) {
                    parent.addChild(child);
                } else {
                    console.warn(`Child node not found: ${childId}`);
                }
            }
        }

        // Set root
        if (data.tree.root) {
            this.root = nodeMap.get(data.tree.root) || null;
            if (!this.root) {
                console.error(`Root node not found: ${data.tree.root}`);
            }
        }

        // Load blackboard
        if (data.blackboard && data.blackboard.initialValues) {
            this.blackboard.fromJSON(data.blackboard.initialValues);
        }

        // Store all deserialized nodes (includes disconnected nodes)
        this.deserializedNodes = Array.from(nodeMap.values());
    }

    /**
     * Notifies state change listeners
     */
    private notifyStateChange(): void {
        this.onStateChangeCallbacks.forEach(callback => callback(this.state));
    }

    /**
     * Cleanup (call this when disposing the tree)
     */
    public dispose(): void {
        this.stop();
        this.onTickCallbacks = [];
        this.onStateChangeCallbacks = [];
    }
}
