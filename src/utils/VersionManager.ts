/**
 * VersionManager: Manages schema versioning and data migration for saved behavior trees
 */
export class VersionManager {
    public static readonly CURRENT_VERSION = 1.2;

    private static migrations = new Map<number, (data: any) => any>([
        // Example migration from 1.0 to 1.1
        [1.0, VersionManager.migrateV1_0_to_V1_1],
        // Migration from 1.1 to 1.2 (custom nodes support)
        [1.1, VersionManager.migrateV1_1_to_V1_2]
    ]);

    /**
     * Validates and migrates data to current version
     */
    public static migrate(data: any): any {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data: expected object');
        }

        let version = parseFloat(data.version || '1.0');

        // Check if version is too new
        if (version > this.CURRENT_VERSION) {
            throw new Error(
                `Unsupported version: ${data.version}. ` +
                `This file requires a newer version of the editor. ` +
                `Current version: ${this.CURRENT_VERSION}`
            );
        }

        // Apply migrations sequentially
        while (version < this.CURRENT_VERSION) {
            const migration = this.migrations.get(version);
            if (!migration) {
                throw new Error(
                    `No migration path from v${version} to v${this.CURRENT_VERSION}`
                );
            }

            data = migration(data);
            version = parseFloat(data.version);
        }

        return data;
    }

    /**
     * Validates that data has required structure
     */
    public static validate(data: any): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!data.version) {
            errors.push('Missing version field');
        }

        if (!data.tree) {
            errors.push('Missing tree field');
        }

        if (!data.tree?.nodes || !Array.isArray(data.tree.nodes)) {
            errors.push('Missing or invalid tree.nodes array');
        }

        if (!data.metadata) {
            errors.push('Missing metadata field');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Migration from v1.0 to v1.1
     * Adds parameters field to all nodes that don't have it
     */
    private static migrateV1_0_to_V1_1(data: any): any {
        // Add parameters to all nodes
        if (data.tree && data.tree.nodes) {
            data.tree.nodes.forEach((node: any) => {
                if (!node.parameters) {
                    node.parameters = {
                        definitions: {},
                        values: {}
                    };
                }
            });
        }

        // Update version
        data.version = '1.1';

        return data;
    }

    /**
     * Migration from v1.1 to v1.2
     * Adds customNodes field for custom node catalog support
     */
    private static migrateV1_1_to_V1_2(data: any): any {
        // Add customNodes array if it doesn't exist
        if (!data.customNodes) {
            data.customNodes = [];
        }

        // Update version
        data.version = '1.2';

        return data;
    }

    /**
     * Registers a custom migration function
     */
    public static registerMigration(fromVersion: number, migration: (data: any) => any): void {
        this.migrations.set(fromVersion, migration);
    }
}
