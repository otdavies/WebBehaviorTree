import { describe, it, expect, beforeEach } from 'vitest';
import { PortCache } from '../../src/editor/PortCache.js';
import { NodeRenderer } from '../../src/editor/NodeRenderer.js';
import { Vector2 } from '../../src/utils/Vector2.js';
import { NodeRegistry } from '../../src/core/NodeRegistry.js';
import { registerDefaultNodes } from '../../src/core/DefaultNodes.js';

// Register default nodes for testing
registerDefaultNodes();

describe('PortCache', () => {
    let portCache: PortCache;
    let nodeRenderer: NodeRenderer;

    beforeEach(() => {
        nodeRenderer = new NodeRenderer();
        portCache = new PortCache(nodeRenderer);
    });

    describe('Basic functionality', () => {
        it('should be invalid initially', () => {
            expect(portCache.isValidCache()).toBe(false);
        });

        it('should become valid after rebuild', () => {
            const nodes = [
                NodeRegistry.create('sequence')!,
                NodeRegistry.create('action')!
            ];
            nodes[0].position = new Vector2(0, 0);
            nodes[1].position = new Vector2(100, 100);

            portCache.rebuild(nodes, 1.0);

            expect(portCache.isValidCache()).toBe(true);
        });

        it('should invalidate when requested', () => {
            const nodes = [NodeRegistry.create('action')!];
            nodes[0].position = new Vector2(0, 0);

            portCache.rebuild(nodes, 1.0);
            expect(portCache.isValidCache()).toBe(true);

            portCache.invalidate();
            expect(portCache.isValidCache()).toBe(false);
        });
    });

    describe('Port hit testing', () => {
        it('should find input port on a node', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(0, 0);

            portCache.rebuild([node], 1.0);

            // Input port is at top center of node
            const inputPortPos = nodeRenderer.getInputPortPosition(node, node.position);
            const result = portCache.getPortAtPoint(inputPortPos);

            expect(result).not.toBeNull();
            expect(result?.node).toBe(node);
            expect(result?.port.type).toBe('input');
        });

        it('should find output port on a composite node', () => {
            const parent = NodeRegistry.create('sequence')!;
            const child = NodeRegistry.create('action')!;
            parent.position = new Vector2(0, 0);
            child.position = new Vector2(100, 100);
            parent.addChild(child);

            portCache.rebuild([parent, child], 1.0);

            // Get first output port position
            const outputPorts = nodeRenderer.getOutputPortPositions(
                parent,
                parent.position,
                parent.children.length,
                true
            );
            const result = portCache.getPortAtPoint(outputPorts[0]);

            expect(result).not.toBeNull();
            expect(result?.node).toBe(parent);
            expect(result?.port.type).toBe('output');
            expect(result?.port.index).toBe(0);
        });

        it('should return null for empty space', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(0, 0);

            portCache.rebuild([node], 1.0);

            // Query a position far from any ports
            const result = portCache.getPortAtPoint(new Vector2(1000, 1000));

            expect(result).toBeNull();
        });

        it('should return null when cache is invalid', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(0, 0);

            // Don't rebuild cache

            const inputPortPos = nodeRenderer.getInputPortPosition(node, node.position);
            const result = portCache.getPortAtPoint(inputPortPos);

            expect(result).toBeNull();
        });
    });

    describe('Multiple nodes', () => {
        it('should handle multiple nodes with ports', () => {
            const node1 = NodeRegistry.create('action')!;
            const node2 = NodeRegistry.create('action')!;
            node1.position = new Vector2(0, 0);
            node2.position = new Vector2(200, 0);

            portCache.rebuild([node1, node2], 1.0);

            // Find port on first node
            const port1Pos = nodeRenderer.getInputPortPosition(node1, node1.position);
            const result1 = portCache.getPortAtPoint(port1Pos);
            expect(result1?.node).toBe(node1);

            // Find port on second node
            const port2Pos = nodeRenderer.getInputPortPosition(node2, node2.position);
            const result2 = portCache.getPortAtPoint(port2Pos);
            expect(result2?.node).toBe(node2);
        });

        it('should handle nodes with multiple output ports', () => {
            const parent = NodeRegistry.create('sequence')!;
            const child1 = NodeRegistry.create('action')!;
            const child2 = NodeRegistry.create('action')!;

            parent.position = new Vector2(0, 0);
            child1.position = new Vector2(-100, 100);
            child2.position = new Vector2(100, 100);

            parent.addChild(child1);
            parent.addChild(child2);

            portCache.rebuild([parent, child1, child2], 1.0);

            const outputPorts = nodeRenderer.getOutputPortPositions(
                parent,
                parent.position,
                parent.children.length,
                true
            );

            // Find first output port
            const result1 = portCache.getPortAtPoint(outputPorts[0]);
            expect(result1?.node).toBe(parent);
            expect(result1?.port.index).toBe(0);

            // Find second output port
            const result2 = portCache.getPortAtPoint(outputPorts[1]);
            expect(result2?.node).toBe(parent);
            expect(result2?.port.index).toBe(1);
        });
    });

    describe('Add port detection', () => {
        it('should detect add port on composite node with room for more children', () => {
            const parent = NodeRegistry.create('sequence')!;
            const child = NodeRegistry.create('action')!;
            parent.position = new Vector2(0, 0);
            child.position = new Vector2(0, 100);
            parent.addChild(child);

            portCache.rebuild([parent, child], 1.0);

            // Sequence nodes can have unlimited children, so should have an add port
            const outputPorts = nodeRenderer.getOutputPortPositions(
                parent,
                parent.position,
                parent.children.length,
                true // hasAddPort
            );

            // The add port should be after the existing children
            const addPortPos = outputPorts[parent.children.length];
            const result = portCache.getPortAtPoint(addPortPos);

            expect(result).not.toBeNull();
            expect(result?.node).toBe(parent);
            expect(result?.port.type).toBe('output');
            expect(result?.port.isAddPort).toBe(true);
        });
    });

    describe('Spatial indexing performance', () => {
        it('should handle many nodes efficiently', () => {
            const nodes = [];
            const gridSize = 10;

            // Create a grid of nodes
            for (let x = 0; x < gridSize; x++) {
                for (let y = 0; y < gridSize; y++) {
                    const node = NodeRegistry.create('action')!;
                    node.position = new Vector2(x * 200, y * 200);
                    nodes.push(node);
                }
            }

            // Rebuild cache
            const startTime = performance.now();
            portCache.rebuild(nodes, 1.0);
            const rebuildTime = performance.now() - startTime;

            // Query should be fast (much faster than O(n) iteration)
            const queryStartTime = performance.now();
            const inputPos = nodeRenderer.getInputPortPosition(nodes[50], nodes[50].position);
            const result = portCache.getPortAtPoint(inputPos);
            const queryTime = performance.now() - queryStartTime;

            expect(result?.node).toBe(nodes[50]);

            // Log performance metrics (for manual inspection)
            console.log(`Rebuild time for ${nodes.length} nodes: ${rebuildTime.toFixed(2)}ms`);
            console.log(`Query time: ${queryTime.toFixed(2)}ms`);

            // Query should be very fast (< 1ms even for 100 nodes)
            expect(queryTime).toBeLessThan(5);
        });

        it('should provide useful statistics', () => {
            const nodes = [
                NodeRegistry.create('sequence')!,
                NodeRegistry.create('action')!
            ];
            nodes[0].position = new Vector2(0, 0);
            nodes[1].position = new Vector2(100, 100);

            portCache.rebuild(nodes, 1.0);

            const stats = portCache.getStats();

            expect(stats.totalCells).toBeGreaterThan(0);
            expect(stats.totalPorts).toBeGreaterThan(0);
            expect(stats.avgPortsPerCell).toBeGreaterThan(0);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty node list', () => {
            portCache.rebuild([], 1.0);

            expect(portCache.isValidCache()).toBe(true);

            const result = portCache.getPortAtPoint(new Vector2(0, 0));
            expect(result).toBeNull();
        });

        it('should handle nodes at origin', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(0, 0);

            portCache.rebuild([node], 1.0);

            const inputPos = nodeRenderer.getInputPortPosition(node, node.position);
            const result = portCache.getPortAtPoint(inputPos);

            expect(result?.node).toBe(node);
        });

        it('should handle nodes with negative coordinates', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(-500, -300);

            portCache.rebuild([node], 1.0);

            const inputPos = nodeRenderer.getInputPortPosition(node, node.position);
            const result = portCache.getPortAtPoint(inputPos);

            expect(result?.node).toBe(node);
        });

        it('should handle different zoom levels', () => {
            const node = NodeRegistry.create('action')!;
            node.position = new Vector2(0, 0);

            // Test with different zoom levels
            const zoomLevels = [0.5, 1.0, 2.0];

            for (const zoom of zoomLevels) {
                portCache.rebuild([node], zoom);

                const inputPos = nodeRenderer.getInputPortPosition(node, node.position);
                const result = portCache.getPortAtPoint(inputPos);

                expect(result?.node).toBe(node);
            }
        });
    });
});
