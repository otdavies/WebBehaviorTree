import { describe, it, expect, beforeEach } from 'vitest';
import { Blackboard } from '../../src/core/Blackboard.js';

describe('Blackboard', () => {
  let blackboard: Blackboard;

  beforeEach(() => {
    blackboard = new Blackboard();
  });

  describe('Basic Operations', () => {
    it('get and set work correctly', () => {
      // Set and get a value
      blackboard.set('testKey', 'testValue');
      expect(blackboard.get('testKey')).toBe('testValue');

      // Set and get different types
      blackboard.set('numberKey', 42);
      expect(blackboard.get('numberKey')).toBe(42);

      blackboard.set('booleanKey', true);
      expect(blackboard.get('booleanKey')).toBe(true);

      blackboard.set('objectKey', { x: 10, y: 20 });
      expect(blackboard.get('objectKey')).toEqual({ x: 10, y: 20 });

      blackboard.set('arrayKey', [1, 2, 3]);
      expect(blackboard.get('arrayKey')).toEqual([1, 2, 3]);
    });

    it('has() returns correct boolean', () => {
      expect(blackboard.has('nonexistent')).toBe(false);

      blackboard.set('exists', 'value');
      expect(blackboard.has('exists')).toBe(true);
    });

    it('delete() removes keys', () => {
      blackboard.set('toDelete', 'value');
      expect(blackboard.has('toDelete')).toBe(true);

      const result = blackboard.delete('toDelete');
      expect(result).toBe(true);
      expect(blackboard.has('toDelete')).toBe(false);

      // Try to delete non-existent key
      const result2 = blackboard.delete('nonexistent');
      expect(result2).toBe(false);
    });

    it('clear() removes all data', () => {
      blackboard.set('key1', 'value1');
      blackboard.set('key2', 'value2');
      blackboard.set('key3', 'value3');

      expect(blackboard.size()).toBe(3);

      blackboard.clear();

      expect(blackboard.size()).toBe(0);
      expect(blackboard.has('key1')).toBe(false);
      expect(blackboard.has('key2')).toBe(false);
      expect(blackboard.has('key3')).toBe(false);
    });
  });

  describe('Missing Keys', () => {
    it('handles missing keys gracefully', () => {
      // Get non-existent key should return undefined
      const value = blackboard.get('nonexistent');
      expect(value).toBeUndefined();

      // Should not throw error
      expect(() => blackboard.get('anotherMissingKey')).not.toThrow();
    });

    it('returns undefined for missing keys with type parameter', () => {
      const numberValue = blackboard.get<number>('missingNumber');
      expect(numberValue).toBeUndefined();

      const stringValue = blackboard.get<string>('missingString');
      expect(stringValue).toBeUndefined();

      const objectValue = blackboard.get<{ x: number }>('missingObject');
      expect(objectValue).toBeUndefined();
    });

    it('can distinguish between undefined value and missing key', () => {
      // Set a key to undefined
      blackboard.set('undefinedValue', undefined);

      // has() should return true even if value is undefined
      expect(blackboard.has('undefinedValue')).toBe(true);
      expect(blackboard.get('undefinedValue')).toBeUndefined();

      // Missing key
      expect(blackboard.has('trulyMissing')).toBe(false);
      expect(blackboard.get('trulyMissing')).toBeUndefined();
    });
  });

  describe('Data Access Tracking', () => {
    it('tracks which nodes access which keys', () => {
      const nodeId1 = 'node-1';
      const nodeId2 = 'node-2';

      // Node 1 accesses a key
      blackboard.get('sharedKey', nodeId1);

      // Node 2 also accesses the same key
      blackboard.get('sharedKey', nodeId2);

      // Both nodes should be in dependencies
      const dependencies = blackboard.getDependencies('sharedKey');
      expect(dependencies).toContain(nodeId1);
      expect(dependencies).toContain(nodeId2);
    });

    it('tracks write access as well as read access', () => {
      const nodeId = 'writer-node';

      blackboard.set('dataKey', 'value', nodeId);

      const dependencies = blackboard.getDependencies('dataKey');
      expect(dependencies).toContain(nodeId);
    });

    it('returns empty array for keys with no access', () => {
      const dependencies = blackboard.getDependencies('neverAccessed');
      expect(dependencies).toEqual([]);
    });
  });

  describe('Utility Methods', () => {
    it('keys() returns all keys', () => {
      blackboard.set('key1', 'value1');
      blackboard.set('key2', 'value2');
      blackboard.set('key3', 'value3');

      const keys = blackboard.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toContain('key3');
    });

    it('entries() returns all key-value pairs', () => {
      blackboard.set('a', 1);
      blackboard.set('b', 2);
      blackboard.set('c', 3);

      const entries = blackboard.entries();
      expect(entries).toHaveLength(3);

      const entriesMap = new Map(entries);
      expect(entriesMap.get('a')).toBe(1);
      expect(entriesMap.get('b')).toBe(2);
      expect(entriesMap.get('c')).toBe(3);
    });

    it('size() returns correct count', () => {
      expect(blackboard.size()).toBe(0);

      blackboard.set('key1', 'value1');
      expect(blackboard.size()).toBe(1);

      blackboard.set('key2', 'value2');
      expect(blackboard.size()).toBe(2);

      blackboard.delete('key1');
      expect(blackboard.size()).toBe(1);
    });
  });

  describe('Serialization', () => {
    it('toJSON() serializes data correctly', () => {
      blackboard.set('string', 'hello');
      blackboard.set('number', 42);
      blackboard.set('boolean', true);
      blackboard.set('object', { x: 1, y: 2 });

      const json = blackboard.toJSON();

      expect(json).toEqual({
        string: 'hello',
        number: 42,
        boolean: true,
        object: { x: 1, y: 2 }
      });
    });

    it('fromJSON() deserializes data correctly', () => {
      const data = {
        key1: 'value1',
        key2: 123,
        key3: true,
        key4: { nested: 'object' }
      };

      blackboard.fromJSON(data);

      expect(blackboard.get('key1')).toBe('value1');
      expect(blackboard.get('key2')).toBe(123);
      expect(blackboard.get('key3')).toBe(true);
      expect(blackboard.get('key4')).toEqual({ nested: 'object' });
    });

    it('fromJSON() clears existing data', () => {
      blackboard.set('existing', 'data');

      blackboard.fromJSON({ new: 'data' });

      expect(blackboard.has('existing')).toBe(false);
      expect(blackboard.get('new')).toBe('data');
    });

    it('clone() creates independent copy', () => {
      blackboard.set('key1', 'value1');
      blackboard.set('key2', 'value2');

      const cloned = blackboard.clone();

      // Cloned should have same data
      expect(cloned.get('key1')).toBe('value1');
      expect(cloned.get('key2')).toBe('value2');

      // Modifying original should not affect clone
      blackboard.set('key1', 'modified');
      expect(cloned.get('key1')).toBe('value1');

      // Modifying clone should not affect original
      cloned.set('key3', 'new');
      expect(blackboard.has('key3')).toBe(false);
    });
  });
});
