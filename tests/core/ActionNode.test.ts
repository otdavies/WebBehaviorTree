import { describe, it, expect, beforeEach } from 'vitest';
import { ActionNode } from '../../src/nodes/leaves/ActionNode.js';
import { Blackboard } from '../../src/core/Blackboard.js';
import { NodeStatus } from '../../src/core/NodeStatus.js';

describe('ActionNode', () => {
  let blackboard: Blackboard;

  beforeEach(() => {
    blackboard = new Blackboard();
  });

  describe('Code Execution', () => {
    it('executes user code safely and returns correct NodeStatus', () => {
      const action = new ActionNode('Test Action');

      // Test SUCCESS
      action.code = 'return NodeStatus.SUCCESS;';
      let result = action.tick(blackboard);
      expect(result).toBe(NodeStatus.SUCCESS);
      expect(action.status).toBe(NodeStatus.SUCCESS);

      // Test FAILURE
      action.code = 'return NodeStatus.FAILURE;';
      result = action.tick(blackboard);
      expect(result).toBe(NodeStatus.FAILURE);
      expect(action.status).toBe(NodeStatus.FAILURE);

      // Test RUNNING
      action.code = 'return NodeStatus.RUNNING;';
      result = action.tick(blackboard);
      expect(result).toBe(NodeStatus.RUNNING);
      expect(action.status).toBe(NodeStatus.RUNNING);
    });

    it('can access and modify blackboard', () => {
      const action = new ActionNode('Blackboard Test');

      action.code = `
        // Read from blackboard
        const value = blackboard.get('testKey') || 0;

        // Write to blackboard
        blackboard.set('testKey', value + 1);
        blackboard.set('anotherKey', 'hello');

        return NodeStatus.SUCCESS;
      `;

      // First execution
      action.tick(blackboard);
      expect(blackboard.get('testKey')).toBe(1);
      expect(blackboard.get('anotherKey')).toBe('hello');

      // Reset action
      action.reset();

      // Second execution - value should increment
      action.tick(blackboard);
      expect(blackboard.get('testKey')).toBe(2);
    });

    it('provides tick count to code', () => {
      const action = new ActionNode('Tick Counter');

      action.code = `
        // Store tick count in blackboard
        blackboard.set('lastTick', tick);

        // Return RUNNING for first 2 ticks, then SUCCESS
        if (tick < 2) {
          return NodeStatus.RUNNING;
        }
        return NodeStatus.SUCCESS;
      `;

      // Tick 0
      let result = action.tick(blackboard);
      expect(result).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('lastTick')).toBe(0);

      // Tick 1
      result = action.tick(blackboard);
      expect(result).toBe(NodeStatus.RUNNING);
      expect(blackboard.get('lastTick')).toBe(1);

      // Tick 2 - should succeed
      result = action.tick(blackboard);
      expect(result).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('lastTick')).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('returns FAILURE on code execution errors', () => {
      const action = new ActionNode('Error Action');

      // Syntax error - reference undefined variable
      action.code = `
        undefinedVariable.someMethod();
        return NodeStatus.SUCCESS;
      `;

      const result = action.tick(blackboard);

      // Should return FAILURE on error
      expect(result).toBe(NodeStatus.FAILURE);
      expect(action.status).toBe(NodeStatus.FAILURE);
    });

    it('returns FAILURE when code returns invalid value', () => {
      const action = new ActionNode('Invalid Return');

      // Return invalid value
      action.code = `
        return "invalid status";
      `;

      const result = action.tick(blackboard);

      // Should return FAILURE when return value is not a valid NodeStatus
      expect(result).toBe(NodeStatus.FAILURE);
    });

    it('returns SUCCESS when code is empty', () => {
      const action = new ActionNode('Empty Code');
      action.code = '';

      const result = action.tick(blackboard);

      // Empty code should default to SUCCESS
      expect(result).toBe(NodeStatus.SUCCESS);
    });

    it('handles runtime errors gracefully', () => {
      const action = new ActionNode('Runtime Error');

      action.code = `
        throw new Error('Intentional error');
      `;

      const result = action.tick(blackboard);

      // Should catch the error and return FAILURE
      expect(result).toBe(NodeStatus.FAILURE);
      expect(action.status).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Reset Behavior', () => {
    it('resets tick count when reset() is called', () => {
      const action = new ActionNode('Reset Test');

      action.code = `
        blackboard.set('tick', tick);
        return NodeStatus.RUNNING;
      `;

      // First tick
      action.tick(blackboard);
      expect(blackboard.get('tick')).toBe(0);

      // Second tick
      action.tick(blackboard);
      expect(blackboard.get('tick')).toBe(1);

      // Reset
      action.reset();

      // Next tick should be 0 again
      action.tick(blackboard);
      expect(blackboard.get('tick')).toBe(0);
    });

    it('resets status to IDLE', () => {
      const action = new ActionNode('Status Reset');
      action.code = 'return NodeStatus.SUCCESS;';

      action.tick(blackboard);
      expect(action.status).toBe(NodeStatus.SUCCESS);

      action.reset();
      expect(action.status).toBe(NodeStatus.IDLE);
    });
  });

  describe('Parameters', () => {
    it('can access parameters in code', () => {
      const action = new ActionNode('Param Test');

      // Define a parameter
      action.parameters.define('threshold', {
        type: 'number',
        label: 'Threshold',
        defaultValue: 50
      });

      action.code = `
        const threshold = params.threshold;
        blackboard.set('threshold', threshold);
        return NodeStatus.SUCCESS;
      `;

      action.tick(blackboard);

      expect(blackboard.get('threshold')).toBe(50);
    });

    it('uses updated parameter values', () => {
      const action = new ActionNode('Dynamic Param');

      action.parameters.define('multiplier', {
        type: 'number',
        label: 'Multiplier',
        defaultValue: 2
      });

      action.code = `
        const result = 10 * params.multiplier;
        blackboard.set('result', result);
        return NodeStatus.SUCCESS;
      `;

      // First execution with default
      action.tick(blackboard);
      expect(blackboard.get('result')).toBe(20);

      // Update parameter
      action.parameters.set('multiplier', 5);

      // Second execution with new value
      action.reset();
      action.tick(blackboard);
      expect(blackboard.get('result')).toBe(50);
    });
  });
});
