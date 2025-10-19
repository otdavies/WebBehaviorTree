import { EditorState } from '../state/EditorState.js';
import { Viewport } from '../editor/Viewport.js';
import { SelectionManager } from '../editor/SelectionManager.js';
import { TreeNode } from '../core/TreeNode.js';

/**
 * TreeSerializer: Creates AI-optimized representation of the behavior tree state
 *
 * This serializer produces a comprehensive snapshot of the editor state
 * in a format that's easy for AI models to understand and work with.
 */

/**
 * Serialized node representation for AI
 */
export interface AINode {
    /** Unique identifier */
    id: string;

    /** Node type (e.g., "sequence", "action", "custom_walk") */
    type: string;

    /** Display label */
    label: string;

    /** Category: composite, decorator, or leaf */
    category: string;

    /** Position in world space */
    position: { x: number; y: number };

    /** Current execution status */
    status: string;

    /** Custom code (for action nodes) */
    code?: string;

    /** Parent node ID (null if root) */
    parentId: string | null;

    /** Child node IDs in order */
    childIds: string[];

    /** Child index in parent's children array */
    childIndex: number;

    /** Icon identifier */
    icon: string;

    /** Color hex code */
    color: string;

    /** Library metadata (for custom nodes) */
    library?: {
        type: string;
        version: number;
        isModified: boolean;
    };

    /** Additional configuration */
    config: Record<string, any>;
}

/**
 * Serialized connection representation
 */
export interface AIConnection {
    /** Parent node ID */
    parentId: string;

    /** Child node ID */
    childId: string;

    /** Index in parent's children array */
    childIndex: number;
}

/**
 * Viewport state
 */
export interface AIViewport {
    /** Pan offset (world space) */
    offset: { x: number; y: number };

    /** Zoom level (1.0 = 100%) */
    zoom: number;

    /** Visible area bounds in world space */
    visibleArea?: {
        topLeft: { x: number; y: number };
        bottomRight: { x: number; y: number };
    };
}

/**
 * Execution state
 */
export interface AIExecutionState {
    /** Whether tree is currently running */
    isRunning: boolean;

    /** Total tick count */
    tickCount: number;

    /** Blackboard data */
    blackboard: Record<string, any>;

    /** Root node ID (null if no root) */
    rootId: string | null;
}

/**
 * Complete tree state for AI
 */
export interface AITreeState {
    /** All nodes in the tree */
    nodes: AINode[];

    /** All connections between nodes */
    connections: AIConnection[];

    /** Viewport state */
    viewport: AIViewport;

    /** Selected node IDs */
    selectedNodeIds: string[];

    /** Execution state */
    execution: AIExecutionState;

    /** Metadata */
    metadata: {
        /** Total number of nodes */
        totalNodes: number;

        /** Number of root nodes (disconnected trees) */
        rootNodeCount: number;

        /** Timestamp of serialization */
        timestamp: string;
    };
}

/**
 * TreeSerializer class
 */
export class TreeSerializer {
    /**
     * Serializes the complete tree state for AI consumption
     */
    public static serializeForAI(
        editorState: EditorState,
        viewport: Viewport,
        selectionManager: SelectionManager
    ): AITreeState {
        const nodes = this.serializeNodes(editorState.nodes);
        const connections = this.extractConnections(editorState.nodes);
        const viewportState = this.serializeViewport(viewport);
        const selectedNodeIds = selectionManager.getSelectedNodes().map(n => n.id);
        const execution = this.serializeExecution(editorState);

        return {
            nodes,
            connections,
            viewport: viewportState,
            selectedNodeIds,
            execution,
            metadata: {
                totalNodes: nodes.length,
                rootNodeCount: editorState.getRootNodes().length,
                timestamp: new Date().toISOString()
            }
        };
    }

    /**
     * Serializes all nodes
     */
    private static serializeNodes(nodes: TreeNode[]): AINode[] {
        return nodes.map(node => this.serializeNode(node));
    }

    /**
     * Serializes a single node
     */
    private static serializeNode(node: TreeNode): AINode {
        const aiNode: AINode = {
            id: node.id,
            type: node.type,
            label: node.label,
            category: node.category,
            position: {
                x: node.position.x,
                y: node.position.y
            },
            status: node.status,
            parentId: node.parent ? node.parent.id : null,
            childIds: node.children.map(c => c.id),
            childIndex: node.parent ? node.parent.children.indexOf(node) : -1,
            icon: node.icon,
            color: node.color,
            config: { ...node.config }
        };

        // Add code if present
        if (node.code) {
            aiNode.code = node.code;
        }

        // Add library metadata if present
        if (node.libraryType) {
            aiNode.library = {
                type: node.libraryType,
                version: node.libraryVersion || 1,
                isModified: node.isModified
            };
        }

        return aiNode;
    }

    /**
     * Extracts all connections from nodes
     */
    private static extractConnections(nodes: TreeNode[]): AIConnection[] {
        const connections: AIConnection[] = [];

        for (const node of nodes) {
            if (node.parent) {
                connections.push({
                    parentId: node.parent.id,
                    childId: node.id,
                    childIndex: node.parent.children.indexOf(node)
                });
            }
        }

        return connections;
    }

    /**
     * Serializes viewport state
     */
    private static serializeViewport(viewport: Viewport): AIViewport {
        return {
            offset: {
                x: viewport.offset.x,
                y: viewport.offset.y
            },
            zoom: viewport.zoom
        };
    }

    /**
     * Serializes execution state
     */
    private static serializeExecution(editorState: EditorState): AIExecutionState {
        const behaviorTree = editorState.behaviorTree;

        // Get blackboard data
        const blackboardData: Record<string, any> = {};
        if (behaviorTree.blackboard) {
            // Iterate through blackboard entries
            const entries = (behaviorTree.blackboard as any).data || {};
            for (const key in entries) {
                blackboardData[key] = entries[key];
            }
        }

        return {
            isRunning: behaviorTree.state === 'running',
            tickCount: behaviorTree.tickCount,
            blackboard: blackboardData,
            rootId: behaviorTree.root ? behaviorTree.root.id : null
        };
    }

    /**
     * Creates a human-readable summary of the tree state
     * Useful for AI to quickly understand the tree structure
     */
    public static createTextSummary(state: AITreeState): string {
        const lines: string[] = [];

        lines.push('=== Behavior Tree Summary ===');
        lines.push(`Total Nodes: ${state.metadata.totalNodes}`);
        lines.push(`Root Nodes: ${state.metadata.rootNodeCount}`);
        lines.push(`Selected: ${state.selectedNodeIds.length} node(s)`);
        lines.push(`Execution: ${state.execution.isRunning ? 'Running' : 'Stopped'} (${state.execution.tickCount} ticks)`);
        lines.push('');

        lines.push('=== Node Hierarchy ===');
        const rootNodes = state.nodes.filter(n => n.parentId === null);
        for (const root of rootNodes) {
            this.addNodeToSummary(root, state.nodes, lines, 0);
        }

        lines.push('');
        lines.push('=== Blackboard Data ===');
        const blackboardEntries = Object.entries(state.execution.blackboard);
        if (blackboardEntries.length === 0) {
            lines.push('(empty)');
        } else {
            for (const [key, value] of blackboardEntries) {
                lines.push(`${key}: ${JSON.stringify(value)}`);
            }
        }

        return lines.join('\n');
    }

    /**
     * Recursively adds node and children to summary
     */
    private static addNodeToSummary(
        node: AINode,
        allNodes: AINode[],
        lines: string[],
        depth: number
    ): void {
        const indent = '  '.repeat(depth);
        const statusIcon = this.getStatusIcon(node.status);
        const selected = node.childIds.length > 0 ? `[${node.childIds.length} children]` : '';

        lines.push(`${indent}${statusIcon} ${node.label} (${node.type}) ${selected}`);

        // Add children
        for (const childId of node.childIds) {
            const child = allNodes.find(n => n.id === childId);
            if (child) {
                this.addNodeToSummary(child, allNodes, lines, depth + 1);
            }
        }
    }

    /**
     * Gets a visual icon for node status
     */
    private static getStatusIcon(status: string): string {
        switch (status.toLowerCase()) {
            case 'success': return '✓';
            case 'failure': return '✗';
            case 'running': return '▶';
            case 'idle':
            default: return '○';
        }
    }
}
