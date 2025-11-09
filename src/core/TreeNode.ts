import { NodeStatus } from './NodeStatus.js';
import { Blackboard } from './Blackboard.js';
import { Vector2 } from '../utils/Vector2.js';
import { NodeParameters } from './NodeParameter.js';

/**
 * Node category types for visual organization
 */
export type NodeCategory = 'composite' | 'decorator' | 'leaf';

/**
 * Abstract base class for all behavior tree nodes.
 *
 * This class defines the interface and shared functionality for all node types.
 * Subclasses must implement the tick() method which contains the node's execution logic.
 */
export abstract class TreeNode {
    // Unique identifier
    public id: string;

    // Node type (e.g., "sequence", "selector", "action")
    public type: string;

    // Display label
    public label: string;

    // Category for styling
    public category: NodeCategory;

    // Child nodes
    public children: TreeNode[] = [];

    // Parent node (null if root)
    public parent: TreeNode | null = null;

    // Current execution status
    public status: NodeStatus = NodeStatus.IDLE;

    // Current child being executed (for composite nodes, used for progress visualization)
    public currentChildIndex: number = 0;

    // Visual properties (for editor)
    public position: Vector2;
    public icon: string;
    public color: string;

    // Custom user code (primarily for ActionNodes)
    public code?: string;

    // Additional configuration data
    public config: Record<string, any> = {};

    // Exposed parameters (for inspector)
    public parameters: NodeParameters = new NodeParameters();

    // Library sync tracking (for custom nodes)
    public libraryType?: string;      // The custom node type this was created from (e.g., "custom_walk")
    public isModified: boolean = false;  // Whether this instance has been modified from the library definition
    public libraryVersion?: number;   // The version of the library definition this was synced with

    // Maximum number of children allowed (-1 for unlimited)
    public maxChildren: number = -1;

    // Port configuration
    // Number of input ports (typically 0 for root nodes like Start, 1 for all others)
    public numInputs: number = 1;

    // Number of output ports (-1 for dynamic based on children, 0 for leaf nodes)
    public numOutputs: number = -1;

    // Port types: 'single' allows one connection, 'multi' allows unlimited connections
    public inputPortType: 'single' | 'multi' = 'single';
    public outputPortType: 'single' | 'multi' = 'multi';

    constructor(type: string, label: string, category: NodeCategory, icon: string, color: string) {
        this.id = this.generateId();
        this.type = type;
        this.label = label;
        this.category = category;
        this.icon = icon;
        this.color = color;
        this.position = new Vector2(0, 0);
    }

    /**
     * Main execution method. Subclasses must implement this.
     * @param blackboard - The shared data store
     * @returns The execution status
     */
    public abstract tick(blackboard: Blackboard): NodeStatus;

    /**
     * Resets the node to its initial state.
     * Override this in subclasses if they maintain state.
     */
    public reset(): void {
        this.status = NodeStatus.IDLE;
        this.children.forEach(child => child.reset());
    }

    /**
     * Checks if this node can accept more children
     * @returns true if more children can be added, false otherwise
     */
    public canAddMoreChildren(): boolean {
        // -1 means unlimited children
        if (this.maxChildren === -1) {
            return true;
        }
        return this.children.length < this.maxChildren;
    }

    /**
     * Adds a child node
     */
    public addChild(child: TreeNode): void {
        // Prevent self-parenting
        if (child === this) {
            throw new Error('Node cannot be its own child');
        }

        // Check for duplicate children
        if (this.children.includes(child)) {
            console.warn(`Child node "${child.label}" (${child.id}) is already a child of "${this.label}" (${this.id}), ignoring`);
            return;
        }

        // Check max children limit
        if (!this.canAddMoreChildren()) {
            const maxStr = this.maxChildren === -1 ? 'unlimited' : this.maxChildren.toString();
            console.warn(`Node "${this.label}" (${this.id}) has reached its maximum child limit (${maxStr}). Remove a child first.`);
            throw new Error(`Node "${this.label}" cannot accept more children (max: ${maxStr}).`);
        }

        // Prevent cycles - check if child is an ancestor of this node
        if (child.isAncestorOf(this)) {
            throw new Error(`Cannot add child "${child.label}" (${child.id}) to "${this.label}" (${this.id}): would create a cycle in the tree`);
        }

        this.children.push(child);
        child.parent = this;
    }

    /**
     * Removes a child node
     */
    public removeChild(child: TreeNode): boolean {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
            return true;
        }
        return false;
    }

    /**
     * Removes all children
     */
    public clearChildren(): void {
        this.children.forEach(child => {
            child.parent = null;
        });
        this.children = [];
    }

    /**
     * Gets all descendants (children, grandchildren, etc.)
     */
    public getAllDescendants(): TreeNode[] {
        const descendants: TreeNode[] = [];
        const traverse = (node: TreeNode) => {
            node.children.forEach(child => {
                descendants.push(child);
                traverse(child);
            });
        };
        traverse(this);
        return descendants;
    }

    /**
     * Checks if this node is an ancestor of another node
     */
    public isAncestorOf(node: TreeNode): boolean {
        let current = node.parent;
        while (current) {
            if (current === this) return true;
            current = current.parent;
        }
        return false;
    }

    /**
     * Serializes this node to JSON
     */
    public toJSON(): any {
        return {
            id: this.id,
            type: this.type,
            label: this.label,
            category: this.category,
            position: { x: this.position.x, y: this.position.y },
            icon: this.icon,
            color: this.color,
            code: this.code,
            config: this.config,
            parameters: this.parameters.toJSON(),
            children: this.children.map(child => child.id),
            libraryType: this.libraryType,
            isModified: this.isModified,
            libraryVersion: this.libraryVersion,
            inputPortType: this.inputPortType,
            outputPortType: this.outputPortType
        };
    }

    /**
     * Updates this node from JSON data
     */
    public fromJSON(data: any): void {
        // Validate input is an object
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid node data: expected object');
        }

        // Validate type match (warn if mismatch)
        if (data.type && data.type !== this.type) {
            console.warn(
                `Type mismatch for node ${data.id || 'unknown'}: ` +
                `expected "${this.type}", got "${data.type}". ` +
                `This may cause unexpected behavior.`
            );
        }

        // Update ID if provided
        if (data.id) {
            this.id = data.id;
        }

        // Update label if provided
        if (data.label) {
            this.label = data.label;
        }

        // Validate and update position
        if (data.position) {
            if (typeof data.position.x === 'number' && typeof data.position.y === 'number') {
                this.position = Vector2.from(data.position);
            } else {
                console.warn(
                    `Invalid position for node ${this.id}: ` +
                    `expected object with numeric x and y properties. Using current position.`
                );
            }
        }

        // Update code if provided
        if (data.code !== undefined) {
            this.code = data.code;
        }

        // Update config if provided
        if (data.config) {
            if (typeof data.config === 'object') {
                this.config = data.config;
            } else {
                console.warn(
                    `Invalid config for node ${this.id}: expected object. Using default config.`
                );
            }
        }

        // Update parameters if provided
        if (data.parameters) {
            if (typeof data.parameters === 'object') {
                this.parameters.fromJSON(data.parameters);
            } else {
                console.warn(
                    `Invalid parameters for node ${this.id}: expected object. Skipping parameters.`
                );
            }
        }

        // Update library sync tracking if provided
        if (data.libraryType !== undefined) {
            this.libraryType = data.libraryType;
        }
        if (data.isModified !== undefined) {
            this.isModified = data.isModified;
        }
        if (data.libraryVersion !== undefined) {
            this.libraryVersion = data.libraryVersion;
        }

        // Update port types if provided
        if (data.inputPortType !== undefined) {
            this.inputPortType = data.inputPortType;
        }
        if (data.outputPortType !== undefined) {
            this.outputPortType = data.outputPortType;
        }
    }

    /**
     * Generates a unique ID for the node
     */
    private generateId(): string {
        return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Returns a human-readable string representation
     */
    public toString(): string {
        return `${this.type}[${this.label}] - ${this.status}`;
    }
}
