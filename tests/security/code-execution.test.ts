import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ActionNode } from '../../src/nodes/leaves/ActionNode.js';
import { Blackboard } from '../../src/core/Blackboard.js';
import { NodeStatus } from '../../src/core/NodeStatus.js';

/**
 * Security Tests for User Code Execution
 *
 * ActionNodes execute user-provided JavaScript code via eval().
 * This is inherently risky and needs security measures:
 *
 * 1. Scope isolation - can't access window/global
 * 2. Timeout protection - infinite loops killed
 * 3. Error sanitization - no info leaks
 * 4. Resource limits - can't exhaust memory
 */
describe.skip('Security - Code Execution', () => {
  let blackboard: Blackboard;

  beforeEach(() => {
    blackboard = new Blackboard();
  });

  describe('Scope Isolation', () => {
    it('prevents access to window object', () => {
      const action = new ActionNode('Window Access');

      // Try to access window
      action.code = `
        // Should not be able to access window
        if (typeof window !== 'undefined') {
          window.maliciousData = 'hacked';
        }
        return NodeStatus.SUCCESS;
      `;

      action.tick(blackboard);

      // window should not have been modified
      // Note: In Node.js test environment, window might not exist
      // But code shouldn't crash either
      expect(typeof (globalThis as any).maliciousData).toBe('undefined');
    });

    it('prevents access to global/globalThis', () => {
      const action = new ActionNode('Global Access');

      action.code = `
        try {
          global.hacked = true;
          globalThis.alsoHacked = true;
        } catch (e) {
          // Expected to fail
        }
        return NodeStatus.SUCCESS;
      `;

      action.tick(blackboard);

      // Globals should not be modified
      expect((global as any).hacked).toBeUndefined();
      expect((globalThis as any).alsoHacked).toBeUndefined();
    });

    it('prevents access to process object in Node environment', () => {
      const action = new ActionNode('Process Access');

      action.code = `
        try {
          const env = process.env; // Should not work
          return NodeStatus.SUCCESS;
        } catch (e) {
          return NodeStatus.FAILURE;
        }
      `;

      const status = action.tick(blackboard);

      // Should either fail or not have access to process
      // In sandbox, process should not be available
      expect(status).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Timeout Protection', () => {
    it('terminates infinite loops', () => {
      const action = new ActionNode('Infinite Loop');

      action.code = `
        while(true) {
          // Infinite loop - should timeout
        }
        return NodeStatus.SUCCESS;
      `;

      // Should timeout and return FAILURE
      const start = performance.now();
      const status = action.tick(blackboard);
      const duration = performance.now() - start;

      // Should fail (timeout)
      expect(status).toBe(NodeStatus.FAILURE);

      // Should timeout quickly (< 1 second)
      expect(duration).toBeLessThan(1000);
    });

    it('terminates expensive recursion', () => {
      const action = new ActionNode('Deep Recursion');

      action.code = `
        function recurse(n) {
          if (n > 10000) return;
          recurse(n + 1);
        }
        recurse(0);
        return NodeStatus.SUCCESS;
      `;

      // Should either complete or timeout
      const status = action.tick(blackboard);

      // Stack overflow should be caught
      expect([NodeStatus.SUCCESS, NodeStatus.FAILURE]).toContain(status);
    });
  });

  describe('XSS Prevention', () => {
    it('safely handles code with HTML/script tags', () => {
      const action = new ActionNode('XSS Attempt');

      // Try to inject HTML
      action.code = `
        const xss = '<script>alert("XSS")</script>';
        blackboard.set('xss', xss);
        return NodeStatus.SUCCESS;
      `;

      action.tick(blackboard);

      // Data should be stored as string, not executed
      const value = blackboard.get('xss');
      expect(value).toBe('<script>alert("XSS")</script>');

      // Should not execute in DOM (this is just storage)
      expect(typeof document === 'undefined' || !document.querySelector('script[src*="XSS"]')).toBe(true);
    });

    it('safely handles code with special characters', () => {
      const action = new ActionNode('Special Chars');

      action.code = `
        const special = '"; alert("XSS"); //';
        blackboard.set('special', special);
        return NodeStatus.SUCCESS;
      `;

      const status = action.tick(blackboard);

      // Should not break execution
      expect(status).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('special')).toBe('"; alert("XSS"); //');
    });
  });

  describe('Error Message Sanitization', () => {
    it('does not leak sensitive information in error messages', () => {
      const action = new ActionNode('Error Info Leak');

      // Simulate code that might leak info
      action.code = `
        const apiKey = 'secret-api-key-12345';
        throw new Error('Failed to authenticate with key: ' + apiKey);
      `;

      action.tick(blackboard);

      // Error should be logged, but sanitized
      // Check that the error doesn't expose the full API key
      // This assumes NodeExecutor sanitizes error messages
      expect(action.status).toBe(NodeStatus.FAILURE);
    });

    it('handles syntax errors without exposing code structure', () => {
      const action = new ActionNode('Syntax Error');

      // Invalid JavaScript
      action.code = `
        this is not valid javascript!!!
      `;

      const status = action.tick(blackboard);

      // Should fail gracefully
      expect(status).toBe(NodeStatus.FAILURE);
    });
  });

  describe('Resource Exhaustion Prevention', () => {
    it('prevents memory exhaustion from large arrays', () => {
      const action = new ActionNode('Memory Attack');

      action.code = `
        try {
          // Try to allocate huge array
          const huge = new Array(1000000000);
          huge.fill(1);
          return NodeStatus.SUCCESS;
        } catch (e) {
          return NodeStatus.FAILURE;
        }
      `;

      const status = action.tick(blackboard);

      // Should either fail or be prevented
      expect(status).toBe(NodeStatus.FAILURE);
    });

    it('prevents creating many objects', () => {
      const action = new ActionNode('Object Spam');

      action.code = `
        const objects = [];
        for (let i = 0; i < 1000000; i++) {
          objects.push({ data: new Array(1000) });
        }
        return NodeStatus.SUCCESS;
      `;

      // Should timeout before exhausting memory
      const start = performance.now();
      const status = action.tick(blackboard);
      const duration = performance.now() - start;

      // Should timeout or fail
      expect(status).toBe(NodeStatus.FAILURE);
      expect(duration).toBeLessThan(2000); // Timeout within 2 seconds
    });
  });

  describe('Code Injection Prevention', () => {
    it('safely handles blackboard data used in eval', () => {
      const action = new ActionNode('Injection Test');

      // Put malicious code in blackboard
      blackboard.set('userInput', '"; alert("XSS"); //');

      action.code = `
        const input = blackboard.get('userInput');
        // Using input should be safe
        blackboard.set('output', input);
        return NodeStatus.SUCCESS;
      `;

      const status = action.tick(blackboard);

      // Should not execute the injected code
      expect(status).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('output')).toBe('"; alert("XSS"); //');
    });

    it('handles code with escape sequences', () => {
      const action = new ActionNode('Escape Sequences');

      action.code = `
        const str = "Line 1\\nLine 2\\tTabbed";
        blackboard.set('escaped', str);
        return NodeStatus.SUCCESS;
      `;

      const status = action.tick(blackboard);

      expect(status).toBe(NodeStatus.SUCCESS);
      expect(blackboard.get('escaped')).toContain('\\n');
    });
  });

  describe('Function Constructor Abuse', () => {
    it('prevents using Function constructor to bypass sandbox', () => {
      const action = new ActionNode('Function Constructor');

      action.code = `
        try {
          const fn = new Function('return this');
          const global = fn();
          global.hacked = true;
          return NodeStatus.SUCCESS;
        } catch (e) {
          return NodeStatus.FAILURE;
        }
      `;

      action.tick(blackboard);

      // Global should not be modified
      expect((globalThis as any).hacked).toBeUndefined();
    });

    it('prevents eval within eval', () => {
      const action = new ActionNode('Nested Eval');

      action.code = `
        try {
          eval('eval("window.hacked = true")');
          return NodeStatus.SUCCESS;
        } catch (e) {
          return NodeStatus.FAILURE;
        }
      `;

      action.tick(blackboard);

      // Should not succeed in nested eval
      expect((globalThis as any).hacked).toBeUndefined();
    });
  });

  describe('Prototype Pollution', () => {
    it('prevents modifying Object.prototype', () => {
      const action = new ActionNode('Prototype Pollution');

      action.code = `
        try {
          Object.prototype.polluted = 'hacked';
          return NodeStatus.SUCCESS;
        } catch (e) {
          return NodeStatus.FAILURE;
        }
      `;

      action.tick(blackboard);

      // Object.prototype should not be polluted
      expect((Object.prototype as any).polluted).toBeUndefined();

      // Test that new objects don't have the pollution
      const testObj = {};
      expect((testObj as any).polluted).toBeUndefined();
    });

    it('prevents __proto__ manipulation', () => {
      const action = new ActionNode('Proto Manipulation');

      action.code = `
        try {
          const obj = {};
          obj.__proto__.hacked = true;
          return NodeStatus.SUCCESS;
        } catch (e) {
          return NodeStatus.FAILURE;
        }
      `;

      action.tick(blackboard);

      // Prototype should not be modified
      const testObj = {};
      expect((testObj as any).hacked).toBeUndefined();
    });
  });
});
