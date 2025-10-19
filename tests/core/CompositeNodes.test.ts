import { describe, it, expect, beforeEach } from 'vitest';
import { SequenceNode } from '../../src/nodes/composites/SequenceNode.js';
import { SelectorNode } from '../../src/nodes/composites/SelectorNode.js';
import { ParallelNode } from '../../src/nodes/composites/ParallelNode.js';
import { ActionNode } from '../../src/nodes/leaves/ActionNode.js';
import { Blackboard } from '../../src/core/Blackboard.js';
import { NodeStatus } from '../../src/core/NodeStatus.js';

describe('Composite Nodes', () => {
  let blackboard: Blackboard;

  beforeEach(() => {
    blackboard = new Blackboard();
  });

  describe('SequenceNode', () => {
    it('executes children in order and fails on first failure', () => {
      const sequence = new SequenceNode();

      // Create three action nodes with different return values
      const successAction = new ActionNode('Success Action');
      successAction.code = 'return NodeStatus.SUCCESS;';

      const failAction = new ActionNode('Fail Action');
      failAction.code = 'return NodeStatus.FAILURE;';

      const neverRunAction = new ActionNode('Never Run');
      neverRunAction.code = 'blackboard.set("wasRun", true); return NodeStatus.SUCCESS;';

      sequence.addChild(successAction);
      sequence.addChild(failAction);
      sequence.addChild(neverRunAction);

      // Execute the sequence
      const result = sequence.tick(blackboard);

      // Sequence should fail because second child fails
      expect(result).toBe(NodeStatus.FAILURE);

      // First child succeeded
      expect(successAction.status).toBe(NodeStatus.SUCCESS);

      // Second child failed
      expect(failAction.status).toBe(NodeStatus.FAILURE);

      // Third child was never executed
      expect(neverRunAction.status).toBe(NodeStatus.IDLE);
      expect(blackboard.has('wasRun')).toBe(false);
    });

    it('returns SUCCESS only if all children succeed', () => {
      const sequence = new SequenceNode();

      const action1 = new ActionNode('Action 1');
      action1.code = 'return NodeStatus.SUCCESS;';

      const action2 = new ActionNode('Action 2');
      action2.code = 'return NodeStatus.SUCCESS;';

      const action3 = new ActionNode('Action 3');
      action3.code = 'return NodeStatus.SUCCESS;';

      sequence.addChild(action1);
      sequence.addChild(action2);
      sequence.addChild(action3);

      const result = sequence.tick(blackboard);

      expect(result).toBe(NodeStatus.SUCCESS);
      expect(action1.status).toBe(NodeStatus.SUCCESS);
      expect(action2.status).toBe(NodeStatus.SUCCESS);
      expect(action3.status).toBe(NodeStatus.SUCCESS);
    });

    it('returns RUNNING if a child is still running', () => {
      const sequence = new SequenceNode();

      const successAction = new ActionNode('Success');
      successAction.code = 'return NodeStatus.SUCCESS;';

      const runningAction = new ActionNode('Running');
      runningAction.code = 'return NodeStatus.RUNNING;';

      const notYetRun = new ActionNode('Not Yet');
      notYetRun.code = 'return NodeStatus.SUCCESS;';

      sequence.addChild(successAction);
      sequence.addChild(runningAction);
      sequence.addChild(notYetRun);

      const result = sequence.tick(blackboard);

      expect(result).toBe(NodeStatus.RUNNING);
      expect(successAction.status).toBe(NodeStatus.SUCCESS);
      expect(runningAction.status).toBe(NodeStatus.RUNNING);
      expect(notYetRun.status).toBe(NodeStatus.IDLE);
    });
  });

  describe('SelectorNode', () => {
    it('stops at first success and succeeds on any child success', () => {
      const selector = new SelectorNode();

      const failAction1 = new ActionNode('Fail 1');
      failAction1.code = 'return NodeStatus.FAILURE;';

      const successAction = new ActionNode('Success');
      successAction.code = 'return NodeStatus.SUCCESS;';

      const neverRunAction = new ActionNode('Never Run');
      neverRunAction.code = 'blackboard.set("wasRun", true); return NodeStatus.SUCCESS;';

      selector.addChild(failAction1);
      selector.addChild(successAction);
      selector.addChild(neverRunAction);

      const result = selector.tick(blackboard);

      // Selector should succeed because second child succeeds
      expect(result).toBe(NodeStatus.SUCCESS);

      // First child failed
      expect(failAction1.status).toBe(NodeStatus.FAILURE);

      // Second child succeeded
      expect(successAction.status).toBe(NodeStatus.SUCCESS);

      // Third child never ran
      expect(neverRunAction.status).toBe(NodeStatus.IDLE);
      expect(blackboard.has('wasRun')).toBe(false);
    });

    it('returns FAILURE only if all children fail', () => {
      const selector = new SelectorNode();

      const fail1 = new ActionNode('Fail 1');
      fail1.code = 'return NodeStatus.FAILURE;';

      const fail2 = new ActionNode('Fail 2');
      fail2.code = 'return NodeStatus.FAILURE;';

      const fail3 = new ActionNode('Fail 3');
      fail3.code = 'return NodeStatus.FAILURE;';

      selector.addChild(fail1);
      selector.addChild(fail2);
      selector.addChild(fail3);

      const result = selector.tick(blackboard);

      expect(result).toBe(NodeStatus.FAILURE);
      expect(fail1.status).toBe(NodeStatus.FAILURE);
      expect(fail2.status).toBe(NodeStatus.FAILURE);
      expect(fail3.status).toBe(NodeStatus.FAILURE);
    });

    it('returns RUNNING if a child is still running', () => {
      const selector = new SelectorNode();

      const failAction = new ActionNode('Fail');
      failAction.code = 'return NodeStatus.FAILURE;';

      const runningAction = new ActionNode('Running');
      runningAction.code = 'return NodeStatus.RUNNING;';

      const notYetRun = new ActionNode('Not Yet');
      notYetRun.code = 'return NodeStatus.FAILURE;';

      selector.addChild(failAction);
      selector.addChild(runningAction);
      selector.addChild(notYetRun);

      const result = selector.tick(blackboard);

      expect(result).toBe(NodeStatus.RUNNING);
      expect(failAction.status).toBe(NodeStatus.FAILURE);
      expect(runningAction.status).toBe(NodeStatus.RUNNING);
      expect(notYetRun.status).toBe(NodeStatus.IDLE);
    });
  });

  describe('ParallelNode', () => {
    it('executes all children simultaneously', () => {
      const parallel = new ParallelNode();

      const action1 = new ActionNode('Action 1');
      action1.code = 'blackboard.set("a1", true); return NodeStatus.SUCCESS;';

      const action2 = new ActionNode('Action 2');
      action2.code = 'blackboard.set("a2", true); return NodeStatus.SUCCESS;';

      const action3 = new ActionNode('Action 3');
      action3.code = 'blackboard.set("a3", true); return NodeStatus.SUCCESS;';

      parallel.addChild(action1);
      parallel.addChild(action2);
      parallel.addChild(action3);

      const result = parallel.tick(blackboard);

      // All children should have been ticked
      expect(blackboard.get('a1')).toBe(true);
      expect(blackboard.get('a2')).toBe(true);
      expect(blackboard.get('a3')).toBe(true);

      // All succeeded, so parallel succeeds
      expect(result).toBe(NodeStatus.SUCCESS);
    });

    it('succeeds when minimum number of children succeed', () => {
      const parallel = new ParallelNode();
      parallel.config.minSuccess = 2; // Need at least 2 successes
      parallel.config.minFailure = 2; // Need at least 2 failures to fail

      const success1 = new ActionNode('Success 1');
      success1.code = 'return NodeStatus.SUCCESS;';

      const success2 = new ActionNode('Success 2');
      success2.code = 'return NodeStatus.SUCCESS;';

      const running = new ActionNode('Running');
      running.code = 'return NodeStatus.RUNNING;';

      parallel.addChild(success1);
      parallel.addChild(success2);
      parallel.addChild(running);

      const result = parallel.tick(blackboard);

      // We have 2 successes, which meets minSuccess
      expect(result).toBe(NodeStatus.SUCCESS);
    });

    it('fails when too many children fail', () => {
      const parallel = new ParallelNode();
      parallel.config.minFailure = 1; // Fail if any child fails

      const success = new ActionNode('Success');
      success.code = 'return NodeStatus.SUCCESS;';

      const fail = new ActionNode('Fail');
      fail.code = 'return NodeStatus.FAILURE;';

      parallel.addChild(success);
      parallel.addChild(fail);

      const result = parallel.tick(blackboard);

      // One child failed, which meets minFailure threshold
      expect(result).toBe(NodeStatus.FAILURE);
    });
  });
});
