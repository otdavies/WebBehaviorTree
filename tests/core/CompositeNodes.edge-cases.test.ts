import { describe, it, expect, beforeEach } from 'vitest';
import { SequenceNode } from '../../src/nodes/composites/SequenceNode.js';
import { SelectorNode } from '../../src/nodes/composites/SelectorNode.js';
import { ParallelNode } from '../../src/nodes/composites/ParallelNode.js';
import { ActionNode } from '../../src/nodes/leaves/ActionNode.js';
import { Blackboard } from '../../src/core/Blackboard.js';
import { NodeStatus } from '../../src/core/NodeStatus.js';

/**
 * Edge Case Tests for Composite Nodes
 *
 * These tests cover scenarios that the basic tests miss:
 * - Empty children arrays
 * - Null/undefined handling
 * - State corruption
 * - Concurrent modification
 * - Multi-tick scenarios
 */
describe('Composite Nodes - Edge Cases', () => {
  let blackboard: Blackboard;

  beforeEach(() => {
    blackboard = new Blackboard();
  });

  describe('Empty Children Handling', () => {
    it('SequenceNode with no children returns SUCCESS', () => {
      const sequence = new SequenceNode();
      // No children added - what should happen?

      const result = sequence.tick(blackboard);

      // Behavior tree semantics: empty sequence vacuously succeeds
      expect(result).toBe(NodeStatus.SUCCESS);
    });

    it('SelectorNode with no children returns FAILURE', () => {
      const selector = new SelectorNode();
      // No children - nothing can succeed

      const result = selector.tick(blackboard);

      // Selector with no options should fail
      expect(result).toBe(NodeStatus.FAILURE);
    });

    it('ParallelNode with no children returns SUCCESS', () => {
      const parallel = new ParallelNode();

      const result = parallel.tick(blackboard);

      // No children to fail = success
      expect(result).toBe(NodeStatus.SUCCESS);
    });
  });

  describe('State Persistence Across Ticks', () => {
    it('Sequence remembers position when child returns RUNNING', () => {
      const sequence = new SequenceNode();

      // Create actions that track execution count
      const action1 = new ActionNode('Action 1');
      action1.code = `
        const count = blackboard.get('a1_count') || 0;
        blackboard.set('a1_count', count + 1);
        return NodeStatus.SUCCESS;
      `;

      const action2 = new ActionNode('Action 2 - Slow');
      action2.code = `
        const count = blackboard.get('a2_count') || 0;
        blackboard.set('a2_count', count + 1);
        return count < 2 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
      `;

      const action3 = new ActionNode('Action 3');
      action3.code = `
        const count = blackboard.get('a3_count') || 0;
        blackboard.set('a3_count', count + 1);
        return NodeStatus.SUCCESS;
      `;

      sequence.addChild(action1);
      sequence.addChild(action2);
      sequence.addChild(action3);

      // Tick 1: action1 succeeds, action2 runs (returns RUNNING)
      expect(sequence.tick(blackboard)).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('a1_count')).toBe(1);
      expect(blackboard.get('a2_count')).toBe(1);
      expect(blackboard.get('a3_count')).toBeUndefined(); // Not reached

      // Tick 2: action1 should NOT re-execute (sequence remembers position)
      expect(sequence.tick(blackboard)).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('a1_count')).toBe(1); // Still 1! Not re-executed
      expect(blackboard.get('a2_count')).toBe(2);
      expect(blackboard.get('a3_count')).toBeUndefined(); // Still not reached

      // Tick 3: action2 succeeds, action3 runs
      expect(sequence.tick(blackboard)).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('a1_count')).toBe(1); // Still 1!
      expect(blackboard.get('a2_count')).toBe(3);
      expect(blackboard.get('a3_count')).toBe(1); // Now executed
    });

    it('Selector remembers position when child returns RUNNING', () => {
      const selector = new SelectorNode();

      const failAction = new ActionNode('Fail');
      failAction.code = `
        const count = blackboard.get('fail_count') || 0;
        blackboard.set('fail_count', count + 1);
        return NodeStatus.FAILURE;
      `;

      const slowAction = new ActionNode('Slow Success');
      slowAction.code = `
        const count = blackboard.get('slow_count') || 0;
        blackboard.set('slow_count', count + 1);
        return count < 2 ? NodeStatus.RUNNING : NodeStatus.SUCCESS;
      `;

      selector.addChild(failAction);
      selector.addChild(slowAction);

      // Tick 1: failAction runs, slowAction returns RUNNING
      expect(selector.tick(blackboard)).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('fail_count')).toBe(1);
      expect(blackboard.get('slow_count')).toBe(1);

      // Tick 2: failAction should NOT re-execute
      expect(selector.tick(blackboard)).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('fail_count')).toBe(1); // Should not increment!
      expect(blackboard.get('slow_count')).toBe(2);

      // Tick 3: slowAction succeeds
      expect(selector.tick(blackboard)).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('fail_count')).toBe(1); // Still 1
      expect(blackboard.get('slow_count')).toBe(3);
    });
  });

  describe('Reset Behavior', () => {
    it('Sequence reset clears current child index', () => {
      const sequence = new SequenceNode();

      const running = new ActionNode('Running');
      running.code = 'return NodeStatus.RUNNING;';

      const success = new ActionNode('Success');
      success.code = 'return NodeStatus.SUCCESS;';

      sequence.addChild(running);
      sequence.addChild(success);

      // Tick once - should get stuck on first child
      sequence.tick(blackboard);
      expect(sequence.status).toBe(NodeStatus.RUNNING);
      expect(sequence['currentChildIndex']).toBe(0);

      // Reset
      sequence.reset();

      // Should restart from beginning
      expect(sequence.status).toBe(NodeStatus.IDLE);
      expect(sequence['currentChildIndex']).toBe(0);
    });

    it('Reset propagates to all children', () => {
      const sequence = new SequenceNode();

      const action1 = new ActionNode('Action 1');
      action1.code = 'return NodeStatus.SUCCESS;';

      const action2 = new ActionNode('Action 2');
      action2.code = 'return NodeStatus.RUNNING;';

      sequence.addChild(action1);
      sequence.addChild(action2);

      // Execute
      sequence.tick(blackboard);
      expect(action1.status).toBe(NodeStatus.SUCCESS);
      expect(action2.status).toBe(NodeStatus.RUNNING);

      // Reset parent
      sequence.reset();

      // All children should be reset
      expect(action1.status).toBe(NodeStatus.IDLE);
      expect(action2.status).toBe(NodeStatus.IDLE);
    });
  });

  describe('Child Modification During Execution', () => {
    it('handles child removal during execution gracefully', () => {
      const sequence = new SequenceNode();

      const action1 = new ActionNode('Action 1');
      action1.code = 'return NodeStatus.SUCCESS;';

      const action2 = new ActionNode('Action 2');
      action2.code = `
        // This action removes itself mid-execution!
        // In real scenarios, this could happen via editor interactions
        return NodeStatus.SUCCESS;
      `;

      const action3 = new ActionNode('Action 3');
      action3.code = 'return NodeStatus.SUCCESS;';

      sequence.addChild(action1);
      sequence.addChild(action2);
      sequence.addChild(action3);

      // Start execution
      sequence.tick(blackboard);

      // Simulate removing a child while tree is in RUNNING state
      // (This could happen in the editor)
      sequence['children'].splice(1, 1); // Remove action2

      // Next tick should handle the modified children array
      // Should not crash or access out-of-bounds
      expect(() => sequence.tick(blackboard)).not.toThrow();
    });
  });

  describe('ParallelNode Edge Cases', () => {
    it('handles minSuccess greater than child count', () => {
      const parallel = new ParallelNode();
      parallel.config.minSuccess = 5; // Want 5 successes

      // But only have 2 children
      const action1 = new ActionNode('Action 1');
      action1.code = 'return NodeStatus.SUCCESS;';

      const action2 = new ActionNode('Action 2');
      action2.code = 'return NodeStatus.SUCCESS;';

      parallel.addChild(action1);
      parallel.addChild(action2);

      // Can never achieve minSuccess
      const result = parallel.tick(blackboard);

      // Should return RUNNING (waiting for impossible condition)
      // or should it be FAILURE?
      expect([NodeStatus.RUNNING, NodeStatus.FAILURE]).toContain(result);
    });

    it('handles minFailure of zero correctly', () => {
      const parallel = new ParallelNode();
      parallel.config.minFailure = 0; // Any failure fails immediately

      const success = new ActionNode('Success');
      success.code = 'return NodeStatus.SUCCESS;';

      const fail = new ActionNode('Fail');
      fail.code = 'return NodeStatus.FAILURE;';

      parallel.addChild(success);
      parallel.addChild(fail);

      const result = parallel.tick(blackboard);

      // With minFailure = 0, should fail immediately
      expect(result).toBe(NodeStatus.FAILURE);
    });

    it('executes all children even if some have already succeeded', () => {
      const parallel = new ParallelNode();

      const action1 = new ActionNode('Action 1');
      action1.code = `
        blackboard.set('a1_ran', true);
        return NodeStatus.SUCCESS;
      `;

      const action2 = new ActionNode('Action 2');
      action2.code = `
        blackboard.set('a2_ran', true);
        return NodeStatus.SUCCESS;
      `;

      const action3 = new ActionNode('Action 3');
      action3.code = `
        blackboard.set('a3_ran', true);
        return NodeStatus.SUCCESS;
      `;

      parallel.addChild(action1);
      parallel.addChild(action2);
      parallel.addChild(action3);

      parallel.tick(blackboard);

      // All children should execute, even though first one succeeded
      expect(blackboard.get('a1_ran')).toBe(true);
      expect(blackboard.get('a2_ran')).toBe(true);
      expect(blackboard.get('a3_ran')).toBe(true);
    });
  });

  describe('Deep Nesting', () => {
    it('handles deeply nested sequences (10 levels)', () => {
      // Create 10 levels of nesting: Seq -> Seq -> Seq -> ... -> Action
      let rootSequence = new SequenceNode();
      let currentSequence = rootSequence;

      for (let i = 0; i < 10; i++) {
        const childSequence = new SequenceNode();
        currentSequence.addChild(childSequence);
        currentSequence = childSequence;
      }

      // Add final action at bottom
      const action = new ActionNode('Deep Action');
      action.code = 'blackboard.set("reached", true); return NodeStatus.SUCCESS;';
      currentSequence.addChild(action);

      // Execute from root
      const result = rootSequence.tick(blackboard);

      // Should succeed and reach the deep action
      expect(result).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('reached')).toBe(true);
    });

    it('handles mixed nesting (Sequence -> Selector -> Parallel -> Action)', () => {
      const sequence = new SequenceNode();
      const selector = new SelectorNode();
      const parallel = new ParallelNode();

      sequence.addChild(selector);
      selector.addChild(parallel);

      const action = new ActionNode('Nested Action');
      action.code = 'return NodeStatus.SUCCESS;';
      parallel.addChild(action);

      const result = sequence.tick(blackboard);
      expect(result).toBe(NodeStatus.SUCCESS);
    });
  });

  describe('Concurrent Execution Issues', () => {
    it('handles multiple ParallelNodes with shared blackboard data', () => {
      // Two parallel nodes both modifying same blackboard key
      const parallel1 = new ParallelNode();
      const parallel2 = new ParallelNode();

      const action1a = new ActionNode('P1 Action A');
      action1a.code = `
        const value = blackboard.get('shared') || 0;
        blackboard.set('shared', value + 1);
        return NodeStatus.SUCCESS;
      `;

      const action1b = new ActionNode('P1 Action B');
      action1b.code = `
        const value = blackboard.get('shared') || 0;
        blackboard.set('shared', value + 10);
        return NodeStatus.SUCCESS;
      `;

      parallel1.addChild(action1a);
      parallel1.addChild(action1b);

      parallel1.tick(blackboard);

      // Value should be affected by both actions
      const value = blackboard.get('shared');
      expect(value).toBeGreaterThan(0);
      // Exact value depends on execution order, but should be either 11 or 10+1 = 11
    });
  });
});
