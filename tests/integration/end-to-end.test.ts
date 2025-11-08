import { describe, it, expect, beforeAll } from 'vitest';
import { BehaviorTree } from '../../src/core/BehaviorTree.js';
import { EditorState } from '../../src/state/EditorState.js';
import { registerDefaultNodes } from '../../src/core/DefaultNodes.js';
import { NodeRegistry } from '../../src/core/NodeRegistry.js';
import { NodeStatus } from '../../src/core/NodeStatus.js';

/**
 * Integration Tests - End-to-End Workflows
 *
 * These tests validate complete user workflows:
 * - Build tree in editor
 * - Export to JSON
 * - Import in new session
 * - Execute and verify behavior
 *
 * This is what ACTUALLY matters to users.
 */
describe('Integration Tests - End-to-End', () => {
  beforeAll(() => {
    registerDefaultNodes();
  });

  describe('Export → Import → Execute Workflow', () => {
    it('builds tree, exports to JSON, imports it, and executes correctly', async () => {
      // STEP 1: Build a tree in the editor (simulating user actions)
      const editorState = new EditorState();

      // Create a simple AI: Sequence(Check Enemy, Attack)
      const sequenceNode = NodeRegistry.create('sequence');
      sequenceNode.label = 'Combat AI';
      sequenceNode.position.x = 200;
      sequenceNode.position.y = 300;

      const checkEnemy = NodeRegistry.create('action');
      checkEnemy.label = 'Check Enemy in Range';
      checkEnemy.position.x = 400;
      checkEnemy.position.y = 200;
      checkEnemy.code = `
        const enemyDistance = blackboard.get('enemyDistance');
        if (enemyDistance < 10) {
          blackboard.set('enemyInRange', true);
          return NodeStatus.SUCCESS;
        }
        return NodeStatus.FAILURE;
      `;

      const attackNode = NodeRegistry.create('action');
      attackNode.label = 'Attack Enemy';
      attackNode.position.x = 400;
      attackNode.position.y = 400;
      attackNode.code = `
        const damage = 10;
        const currentDamage = blackboard.get('totalDamage') || 0;
        blackboard.set('totalDamage', currentDamage + damage);
        return NodeStatus.SUCCESS;
      `;

      editorState.addNode(sequenceNode);
      editorState.addNode(checkEnemy);
      editorState.addNode(attackNode);

      editorState.connectNodes(sequenceNode, checkEnemy);
      editorState.connectNodes(sequenceNode, attackNode);

      // Set as root
      editorState.behaviorTree.setRoot(sequenceNode);
      editorState.behaviorTree.setAllNodes([sequenceNode, checkEnemy, attackNode]);

      // STEP 2: Export to JSON
      const exported = editorState.behaviorTree.toJSON();

      // Verify export structure
      expect(exported.version).toBeDefined();
      expect(exported.tree.nodes).toHaveLength(3);
      expect(exported.tree.root).toBe(sequenceNode.id);

      // STEP 3: Clear editor (simulate new session)
      const newEditorState = new EditorState();
      expect(newEditorState.nodes).toHaveLength(0);

      // STEP 4: Import the JSON
      newEditorState.behaviorTree.fromJSON(exported, (type) => NodeRegistry.create(type));

      // Verify structure was preserved
      const importedRoot = newEditorState.behaviorTree.root;
      expect(importedRoot).toBeDefined();
      expect(importedRoot!.label).toBe('Combat AI');
      expect(importedRoot!.children).toHaveLength(2);

      // STEP 5: Execute the imported tree
      const blackboard = newEditorState.behaviorTree.blackboard;

      // Scenario 1: Enemy out of range - should fail
      blackboard.set('enemyDistance', 100);
      let status = await newEditorState.behaviorTree.tick();
      expect(status).toBe(NodeStatus.FAILURE);
      expect(blackboard.get('totalDamage')).toBeUndefined(); // No attack

      // Scenario 2: Enemy in range - should attack
      blackboard.set('enemyDistance', 5);
      status = await newEditorState.behaviorTree.tick();
      expect(status).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('enemyInRange')).toBe(true);
      expect(blackboard.get('totalDamage')).toBe(10);

      // Scenario 3: Second attack
      status = await newEditorState.behaviorTree.tick();
      expect(status).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('totalDamage')).toBe(20); // Accumulated
    });
  });

  describe('Real-World AI Scenarios', () => {
    it('implements enemy patrol and combat AI', async () => {
      // Build a realistic enemy AI tree
      const editorState = new EditorState();

      // Root: Selector (try combat first, fallback to patrol)
      const rootSelector = NodeRegistry.create('selector');
      rootSelector.label = 'Enemy AI';

      // Combat branch: Sequence(Detect Player, Chase, Attack)
      const combatSequence = NodeRegistry.create('sequence');
      combatSequence.label = 'Combat';

      const detectPlayer = NodeRegistry.create('action');
      detectPlayer.label = 'Detect Player';
      detectPlayer.code = `
        const playerDistance = blackboard.get('playerDistance');
        const detectionRange = 15;
        if (playerDistance <= detectionRange) {
          blackboard.set('playerDetected', true);
          blackboard.set('currentBehavior', 'combat');
          return NodeStatus.SUCCESS;
        }
        return NodeStatus.FAILURE;
      `;

      const chasePlayer = NodeRegistry.create('action');
      chasePlayer.label = 'Chase Player';
      chasePlayer.code = `
        const playerDistance = blackboard.get('playerDistance');
        const attackRange = 2;
        if (playerDistance > attackRange) {
          // Move closer (simulate)
          blackboard.set('isChasing', true);
          return NodeStatus.RUNNING; // Still chasing
        }
        blackboard.set('isChasing', false);
        return NodeStatus.SUCCESS; // In attack range
      `;

      const attack = NodeRegistry.create('action');
      attack.label = 'Attack';
      attack.code = `
        const attackCount = blackboard.get('attackCount') || 0;
        blackboard.set('attackCount', attackCount + 1);
        return NodeStatus.SUCCESS;
      `;

      // Patrol branch: Sequence(Move to Waypoint, Wait)
      const patrolSequence = NodeRegistry.create('sequence');
      patrolSequence.label = 'Patrol';

      const moveToWaypoint = NodeRegistry.create('action');
      moveToWaypoint.label = 'Move to Waypoint';
      moveToWaypoint.code = `
        blackboard.set('currentBehavior', 'patrol');
        const waypointIndex = blackboard.get('waypointIndex') || 0;
        blackboard.set('waypointIndex', (waypointIndex + 1) % 3);
        return NodeStatus.SUCCESS;
      `;

      const patrolComplete = NodeRegistry.create('action');
      patrolComplete.label = 'Patrol Complete';
      patrolComplete.code = `return NodeStatus.SUCCESS;`;

      // Build tree structure
      editorState.addNode(rootSelector);
      editorState.addNode(combatSequence);
      editorState.addNode(detectPlayer);
      editorState.addNode(chasePlayer);
      editorState.addNode(attack);
      editorState.addNode(patrolSequence);
      editorState.addNode(moveToWaypoint);
      editorState.addNode(patrolComplete);

      editorState.connectNodes(rootSelector, combatSequence);
      editorState.connectNodes(rootSelector, patrolSequence);

      editorState.connectNodes(combatSequence, detectPlayer);
      editorState.connectNodes(combatSequence, chasePlayer);
      editorState.connectNodes(combatSequence, attack);

      editorState.connectNodes(patrolSequence, moveToWaypoint);
      editorState.connectNodes(patrolSequence, patrolComplete);

      editorState.behaviorTree.setRoot(rootSelector);
      editorState.behaviorTree.setAllNodes([
        rootSelector, combatSequence, detectPlayer, chasePlayer, attack,
        patrolSequence, moveToWaypoint, patrolComplete
      ]);

      const blackboard = editorState.behaviorTree.blackboard;

      // SCENARIO 1: Player far away - should patrol
      blackboard.set('playerDistance', 100);

      let status = await editorState.behaviorTree.tick();
      expect(blackboard.get('currentBehavior')).toBe('patrol');
      expect(blackboard.get('waypointIndex')).toBe(1);

      // Reset tree before next scenario
      editorState.behaviorTree.reset();
      blackboard.set('waypointIndex', 0); // Reset patrol state

      // SCENARIO 2: Player approaches - should detect
      blackboard.set('playerDistance', 10);

      status = await editorState.behaviorTree.tick();
      expect(blackboard.get('playerDetected')).toBe(true);
      expect(blackboard.get('currentBehavior')).toBe('combat');
      expect(blackboard.get('isChasing')).toBe(true); // Too far to attack

      // SCENARIO 3: Player in attack range - should attack
      blackboard.set('playerDistance', 1.5);

      status = await editorState.behaviorTree.tick();
      expect(blackboard.get('attackCount')).toBe(1);
      expect(blackboard.get('isChasing')).toBe(false);

      // SCENARIO 4: Player leaves - should return to patrol
      blackboard.set('playerDistance', 100);
      blackboard.clear(); // Reset blackboard

      status = await editorState.behaviorTree.tick();
      expect(blackboard.get('currentBehavior')).toBe('patrol');
      expect(blackboard.has('attackCount')).toBe(false); // New patrol state
    });
  });

  describe('Unity SDK Integration', () => {
    it('exports tree compatible with Unity SDK format', () => {
      const editorState = new EditorState();

      // Create simple tree
      const sequence = NodeRegistry.create('sequence');
      const action1 = NodeRegistry.create('action');
      action1.label = 'Move to Waypoint';
      action1.code = '// Unity implementation';

      const action2 = NodeRegistry.create('action');
      action2.label = 'Wait';
      action2.code = '// Unity implementation';

      editorState.addNode(sequence);
      editorState.addNode(action1);
      editorState.addNode(action2);

      editorState.connectNodes(sequence, action1);
      editorState.connectNodes(sequence, action2);

      editorState.behaviorTree.setRoot(sequence);
      editorState.behaviorTree.setAllNodes([sequence, action1, action2]);

      // Export
      const exported = editorState.behaviorTree.toJSON();

      // Verify Unity SDK compatibility
      expect(exported.version).toBeDefined();
      expect(exported.tree.nodes).toBeDefined();
      expect(exported.tree.root).toBeDefined();
      expect(exported.blackboard).toBeDefined();

      // Each node should have required fields for Unity
      exported.tree.nodes.forEach(node => {
        expect(node.id).toBeDefined();
        expect(node.type).toBeDefined();
        expect(node.label).toBeDefined();
        expect(node.category).toBeDefined();
        expect(node.children).toBeDefined();
      });

      // Action nodes should have label for Unity registration
      const actionNodes = exported.tree.nodes.filter(n => n.type === 'action');
      actionNodes.forEach(action => {
        expect(action.label).toBeTruthy();
        expect(action.label.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Multi-Tree Coordination', () => {
    it('handles multiple behavior trees with shared blackboard', async () => {
      // Two AI agents with separate trees but shared world state
      const agent1Tree = new BehaviorTree();
      const agent2Tree = new BehaviorTree();

      // Shared blackboard for world state
      const worldBlackboard = agent1Tree.blackboard;
      agent2Tree.blackboard = worldBlackboard; // Share blackboard

      // Agent 1: Claims resource
      const agent1Action = NodeRegistry.create('action');
      agent1Action.code = `
        const resourceClaimed = blackboard.get('resourceClaimed');
        if (!resourceClaimed) {
          blackboard.set('resourceClaimed', 'agent1');
          return NodeStatus.SUCCESS;
        }
        return NodeStatus.FAILURE;
      `;
      agent1Tree.setRoot(agent1Action);

      // Agent 2: Also tries to claim resource
      const agent2Action = NodeRegistry.create('action');
      agent2Action.code = `
        const resourceClaimed = blackboard.get('resourceClaimed');
        if (!resourceClaimed) {
          blackboard.set('resourceClaimed', 'agent2');
          return NodeStatus.SUCCESS;
        }
        return NodeStatus.FAILURE;
      `;
      agent2Tree.setRoot(agent2Action);

      // Agent 1 claims resource first
      const status1 = await agent1Tree.tick();
      expect(status1).toBe(NodeStatus.SUCCESS);
      expect(worldBlackboard.get('resourceClaimed')).toBe('agent1');

      // Agent 2 tries to claim - should fail
      const status2 = await agent2Tree.tick();
      expect(status2).toBe(NodeStatus.FAILURE);
      expect(worldBlackboard.get('resourceClaimed')).toBe('agent1'); // Still agent1
    });
  });

  describe('Performance and Scale', () => {
    it('handles tree with 100+ nodes efficiently', async () => {
      const editorState = new EditorState();

      // Create a large tree
      const root = NodeRegistry.create('selector');
      editorState.addNode(root);

      // Add 100 branches
      for (let i = 0; i < 100; i++) {
        const sequence = NodeRegistry.create('sequence');
        const action = NodeRegistry.create('action');
        action.code = `return NodeStatus.SUCCESS;`;

        editorState.addNode(sequence);
        editorState.addNode(action);

        editorState.connectNodes(root, sequence);
        editorState.connectNodes(sequence, action);
      }

      editorState.behaviorTree.setRoot(root);

      // Measure execution time
      const start = performance.now();
      const status = await editorState.behaviorTree.tick();
      const duration = performance.now() - start;

      // Should execute quickly (< 50ms for 100 nodes)
      expect(duration).toBeLessThan(50);
      expect(status).toBe(NodeStatus.SUCCESS);
    });
  });
});
