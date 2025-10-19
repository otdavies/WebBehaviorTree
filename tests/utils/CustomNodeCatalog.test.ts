import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomNodeCatalog, CustomNodeDefinition } from '../../src/utils/CustomNodeCatalog.js';

describe('CustomNodeCatalog', () => {
    // Mock localStorage
    const localStorageMock = (() => {
        let store: Record<string, string> = {};
        return {
            getItem: (key: string) => store[key] || null,
            setItem: (key: string, value: string) => {
                store[key] = value.toString();
            },
            removeItem: (key: string) => {
                delete store[key];
            },
            clear: () => {
                store = {};
            }
        };
    })();

    beforeEach(() => {
        // Reset localStorage before each test
        localStorageMock.clear();
        global.localStorage = localStorageMock as any;

        // Clear catalog
        CustomNodeCatalog.clearAll();

        // Suppress console logs during tests
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    describe('Basic CRUD Operations', () => {
        it('saves a new custom node definition', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_walk',
                label: 'Walk',
                description: 'Walk to a location',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-walking',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const retrieved = CustomNodeCatalog.getCustomNode('custom_walk');
            expect(retrieved).toBeDefined();
            expect(retrieved?.label).toBe('Walk');
            expect(retrieved?.version).toBe(1);
        });

        it('increments version when updating existing node', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_attack',
                label: 'Attack',
                description: 'Attack enemy',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-sword',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Save initial version
            CustomNodeCatalog.saveCustomNode(definition);
            const v1 = CustomNodeCatalog.getCustomNode('custom_attack');
            expect(v1?.version).toBe(1);

            // Update with new code
            const updated = { ...definition, code: 'return NodeStatus.FAILURE;' };
            CustomNodeCatalog.saveCustomNode(updated);

            const v2 = CustomNodeCatalog.getCustomNode('custom_attack');
            expect(v2?.version).toBe(2);
            expect(v2?.code).toBe('return NodeStatus.FAILURE;');
        });

        it('uses updateCustomNode to increment version', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_defend',
                label: 'Defend',
                description: 'Defend position',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-shield',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const updated = CustomNodeCatalog.updateCustomNode('custom_defend', {
                code: 'console.log("defending"); return NodeStatus.RUNNING;'
            });

            expect(updated).toBeDefined();
            expect(updated?.version).toBe(2);
            expect(updated?.code).toContain('defending');
            expect(updated?.label).toBe('Defend'); // Unchanged
        });

        it('prevents type change via updateCustomNode', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_test',
                label: 'Test',
                description: 'Test node',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-test',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const updated = CustomNodeCatalog.updateCustomNode('custom_test', {
                type: 'custom_hacked', // Try to change type
                label: 'New Label'
            } as any);

            expect(updated?.type).toBe('custom_test'); // Type should remain unchanged
            expect(updated?.label).toBe('New Label');
        });

        it('returns null when updating non-existent node', () => {
            const result = CustomNodeCatalog.updateCustomNode('custom_nonexistent', {
                code: 'new code'
            });

            expect(result).toBeNull();
        });

        it('retrieves all custom nodes', () => {
            const def1: CustomNodeDefinition = {
                type: 'custom_node1',
                label: 'Node 1',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-one',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const def2: CustomNodeDefinition = {
                type: 'custom_node2',
                label: 'Node 2',
                description: '',
                code: 'return NodeStatus.FAILURE;',
                icon: 'fa-two',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(def1);
            CustomNodeCatalog.saveCustomNode(def2);

            const all = CustomNodeCatalog.getAllCustomNodes();
            expect(all.length).toBe(2);
            expect(all.find(n => n.type === 'custom_node1')).toBeDefined();
            expect(all.find(n => n.type === 'custom_node2')).toBeDefined();
        });

        it('deletes a custom node', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_deleteme',
                label: 'Delete Me',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-trash',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            expect(CustomNodeCatalog.hasCustomNode('custom_deleteme')).toBe(true);

            const deleted = CustomNodeCatalog.deleteCustomNode('custom_deleteme');
            expect(deleted).toBe(true);
            expect(CustomNodeCatalog.hasCustomNode('custom_deleteme')).toBe(false);
        });

        it('returns false when deleting non-existent node', () => {
            const deleted = CustomNodeCatalog.deleteCustomNode('custom_nonexistent');
            expect(deleted).toBe(false);
        });

        it('checks if custom node exists', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_exists',
                label: 'Exists',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-check',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            expect(CustomNodeCatalog.hasCustomNode('custom_exists')).toBe(false);
            CustomNodeCatalog.saveCustomNode(definition);
            expect(CustomNodeCatalog.hasCustomNode('custom_exists')).toBe(true);
        });

        it('returns correct count', () => {
            expect(CustomNodeCatalog.count()).toBe(0);

            const def1: CustomNodeDefinition = {
                type: 'custom_a',
                label: 'A',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-a',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(def1);
            expect(CustomNodeCatalog.count()).toBe(1);

            const def2: CustomNodeDefinition = {
                type: 'custom_b',
                label: 'B',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-b',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(def2);
            expect(CustomNodeCatalog.count()).toBe(2);

            CustomNodeCatalog.deleteCustomNode('custom_a');
            expect(CustomNodeCatalog.count()).toBe(1);
        });

        it('clears all custom nodes', () => {
            const def1: CustomNodeDefinition = {
                type: 'custom_clear1',
                label: 'Clear 1',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-clear',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const def2: CustomNodeDefinition = {
                type: 'custom_clear2',
                label: 'Clear 2',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-clear',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(def1);
            CustomNodeCatalog.saveCustomNode(def2);
            expect(CustomNodeCatalog.count()).toBe(2);

            CustomNodeCatalog.clearAll();
            expect(CustomNodeCatalog.count()).toBe(0);
        });
    });

    describe('Import/Export', () => {
        it('exports custom nodes to JSON format', () => {
            const def1: CustomNodeDefinition = {
                type: 'custom_export1',
                label: 'Export 1',
                description: 'Export test',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-export',
                category: 'leaf',
                version: 1,
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
            };

            CustomNodeCatalog.saveCustomNode(def1);

            const exported = CustomNodeCatalog.exportCustomNodes();
            expect(Array.isArray(exported)).toBe(true);
            expect(exported.length).toBe(1);
            expect(exported[0].type).toBe('custom_export1');
            expect(exported[0].label).toBe('Export 1');
        });

        it('imports custom nodes from JSON', () => {
            const nodes: CustomNodeDefinition[] = [
                {
                    type: 'custom_import1',
                    label: 'Import 1',
                    description: '',
                    code: 'return NodeStatus.SUCCESS;',
                    icon: 'fa-import',
                    category: 'leaf',
                    version: 1,
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-01T00:00:00Z'
                },
                {
                    type: 'custom_import2',
                    label: 'Import 2',
                    description: '',
                    code: 'return NodeStatus.FAILURE;',
                    icon: 'fa-import',
                    category: 'leaf',
                    version: 2,
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-02T00:00:00Z'
                }
            ];

            CustomNodeCatalog.importCustomNodes(nodes);

            expect(CustomNodeCatalog.count()).toBe(2);
            expect(CustomNodeCatalog.hasCustomNode('custom_import1')).toBe(true);
            expect(CustomNodeCatalog.hasCustomNode('custom_import2')).toBe(true);

            const node2 = CustomNodeCatalog.getCustomNode('custom_import2');
            expect(node2?.version).toBe(2);
        });

        it('skips invalid nodes during import', () => {
            const nodes = [
                {
                    type: 'custom_valid',
                    label: 'Valid',
                    code: 'return NodeStatus.SUCCESS;',
                    icon: 'fa-check',
                    category: 'leaf',
                    version: 1,
                    createdAt: '2025-01-01T00:00:00Z',
                    updatedAt: '2025-01-01T00:00:00Z'
                },
                {
                    // Missing type
                    label: 'Invalid',
                    code: 'return NodeStatus.SUCCESS;'
                } as any,
                {
                    type: 'custom_invalid2',
                    // Missing label and code
                    icon: 'fa-x'
                } as any
            ];

            CustomNodeCatalog.importCustomNodes(nodes);

            // Only the valid node should be imported
            expect(CustomNodeCatalog.count()).toBe(1);
            expect(CustomNodeCatalog.hasCustomNode('custom_valid')).toBe(true);
        });

        it('round-trips export/import correctly', () => {
            const original: CustomNodeDefinition = {
                type: 'custom_roundtrip',
                label: 'Round Trip',
                description: 'Test round trip',
                code: 'console.log("test"); return NodeStatus.RUNNING;',
                icon: 'fa-sync',
                category: 'leaf',
                tags: ['test', 'roundtrip'],
                version: 3,
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-15T12:00:00Z'
            };

            CustomNodeCatalog.saveCustomNode(original);

            // Export
            const exported = CustomNodeCatalog.exportCustomNodes();

            // Clear
            CustomNodeCatalog.clearAll();
            expect(CustomNodeCatalog.count()).toBe(0);

            // Import
            CustomNodeCatalog.importCustomNodes(exported);

            // Verify - note that version will be what was saved, not reset
            const restored = CustomNodeCatalog.getCustomNode('custom_roundtrip');
            expect(restored).toBeDefined();
            expect(restored?.label).toBe('Round Trip');
            expect(restored?.description).toBe('Test round trip');
            expect(restored?.code).toContain('console.log("test")');
            expect(restored?.version).toBeGreaterThanOrEqual(1); // Version persists through import
            expect(restored?.tags).toContain('test');
            expect(restored?.tags).toContain('roundtrip');
        });
    });

    describe('Validation', () => {
        it('throws error when saving node without type', () => {
            const invalid = {
                label: 'No Type',
                code: 'return NodeStatus.SUCCESS;'
            } as any;

            expect(() => {
                CustomNodeCatalog.saveCustomNode(invalid);
            }).toThrow('Custom node must have a type and label');
        });

        it('throws error when saving node without label', () => {
            const invalid = {
                type: 'custom_nolabel',
                code: 'return NodeStatus.SUCCESS;'
            } as any;

            expect(() => {
                CustomNodeCatalog.saveCustomNode(invalid);
            }).toThrow('Custom node must have a type and label');
        });

        it('throws error when importing non-array data', () => {
            expect(() => {
                CustomNodeCatalog.importCustomNodes({} as any);
            }).toThrow('Invalid custom nodes data: must be an array');

            expect(() => {
                CustomNodeCatalog.importCustomNodes('invalid' as any);
            }).toThrow('Invalid custom nodes data: must be an array');
        });
    });

    describe('Versioning and Code Comparison', () => {
        it('correctly identifies when code has changed', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_compare',
                label: 'Compare',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-compare',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const libraryDef = CustomNodeCatalog.getCustomNode('custom_compare');

            // Simulate node instance code
            const instanceCode1 = 'return NodeStatus.SUCCESS;';
            const instanceCode2 = 'return NodeStatus.FAILURE;';
            const instanceCode3 = '  return NodeStatus.SUCCESS;  '; // Different whitespace

            // Test code matching (for isModified flag logic)
            expect(instanceCode1.trim() === libraryDef?.code.trim()).toBe(true); // Not modified
            expect(instanceCode2.trim() === libraryDef?.code.trim()).toBe(false); // Modified
            expect(instanceCode3.trim() === libraryDef?.code.trim()).toBe(true); // Not modified (whitespace ignored)
        });

        it('tracks version increments across updates', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_versions',
                label: 'Versions',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-versions',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            expect(CustomNodeCatalog.getCustomNode('custom_versions')?.version).toBe(1);

            CustomNodeCatalog.updateCustomNode('custom_versions', { code: 'v2' });
            expect(CustomNodeCatalog.getCustomNode('custom_versions')?.version).toBe(2);

            CustomNodeCatalog.updateCustomNode('custom_versions', { code: 'v3' });
            expect(CustomNodeCatalog.getCustomNode('custom_versions')?.version).toBe(3);

            CustomNodeCatalog.updateCustomNode('custom_versions', { code: 'v4' });
            expect(CustomNodeCatalog.getCustomNode('custom_versions')?.version).toBe(4);
        });

        it('preserves createdAt but updates updatedAt', async () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_timestamps',
                label: 'Timestamps',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-clock',
                category: 'leaf',
                version: 1,
                createdAt: '2025-01-01T00:00:00Z',
                updatedAt: '2025-01-01T00:00:00Z'
            };

            // First save - will get new timestamps
            CustomNodeCatalog.saveCustomNode(definition);
            const v1 = CustomNodeCatalog.getCustomNode('custom_timestamps');

            expect(v1?.createdAt).toBeDefined();
            expect(v1?.updatedAt).toBeDefined();

            const createdAt = v1!.createdAt;
            const updatedAtV1 = v1!.updatedAt;

            // Wait a tiny bit to ensure different timestamp
            await new Promise(resolve => setTimeout(resolve, 5));

            // Update with new code - should preserve createdAt but update updatedAt
            CustomNodeCatalog.updateCustomNode('custom_timestamps', { code: 'updated' });
            const v2 = CustomNodeCatalog.getCustomNode('custom_timestamps');

            expect(v2?.createdAt).toBe(createdAt); // Should not change
            expect(v2?.updatedAt).not.toBe(updatedAtV1); // Should be updated to new time
            expect(new Date(v2!.updatedAt).getTime()).toBeGreaterThan(new Date(updatedAtV1).getTime());
        });
    });

    describe('Version History', () => {
        it('creates version history when updating nodes', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_history',
                label: 'History Test',
                description: 'v1',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-history',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            // Update twice
            CustomNodeCatalog.updateCustomNode('custom_history', { code: 'v2 code', description: 'v2' });
            CustomNodeCatalog.updateCustomNode('custom_history', { code: 'v3 code', description: 'v3' });

            const node = CustomNodeCatalog.getCustomNode('custom_history');
            expect(node?.version).toBe(3);

            const history = CustomNodeCatalog.getVersionHistory('custom_history');
            expect(history.length).toBe(2); // Should have v1 and v2 in history
            expect(history[0].version).toBe(1);
            expect(history[0].code).toBe('return NodeStatus.SUCCESS;');
            expect(history[0].description).toBe('v1');
            expect(history[1].version).toBe(2);
            expect(history[1].code).toBe('v2 code');
            expect(history[1].description).toBe('v2');
        });

        it('retrieves specific version from history', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_getversion',
                label: 'Get Version Test',
                description: 'v1',
                code: 'v1 code',
                icon: 'fa-version',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            CustomNodeCatalog.updateCustomNode('custom_getversion', { code: 'v2 code', description: 'v2' });
            CustomNodeCatalog.updateCustomNode('custom_getversion', { code: 'v3 code', description: 'v3' });

            const v1 = CustomNodeCatalog.getVersion('custom_getversion', 1);
            expect(v1).toBeDefined();
            expect(v1?.code).toBe('v1 code');
            expect(v1?.description).toBe('v1');

            const v2 = CustomNodeCatalog.getVersion('custom_getversion', 2);
            expect(v2).toBeDefined();
            expect(v2?.code).toBe('v2 code');
            expect(v2?.description).toBe('v2');

            const nonExistent = CustomNodeCatalog.getVersion('custom_getversion', 999);
            expect(nonExistent).toBeUndefined();
        });

        it('restores node to previous version', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_restore',
                label: 'Restore Test',
                description: 'original',
                code: 'original code',
                icon: 'fa-restore',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            CustomNodeCatalog.updateCustomNode('custom_restore', { code: 'bad code', description: 'bad version' });

            // Current version should be 2
            let node = CustomNodeCatalog.getCustomNode('custom_restore');
            expect(node?.version).toBe(2);
            expect(node?.code).toBe('bad code');

            // Restore to version 1
            const restored = CustomNodeCatalog.restoreVersion('custom_restore', 1);

            expect(restored).toBeDefined();
            expect(restored?.version).toBe(3); // New version created
            expect(restored?.code).toBe('original code'); // Code from v1
            expect(restored?.description).toBe('original'); // Description from v1

            // History should have v1, v2, and v3 should be current
            const history = CustomNodeCatalog.getVersionHistory('custom_restore');
            expect(history.length).toBe(2); // v1 and v2 in history
        });

        it('returns null when restoring non-existent version', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_badrestore',
                label: 'Bad Restore',
                description: '',
                code: 'code',
                icon: 'fa-x',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const result = CustomNodeCatalog.restoreVersion('custom_badrestore', 999);
            expect(result).toBeNull();
        });

        it('returns null when restoring version of non-existent node', () => {
            const result = CustomNodeCatalog.restoreVersion('custom_nonexistent', 1);
            expect(result).toBeNull();
        });

        it('includes change description in version history', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_changedesc',
                label: 'Change Desc',
                description: '',
                code: 'v1',
                icon: 'fa-desc',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            CustomNodeCatalog.updateCustomNode('custom_changedesc', { code: 'v2' }, 'Fixed bug in logic');

            const history = CustomNodeCatalog.getVersionHistory('custom_changedesc');
            expect(history.length).toBe(1);
            expect(history[0].changeDescription).toBe('Fixed bug in logic');
        });

        it('prunes old versions from history', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_prune',
                label: 'Prune Test',
                description: '',
                code: 'v1',
                icon: 'fa-prune',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            // Create 15 more versions
            for (let i = 2; i <= 16; i++) {
                CustomNodeCatalog.updateCustomNode('custom_prune', { code: `v${i}` });
            }

            let history = CustomNodeCatalog.getVersionHistory('custom_prune');
            expect(history.length).toBe(15); // v1-v15 in history, v16 is current

            // Prune to keep only 5 most recent
            const pruned = CustomNodeCatalog.pruneVersionHistory('custom_prune', 5);
            expect(pruned).toBe(true);

            history = CustomNodeCatalog.getVersionHistory('custom_prune');
            expect(history.length).toBe(5);

            // Should keep versions 11-15 (most recent)
            expect(history.some(v => v.version === 15)).toBe(true);
            expect(history.some(v => v.version === 11)).toBe(true);
            expect(history.some(v => v.version === 5)).toBe(false); // Old version pruned
        });

        it('returns false when pruning node with fewer versions than keepCount', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_noprune',
                label: 'No Prune',
                description: '',
                code: 'v1',
                icon: 'fa-check',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            CustomNodeCatalog.updateCustomNode('custom_noprune', { code: 'v2' });

            const pruned = CustomNodeCatalog.pruneVersionHistory('custom_noprune', 10);
            expect(pruned).toBe(false); // Only 1 version in history, nothing to prune
        });

        it('returns false when pruning non-existent node', () => {
            const pruned = CustomNodeCatalog.pruneVersionHistory('custom_nonexistent', 10);
            expect(pruned).toBe(false);
        });

        it('exports and imports version history', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_exporthistory',
                label: 'Export History',
                description: 'v1',
                code: 'v1 code',
                icon: 'fa-export',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);
            CustomNodeCatalog.updateCustomNode('custom_exporthistory', { code: 'v2 code', description: 'v2' }, 'Updated to v2');
            CustomNodeCatalog.updateCustomNode('custom_exporthistory', { code: 'v3 code', description: 'v3' }, 'Updated to v3');

            // Export
            const exported = CustomNodeCatalog.exportCustomNodes();
            const exportedNode = exported.find(n => n.type === 'custom_exporthistory');
            expect(exportedNode?.versionHistory).toBeDefined();
            expect(exportedNode?.versionHistory?.length).toBe(2);

            // Clear and import
            CustomNodeCatalog.clearAll();
            CustomNodeCatalog.importCustomNodes(exported);

            // Verify history was preserved
            const history = CustomNodeCatalog.getVersionHistory('custom_exporthistory');
            expect(history.length).toBe(2);
            expect(history[0].code).toBe('v1 code');
            expect(history[0].changeDescription).toBe('Updated to v2'); // Describes change FROM v1
            expect(history[1].code).toBe('v2 code');
            expect(history[1].changeDescription).toBe('Updated to v3'); // Describes change FROM v2
        });
    });

    describe('Delete with Instance Checking', () => {
        it('checks if instances exist in tree', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_checkinstances',
                label: 'Check Instances',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-check',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            // Create mock nodes
            const nodes = [
                { id: '1', type: 'action', libraryType: null },
                { id: '2', type: 'custom_checkinstances', libraryType: 'custom_checkinstances' },
                { id: '3', type: 'sequence', libraryType: null },
                { id: '4', type: 'custom_checkinstances', libraryType: 'custom_checkinstances' }
            ];

            const hasInstances = CustomNodeCatalog.hasInstancesInTree('custom_checkinstances', nodes);
            expect(hasInstances).toBe(true);

            const noInstances = CustomNodeCatalog.hasInstancesInTree('custom_nonexistent', nodes);
            expect(noInstances).toBe(false);
        });

        it('counts instances in tree', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_countinstances',
                label: 'Count Instances',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-count',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const nodes = [
                { id: '1', type: 'action', libraryType: null },
                { id: '2', type: 'custom_countinstances', libraryType: 'custom_countinstances' },
                { id: '3', type: 'custom_countinstances', libraryType: 'custom_countinstances' },
                { id: '4', type: 'custom_countinstances', libraryType: 'custom_countinstances' }
            ];

            const count = CustomNodeCatalog.countInstances('custom_countinstances', nodes);
            expect(count).toBe(3);

            const zeroCount = CustomNodeCatalog.countInstances('custom_nonexistent', nodes);
            expect(zeroCount).toBe(0);
        });

        it('gets all instances from tree', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_getinstances',
                label: 'Get Instances',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-get',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const nodes = [
                { id: '1', type: 'action', libraryType: null },
                { id: '2', type: 'custom_getinstances', libraryType: 'custom_getinstances', label: 'Instance 1' },
                { id: '3', type: 'sequence', libraryType: null },
                { id: '4', type: 'custom_getinstances', libraryType: 'custom_getinstances', label: 'Instance 2' }
            ];

            const instances = CustomNodeCatalog.getInstances('custom_getinstances', nodes);
            expect(instances.length).toBe(2);
            expect(instances[0].label).toBe('Instance 1');
            expect(instances[1].label).toBe('Instance 2');
        });

        it('deletes custom node even when instances exist', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_deletewithinstances',
                label: 'Delete With Instances',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-trash',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const nodes = [
                { id: '1', type: 'custom_deletewithinstances', libraryType: 'custom_deletewithinstances' }
            ];

            // Should be able to delete even with instances
            expect(CustomNodeCatalog.hasInstancesInTree('custom_deletewithinstances', nodes)).toBe(true);

            const deleted = CustomNodeCatalog.deleteCustomNode('custom_deletewithinstances');
            expect(deleted).toBe(true);

            // Definition should be gone
            expect(CustomNodeCatalog.hasCustomNode('custom_deletewithinstances')).toBe(false);

            // But instance still exists (orphaned)
            expect(nodes[0].libraryType).toBe('custom_deletewithinstances');
        });
    });

    describe('Tags', () => {
        it('auto-generates tags from label if not provided', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_autotag',
                label: 'Auto Tag',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-tag',
                category: 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const saved = CustomNodeCatalog.getCustomNode('custom_autotag');
            expect(saved?.tags).toContain('auto tag');
            expect(saved?.tags).toContain('custom');
        });

        it('preserves custom tags when provided', () => {
            const definition: CustomNodeDefinition = {
                type: 'custom_customtag',
                label: 'Custom Tag',
                description: '',
                code: 'return NodeStatus.SUCCESS;',
                icon: 'fa-tag',
                category: 'leaf',
                tags: ['combat', 'melee', 'attack'],
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(definition);

            const saved = CustomNodeCatalog.getCustomNode('custom_customtag');
            expect(saved?.tags).toContain('combat');
            expect(saved?.tags).toContain('melee');
            expect(saved?.tags).toContain('attack');
        });
    });
});
