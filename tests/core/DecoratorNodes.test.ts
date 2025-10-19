import { describe, it, expect, beforeEach } from 'vitest';
import { InverterNode } from '../../src/nodes/decorators/InverterNode.js';
import { RepeaterNode } from '../../src/nodes/decorators/RepeaterNode.js';
import { ActionNode } from '../../src/nodes/leaves/ActionNode.js';
import { Blackboard } from '../../src/core/Blackboard.js';
import { NodeStatus } from '../../src/core/NodeStatus.js';

describe('Decorator Nodes', () => {
  let blackboard: Blackboard;

  beforeEach(() => {
    blackboard = new Blackboard();
  });

  describe('InverterNode', () => {
    it('flips SUCCESS to FAILURE and FAILURE to SUCCESS', () => {
      const inverter = new InverterNode();

      // Test SUCCESS -> FAILURE
      const successAction = new ActionNode('Success');
      successAction.code = 'return NodeStatus.SUCCESS;';
      inverter.addChild(successAction);

      let result = inverter.tick(blackboard);
      expect(result).toBe(NodeStatus.FAILURE);
      expect(inverter.status).toBe(NodeStatus.FAILURE);

      // Reset and test FAILURE -> SUCCESS
      inverter.clearChildren();
      const failAction = new ActionNode('Fail');
      failAction.code = 'return NodeStatus.FAILURE;';
      inverter.addChild(failAction);

      result = inverter.tick(blackboard);
      expect(result).toBe(NodeStatus.SUCCESS);
      expect(inverter.status).toBe(NodeStatus.SUCCESS);
    });

    it('keeps RUNNING status unchanged', () => {
      const inverter = new InverterNode();

      const runningAction = new ActionNode('Running');
      runningAction.code = 'return NodeStatus.RUNNING;';
      inverter.addChild(runningAction);

      const result = inverter.tick(blackboard);

      // RUNNING should stay RUNNING
      expect(result).toBe(NodeStatus.RUNNING);
      expect(inverter.status).toBe(NodeStatus.RUNNING);
    });

    it('returns FAILURE when it has no children', () => {
      const inverter = new InverterNode();

      const result = inverter.tick(blackboard);

      expect(result).toBe(NodeStatus.FAILURE);
    });
  });

  describe('RepeaterNode', () => {
    it('repeats child N times', () => {
      const repeater = new RepeaterNode();
      repeater.config.count = 3;
      repeater.config.repeatForever = false;

      const action = new ActionNode('Counter');
      action.code = `
        const count = blackboard.get('count') || 0;
        blackboard.set('count', count + 1);
        return NodeStatus.SUCCESS;
      `;
      repeater.addChild(action);

      // First tick - should complete all 3 iterations in one tick
      const result = repeater.tick(blackboard);

      // Should have run 3 times
      expect(blackboard.get('count')).toBe(3);
      expect(result).toBe(NodeStatus.SUCCESS);
    });

    it('returns RUNNING while repeating indefinitely when repeatForever is true', () => {
      const repeater = new RepeaterNode();
      repeater.config.repeatForever = true;

      const action = new ActionNode('Infinite');
      action.code = `
        const count = blackboard.get('infiniteCount') || 0;
        blackboard.set('infiniteCount', count + 1);
        return NodeStatus.SUCCESS;
      `;
      repeater.addChild(action);

      // First tick
      const result1 = repeater.tick(blackboard);
      expect(result1).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('infiniteCount')).toBe(1);

      // Second tick
      const result2 = repeater.tick(blackboard);
      expect(result2).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('infiniteCount')).toBe(2);

      // Third tick
      const result3 = repeater.tick(blackboard);
      expect(result3).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('infiniteCount')).toBe(3);
    });

    it('propagates child failure immediately', () => {
      const repeater = new RepeaterNode();
      repeater.config.count = 5;

      // Use a simple action that fails immediately
      const action = new ActionNode('Always Fail');
      action.code = `
        return NodeStatus.FAILURE;
      `;
      repeater.addChild(action);

      const result = repeater.tick(blackboard);

      // Should fail immediately on first iteration
      expect(result).toBe(NodeStatus.FAILURE);

      // Note: The child status will be IDLE because RepeaterNode resets
      // the child after execution. The repeater itself has FAILURE status.
      expect(repeater.status).toBe(NodeStatus.FAILURE);
    });

    it('handles RUNNING status from child correctly', () => {
      const repeater = new RepeaterNode();
      repeater.config.count = 3;

      // Use a simple action that returns RUNNING
      const action = new ActionNode('Always Running');
      action.code = `
        return NodeStatus.RUNNING;
      `;
      repeater.addChild(action);

      // First tick - child returns RUNNING, repeater should also return RUNNING
      const result = repeater.tick(blackboard);
      expect(result).toBe(NodeStatus.RUNNING);
      expect(action.status).toBe(NodeStatus.RUNNING);

      // The repeater should be paused at the first iteration
      expect(repeater['currentIteration']).toBe(0);
    });
  });
});
