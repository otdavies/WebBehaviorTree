import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { EditorState } from '../../src/state/EditorState.js';
import { SequenceNode } from '../../src/nodes/composites/SequenceNode.js';
import { ActionNode } from '../../src/nodes/leaves/ActionNode.js';
import { Vector2 } from '../../src/utils/Vector2.js';
import { registerDefaultNodes } from '../../src/core/DefaultNodes.js';

describe('EditorState', () => {
  let editorState: EditorState;

  beforeAll(() => {
    // Register default nodes for tests that use importTree
    registerDefaultNodes();
  });

  beforeEach(() => {
    editorState = new EditorState();
  });

  describe('Cycle Prevention', () => {
    it('prevents cycles in connections', () => {
      // Create a hierarchy: A -> B -> C
      const nodeA = new SequenceNode();
      nodeA.label = 'Node A';

      const nodeB = new SequenceNode();
      nodeB.label = 'Node B';

      const nodeC = new SequenceNode();
      nodeC.label = 'Node C';

      editorState.addNode(nodeA);
      editorState.addNode(nodeB);
      editorState.addNode(nodeC);

      // Connect A -> B
      const result1 = editorState.connectNodes(nodeA, nodeB);
      expect(result1.success).toBe(true);

      // Connect B -> C
      const result2 = editorState.connectNodes(nodeB, nodeC);
      expect(result2.success).toBe(true);

      // Verify hierarchy
      expect(nodeA.children).toContain(nodeB);
      expect(nodeB.children).toContain(nodeC);
      expect(nodeB.parent).toBe(nodeA);
      expect(nodeC.parent).toBe(nodeB);

      // Try to connect C -> A (would create cycle)
      const result3 = editorState.connectNodes(nodeC, nodeA);
      expect(result3.success).toBe(false);

      // C should not have A as child
      expect(nodeC.children).not.toContain(nodeA);
      expect(nodeA.parent).toBeNull();
    });

    it('prevents direct self-connection', () => {
      const node = new SequenceNode();
      editorState.addNode(node);

      // Try to connect node to itself - should throw error
      expect(() => {
        editorState.connectNodes(node, node);
      }).toThrow('Node cannot be its own child');

      expect(node.children).not.toContain(node);
    });

    it('prevents multi-level cycle creation', () => {
      // Create: A -> B -> C -> D
      const nodeA = new SequenceNode();
      const nodeB = new SequenceNode();
      const nodeC = new SequenceNode();
      const nodeD = new SequenceNode();

      editorState.addNode(nodeA);
      editorState.addNode(nodeB);
      editorState.addNode(nodeC);
      editorState.addNode(nodeD);

      editorState.connectNodes(nodeA, nodeB);
      editorState.connectNodes(nodeB, nodeC);
      editorState.connectNodes(nodeC, nodeD);

      // Try to connect D -> B (would create cycle)
      const result = editorState.connectNodes(nodeD, nodeB);
      expect(result.success).toBe(false);

      // B should still only have C as child
      expect(nodeD.children).not.toContain(nodeB);
    });
  });

  describe('Tree Serialization', () => {
    it('serialization round-trips correctly (toJSON -> fromJSON)', () => {
      // Create a behavior tree structure
      const root = new SequenceNode();
      root.label = 'Root Sequence';
      root.position = new Vector2(100, 100);

      const action1 = new ActionNode('Action 1');
      action1.position = new Vector2(50, 200);
      action1.code = 'return NodeStatus.SUCCESS;';

      const action2 = new ActionNode('Action 2');
      action2.position = new Vector2(150, 200);
      action2.code = 'blackboard.set("test", true); return NodeStatus.FAILURE;';

      root.addChild(action1);
      root.addChild(action2);

      editorState.addNode(root);
      editorState.addNode(action1);
      editorState.addNode(action2);
      editorState.behaviorTree.setRoot(root);

      // Serialize all nodes
      const serializedNodes = editorState.nodes.map(node => node.toJSON());

      // Create a new editor state and restore
      const newEditorState = new EditorState();

      // Create new nodes from serialized data
      const nodeMap = new Map<string, any>();

      // First pass: Create all nodes
      for (const nodeData of serializedNodes) {
        let newNode;
        if (nodeData.type === 'sequence') {
          newNode = new SequenceNode();
        } else if (nodeData.type === 'action') {
          newNode = new ActionNode();
        }

        if (newNode) {
          newNode.fromJSON(nodeData);
          nodeMap.set(newNode.id, newNode);
          newEditorState.addNode(newNode);
        }
      }

      // Second pass: Restore connections
      for (const nodeData of serializedNodes) {
        const node = nodeMap.get(nodeData.id);
        if (node && nodeData.children) {
          for (const childId of nodeData.children) {
            const child = nodeMap.get(childId);
            if (child) {
              node.addChild(child);
            }
          }
        }
      }

      // Set root
      const restoredRoot = nodeMap.get(root.id);
      newEditorState.behaviorTree.setRoot(restoredRoot);

      // Verify the structure
      expect(newEditorState.nodes.length).toBe(3);

      const restoredRootNode = newEditorState.behaviorTree.root;
      expect(restoredRootNode).toBeDefined();
      expect(restoredRootNode!.label).toBe('Root Sequence');
      expect(restoredRootNode!.children.length).toBe(2);

      const restoredAction1 = restoredRootNode!.children[0];
      const restoredAction2 = restoredRootNode!.children[1];

      expect(restoredAction1.label).toBe('Action 1');
      expect(restoredAction1.code).toBe('return NodeStatus.SUCCESS;');
      expect(restoredAction1.position.x).toBe(50);
      expect(restoredAction1.position.y).toBe(200);

      expect(restoredAction2.label).toBe('Action 2');
      expect(restoredAction2.code).toBe('blackboard.set("test", true); return NodeStatus.FAILURE;');
      expect(restoredAction2.position.x).toBe(150);
      expect(restoredAction2.position.y).toBe(200);
    });

    it('preserves node IDs during serialization', () => {
      const node1 = new ActionNode('Test');
      const originalId = node1.id;

      const serialized = node1.toJSON();
      expect(serialized.id).toBe(originalId);

      const node2 = new ActionNode('Test 2');
      node2.fromJSON(serialized);
      expect(node2.id).toBe(originalId);
    });

    it('preserves all node properties', () => {
      const action = new ActionNode('Complex Action');
      action.position = new Vector2(123, 456);
      action.code = 'console.log("test"); return NodeStatus.SUCCESS;';
      action.config.customProperty = 'customValue';

      // Add a parameter
      action.parameters.define('speed', {
        type: 'number',
        label: 'Speed',
        defaultValue: 10
      });
      action.parameters.set('speed', 25);

      const serialized = action.toJSON();

      const restored = new ActionNode();

      // Define the parameter before loading from JSON
      restored.parameters.define('speed', {
        type: 'number',
        label: 'Speed',
        defaultValue: 10
      });

      restored.fromJSON(serialized);

      expect(restored.label).toBe('Complex Action');
      expect(restored.position.x).toBe(123);
      expect(restored.position.y).toBe(456);
      expect(restored.code).toBe('console.log("test"); return NodeStatus.SUCCESS;');
      expect(restored.config.customProperty).toBe('customValue');
      expect(restored.parameters.get('speed')).toBe(25);
    });
  });

  describe('Node Management', () => {
    it('adds nodes correctly', () => {
      const node = new ActionNode('Test');
      editorState.addNode(node);

      expect(editorState.nodes).toContain(node);
      expect(editorState.nodes.length).toBe(1);
    });

    it('removes nodes correctly', () => {
      const node = new ActionNode('Test');
      editorState.addNode(node);

      editorState.removeNode(node);

      expect(editorState.nodes).not.toContain(node);
      expect(editorState.nodes.length).toBe(0);
    });

    it('finds nodes by ID', () => {
      const node = new ActionNode('Test');
      editorState.addNode(node);

      const found = editorState.findNodeById(node.id);

      expect(found).toBe(node);
    });

    it('returns null for non-existent ID', () => {
      const found = editorState.findNodeById('non-existent-id');
      expect(found).toBeNull();
    });

    it('removes node from tree when removed from editor', () => {
      const root = new SequenceNode();
      const child = new ActionNode('Child');

      root.addChild(child);

      editorState.addNode(root);
      editorState.addNode(child);
      editorState.behaviorTree.setRoot(root);

      // Remove root
      editorState.removeNode(root);

      expect(editorState.behaviorTree.root).toBeNull();
    });

    it('disconnects child from parent when removed', () => {
      const parent = new SequenceNode();
      const child = new ActionNode('Child');

      parent.addChild(child);

      editorState.addNode(parent);
      editorState.addNode(child);

      // Remove child
      editorState.removeNode(child);

      expect(parent.children).not.toContain(child);
      expect(child.parent).toBeNull();
    });
  });

  describe('Connection Management', () => {
    it('updates parent-child relationships', () => {
      const parent = new SequenceNode();
      const child = new ActionNode('Child');

      editorState.addNode(parent);
      editorState.addNode(child);

      editorState.connectNodes(parent, child);

      expect(parent.children).toContain(child);
      expect(child.parent).toBe(parent);
    });

    it('removes child from previous parent when reparented', () => {
      const parent1 = new SequenceNode();
      const parent2 = new SequenceNode();
      const child = new ActionNode('Child');

      editorState.addNode(parent1);
      editorState.addNode(parent2);
      editorState.addNode(child);

      // Connect to parent1
      editorState.connectNodes(parent1, child);
      expect(parent1.children).toContain(child);

      // Connect to parent2
      editorState.connectNodes(parent2, child);
      expect(parent2.children).toContain(child);
      expect(parent1.children).not.toContain(child);
      expect(child.parent).toBe(parent2);
    });

    it('disconnects nodes correctly', () => {
      const parent = new SequenceNode();
      const child = new ActionNode('Child');

      parent.addChild(child);

      editorState.disconnectNode(child);

      expect(parent.children).not.toContain(child);
      expect(child.parent).toBeNull();
    });
  });

  describe('Undo/Redo Graph State', () => {
    it('can undo and redo adding connections', () => {
      const parent = new SequenceNode();
      const child = new ActionNode('Child');

      editorState.addNode(parent);
      editorState.addNode(child);

      // Create a simple command to connect nodes
      const connectCommand = {
        description: 'Connect nodes',
        execute: () => {
          editorState.connectNodes(parent, child);
        },
        undo: () => {
          editorState.disconnectNode(child);
        }
      };

      // Execute command
      editorState.commandHistory.execute(connectCommand);

      // Verify connection
      expect(parent.children).toContain(child);
      expect(child.parent).toBe(parent);

      // Undo
      editorState.commandHistory.undo();
      expect(parent.children).not.toContain(child);
      expect(child.parent).toBeNull();

      // Redo
      editorState.commandHistory.redo();
      expect(parent.children).toContain(child);
      expect(child.parent).toBe(parent);
    });

    it('can undo and redo adding nodes', () => {
      const node = new ActionNode('Test Node');

      // Create command to add node
      const addCommand = {
        description: 'Add node',
        execute: () => {
          editorState.addNode(node);
        },
        undo: () => {
          editorState.removeNode(node);
        }
      };

      // Execute
      editorState.commandHistory.execute(addCommand);
      expect(editorState.nodes).toContain(node);

      // Undo
      editorState.commandHistory.undo();
      expect(editorState.nodes).not.toContain(node);

      // Redo
      editorState.commandHistory.redo();
      expect(editorState.nodes).toContain(node);
    });

    it('clears redo stack when new command is executed after undo', () => {
      const node1 = new ActionNode('Node 1');
      const node2 = new ActionNode('Node 2');

      const addCommand1 = {
        description: 'Add node 1',
        execute: () => editorState.addNode(node1),
        undo: () => editorState.removeNode(node1)
      };

      const addCommand2 = {
        description: 'Add node 2',
        execute: () => editorState.addNode(node2),
        undo: () => editorState.removeNode(node2)
      };

      // Execute first command
      editorState.commandHistory.execute(addCommand1);
      expect(editorState.commandHistory.canUndo()).toBe(true);
      expect(editorState.commandHistory.canRedo()).toBe(false);

      // Undo it
      editorState.commandHistory.undo();
      expect(editorState.commandHistory.canRedo()).toBe(true);

      // Execute a new command - should clear redo stack
      editorState.commandHistory.execute(addCommand2);
      expect(editorState.commandHistory.canRedo()).toBe(false);
      expect(editorState.nodes).toContain(node2);
      expect(editorState.nodes).not.toContain(node1);
    });

    it('maintains graph state through multiple undo/redo operations', () => {
      const root = new SequenceNode();
      const child1 = new ActionNode('Child 1');
      const child2 = new ActionNode('Child 2');

      editorState.addNode(root);
      editorState.addNode(child1);
      editorState.addNode(child2);

      // Connect child1
      const connectCommand1 = {
        description: 'Connect child 1',
        execute: () => editorState.connectNodes(root, child1),
        undo: () => editorState.disconnectNode(child1)
      };

      // Connect child2
      const connectCommand2 = {
        description: 'Connect child 2',
        execute: () => editorState.connectNodes(root, child2),
        undo: () => editorState.disconnectNode(child2)
      };

      // Execute both
      editorState.commandHistory.execute(connectCommand1);
      editorState.commandHistory.execute(connectCommand2);

      expect(root.children.length).toBe(2);
      expect(root.children).toContain(child1);
      expect(root.children).toContain(child2);

      // Undo both
      editorState.commandHistory.undo();
      expect(root.children.length).toBe(1);
      expect(root.children).toContain(child1);

      editorState.commandHistory.undo();
      expect(root.children.length).toBe(0);

      // Redo both
      editorState.commandHistory.redo();
      expect(root.children.length).toBe(1);
      expect(root.children).toContain(child1);

      editorState.commandHistory.redo();
      expect(root.children.length).toBe(2);
      expect(root.children).toContain(child1);
      expect(root.children).toContain(child2);
    });
  });

  describe('Disconnected Nodes', () => {
    it('can save and load disconnected nodes (nodes not in tree)', () => {
      const root = new SequenceNode();
      root.label = 'Connected Root';
      root.position = new Vector2(100, 100);

      const connectedChild = new ActionNode('Connected Child');
      connectedChild.position = new Vector2(100, 200);
      connectedChild.code = 'return NodeStatus.SUCCESS;';

      const disconnectedNode1 = new ActionNode('Disconnected 1');
      disconnectedNode1.position = new Vector2(300, 100);
      disconnectedNode1.code = 'return NodeStatus.FAILURE;';

      const disconnectedNode2 = new SequenceNode();
      disconnectedNode2.label = 'Disconnected 2';
      disconnectedNode2.position = new Vector2(300, 200);

      // Add all nodes
      editorState.addNode(root);
      editorState.addNode(connectedChild);
      editorState.addNode(disconnectedNode1);
      editorState.addNode(disconnectedNode2);

      // Connect only root and child
      root.addChild(connectedChild);
      editorState.behaviorTree.setRoot(root);

      // Verify initial state
      expect(editorState.nodes.length).toBe(4);
      expect(editorState.behaviorTree.getAllNodes().length).toBe(2); // Only root and connected child

      // Serialize all nodes
      const serializedNodes = editorState.nodes.map(node => node.toJSON());

      // Create tree data structure (only connected nodes)
      const treeData = {
        version: '1.0',
        tree: {
          nodes: serializedNodes.filter(n =>
            n.id === root.id || n.id === connectedChild.id
          ),
          root: root.id
        }
      };

      // Clear and reload
      editorState.clearAll();
      expect(editorState.nodes.length).toBe(0);

      // Restore all nodes manually (simulating full editor state save/load)
      const nodeMap = new Map<string, any>();

      // First pass: Create all nodes
      for (const nodeData of serializedNodes) {
        let newNode;
        if (nodeData.type === 'sequence') {
          newNode = new SequenceNode();
        } else if (nodeData.type === 'action') {
          newNode = new ActionNode();
        }

        if (newNode) {
          newNode.fromJSON(nodeData);
          nodeMap.set(newNode.id, newNode);
          editorState.addNode(newNode);
        }
      }

      // Second pass: Restore connections (only for connected nodes)
      for (const nodeData of serializedNodes) {
        const node = nodeMap.get(nodeData.id);
        if (node && nodeData.children) {
          for (const childId of nodeData.children) {
            const child = nodeMap.get(childId);
            if (child) {
              node.addChild(child);
            }
          }
        }
      }

      // Set root
      const restoredRoot = nodeMap.get(root.id);
      editorState.behaviorTree.setRoot(restoredRoot);

      // Verify all nodes were restored
      expect(editorState.nodes.length).toBe(4);

      // Verify connected nodes
      const connectedNodes = editorState.behaviorTree.getAllNodes();
      expect(connectedNodes.length).toBe(2);

      // Verify disconnected nodes are in editor but not in tree
      const restoredDisconnected1 = nodeMap.get(disconnectedNode1.id);
      const restoredDisconnected2 = nodeMap.get(disconnectedNode2.id);

      expect(editorState.nodes).toContain(restoredDisconnected1);
      expect(editorState.nodes).toContain(restoredDisconnected2);
      expect(connectedNodes).not.toContain(restoredDisconnected1);
      expect(connectedNodes).not.toContain(restoredDisconnected2);

      // Verify properties are preserved
      expect(restoredDisconnected1.label).toBe('Disconnected 1');
      expect(restoredDisconnected1.code).toBe('return NodeStatus.FAILURE;');
      expect(restoredDisconnected2.label).toBe('Disconnected 2');
    });

    it('preserves disconnected nodes when replacing tree', () => {
      // Create disconnected nodes in editor
      const disconnectedNode = new ActionNode('Disconnected');
      disconnectedNode.position = new Vector2(500, 500);
      editorState.addNode(disconnectedNode);

      expect(editorState.nodes.length).toBe(1);

      // Manually create and set a new tree (simulating import without NodeRegistry dependency)
      const newRoot = new SequenceNode();
      newRoot.label = 'New Root';
      newRoot.position = new Vector2(100, 100);

      const newChild = new ActionNode('New Child');
      newChild.position = new Vector2(100, 200);
      newChild.code = 'return NodeStatus.SUCCESS;';

      newRoot.addChild(newChild);

      // Get currently disconnected nodes
      const connectedNodes = editorState.behaviorTree.getAllNodes();
      const currentDisconnected = editorState.nodes.filter(node =>
        !connectedNodes.includes(node) && !node.parent
      );

      expect(currentDisconnected.length).toBe(1);
      expect(currentDisconnected[0]).toBe(disconnectedNode);

      // Replace tree with new tree
      editorState.behaviorTree.setRoot(newRoot);
      const newConnected = editorState.behaviorTree.getAllNodes();

      // Merge: new tree nodes + preserved disconnected nodes
      editorState.nodes = [...newConnected, ...currentDisconnected];
      editorState.behaviorTree.setAllNodes(editorState.nodes);

      // Should have new tree nodes + disconnected node
      expect(editorState.nodes.length).toBe(3); // newRoot, newChild, disconnectedNode

      // Disconnected node should still be present
      const foundDisconnected = editorState.nodes.find(n => n.id === disconnectedNode.id);
      expect(foundDisconnected).toBeDefined();
      expect(foundDisconnected?.label).toBe('Disconnected');

      // New tree should be set as root
      expect(editorState.behaviorTree.root).toBe(newRoot);
      expect(editorState.behaviorTree.root?.label).toBe('New Root');

      // Verify disconnected node is NOT in the tree
      expect(newConnected).not.toContain(disconnectedNode);
    });

    it('handles nodes that never execute (not connected to root)', () => {
      const root = new SequenceNode();
      const connectedChild = new ActionNode('Connected');
      connectedChild.code = 'blackboard.set("connected", true); return NodeStatus.SUCCESS;';

      const orphanNode = new ActionNode('Orphan');
      orphanNode.code = 'blackboard.set("orphan", true); return NodeStatus.SUCCESS;';

      editorState.addNode(root);
      editorState.addNode(connectedChild);
      editorState.addNode(orphanNode);

      // Only connect root and connectedChild
      root.addChild(connectedChild);
      editorState.behaviorTree.setRoot(root);

      // Execute tree
      const blackboard = editorState.behaviorTree.blackboard;
      editorState.behaviorTree.tick();

      // Connected child should have executed
      expect(blackboard.get('connected')).toBe(true);

      // Orphan node should NOT have executed
      expect(blackboard.has('orphan')).toBe(false);

      // All nodes should still be in editor
      expect(editorState.nodes.length).toBe(3);
      expect(editorState.nodes).toContain(orphanNode);
    });

    it('importTree preserves disconnected nodes from JSON', () => {
      // Create a tree with connected and disconnected nodes
      const root = new SequenceNode();
      root.label = 'Root';
      root.position = new Vector2(0, 0);

      const connectedChild = new ActionNode('Connected');
      connectedChild.position = new Vector2(0, 100);
      connectedChild.code = 'return NodeStatus.SUCCESS;';

      const disconnectedNode1 = new ActionNode('Disconnected 1');
      disconnectedNode1.position = new Vector2(200, 0);
      disconnectedNode1.code = 'return NodeStatus.FAILURE;';

      const disconnectedNode2 = new SequenceNode();
      disconnectedNode2.label = 'Disconnected 2';
      disconnectedNode2.position = new Vector2(200, 100);

      // Add all nodes to editor
      editorState.addNode(root);
      editorState.addNode(connectedChild);
      editorState.addNode(disconnectedNode1);
      editorState.addNode(disconnectedNode2);

      // Connect only root and child
      root.addChild(connectedChild);
      editorState.behaviorTree.setRoot(root);

      // Verify initial state
      expect(editorState.nodes.length).toBe(4);
      expect(editorState.behaviorTree.getAllNodes().length).toBe(2);

      // Create JSON export (simulating save)
      const exportData = {
        version: '1.1',
        metadata: {
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          nodeCount: editorState.nodes.length,
        },
        tree: {
          nodes: editorState.nodes.map(node => node.toJSON()),
          root: root.id
        },
        blackboard: {
          initialValues: {}
        }
      };

      // Clear editor
      editorState.clearAll();
      expect(editorState.nodes.length).toBe(0);

      // Import tree (this should restore ALL nodes)
      editorState.importTree(exportData);

      // Verify all nodes were restored
      expect(editorState.nodes.length).toBe(4);

      // Verify connected nodes are in the tree
      const connectedNodes = editorState.behaviorTree.getAllNodes();
      expect(connectedNodes.length).toBe(2);

      // Find restored nodes
      const restoredRoot = editorState.findNodeById(root.id);
      const restoredConnected = editorState.findNodeById(connectedChild.id);
      const restoredDisconnected1 = editorState.findNodeById(disconnectedNode1.id);
      const restoredDisconnected2 = editorState.findNodeById(disconnectedNode2.id);

      // All nodes should be found
      expect(restoredRoot).not.toBeNull();
      expect(restoredConnected).not.toBeNull();
      expect(restoredDisconnected1).not.toBeNull();
      expect(restoredDisconnected2).not.toBeNull();

      // Verify tree structure
      expect(editorState.behaviorTree.root).toBe(restoredRoot);
      expect(restoredRoot?.children).toContain(restoredConnected);

      // Verify disconnected nodes are in editor but not in tree
      expect(connectedNodes).not.toContain(restoredDisconnected1);
      expect(connectedNodes).not.toContain(restoredDisconnected2);

      // Verify properties are preserved
      expect(restoredDisconnected1?.label).toBe('Disconnected 1');
      expect(restoredDisconnected1?.code).toBe('return NodeStatus.FAILURE;');
      expect(restoredDisconnected2?.label).toBe('Disconnected 2');
    });
  });
});
