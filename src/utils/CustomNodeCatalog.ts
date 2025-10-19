/**
 * CustomNodeCatalog: Manages custom user-created node definitions
 *
 * This allows users to:
 * - Save customized nodes as reusable templates
 * - Store custom nodes in localStorage or export with JSON
 * - Create instances of custom nodes from the context menu
 * - Track version history for all custom nodes
 */

/**
 * Represents a snapshot of a custom node at a specific version
 */
export interface CustomNodeVersion {
    version: number;
    code: string;
    label: string;
    description: string;
    updatedAt: string;
    changeDescription?: string; // Optional description of what changed
}

export interface CustomNodeDefinition {
    type: string;
    label: string;
    description: string;
    code: string;
    icon: string;
    category: 'leaf' | 'decorator' | 'composite';
    tags?: string[];
    version: number;
    versionHistory?: CustomNodeVersion[]; // History of all previous versions
    createdAt: string;
    updatedAt: string;
}

export class CustomNodeCatalog {
    private static readonly STORAGE_KEY = 'behaviorTree_customNodes';
    private static customNodes: Map<string, CustomNodeDefinition> = new Map();

    /**
     * Initializes the catalog by loading from localStorage
     */
    public static initialize(): void {
        this.loadFromLocalStorage();
    }

    /**
     * Saves a custom node definition (creates new or updates existing)
     */
    public static saveCustomNode(definition: CustomNodeDefinition): void {
        // Validate
        if (!definition.type || !definition.label) {
            throw new Error('Custom node must have a type and label');
        }

        // Check if updating existing node
        const existing = this.customNodes.get(definition.type);
        const now = new Date().toISOString();

        // Archive existing version if updating
        let versionHistory: CustomNodeVersion[] = [];
        if (existing) {
            versionHistory = existing.versionHistory || [];

            // Archive current version before updating
            versionHistory.push({
                version: existing.version,
                code: existing.code,
                label: existing.label,
                description: existing.description,
                updatedAt: existing.updatedAt
            });
        }

        const fullDefinition: CustomNodeDefinition = {
            ...definition,
            version: existing ? existing.version + 1 : 1,
            versionHistory: versionHistory,
            createdAt: existing ? existing.createdAt : now,
            updatedAt: now,
            tags: definition.tags || [definition.label.toLowerCase(), 'custom']
        };

        // Store in memory
        this.customNodes.set(definition.type, fullDefinition);

        // Persist to localStorage
        this.saveToLocalStorage();

        console.log(`Custom node "${definition.label}" ${existing ? 'updated' : 'saved'} in catalog (v${fullDefinition.version})`);
    }

    /**
     * Updates an existing custom node definition and increments its version
     * Returns the updated definition with new version number
     */
    public static updateCustomNode(type: string, updates: Partial<CustomNodeDefinition>, changeDescription?: string): CustomNodeDefinition | null {
        const existing = this.customNodes.get(type);
        if (!existing) {
            console.error(`Cannot update non-existent custom node: ${type}`);
            return null;
        }

        const now = new Date().toISOString();

        // Archive current version before updating
        const versionHistory = existing.versionHistory || [];
        versionHistory.push({
            version: existing.version,
            code: existing.code,
            label: existing.label,
            description: existing.description,
            updatedAt: existing.updatedAt,
            changeDescription
        });

        const updated: CustomNodeDefinition = {
            ...existing,
            ...updates,
            type: existing.type, // Prevent type change
            version: existing.version + 1,
            versionHistory: versionHistory,
            updatedAt: now
        };

        this.customNodes.set(type, updated);
        this.saveToLocalStorage();

        console.log(`Custom node "${updated.label}" updated to v${updated.version}`);
        return updated;
    }

    /**
     * Gets a custom node definition by type
     */
    public static getCustomNode(type: string): CustomNodeDefinition | undefined {
        return this.customNodes.get(type);
    }

    /**
     * Gets all custom node definitions
     */
    public static getAllCustomNodes(): CustomNodeDefinition[] {
        return Array.from(this.customNodes.values());
    }

    /**
     * Checks if any nodes in the provided array are instances of the given custom node type
     * Useful for warning users before deleting a custom node definition
     */
    public static hasInstancesInTree(type: string, nodes: any[]): boolean {
        return nodes.some(node => node.libraryType === type);
    }

    /**
     * Counts how many instances of a custom node type exist in the provided node array
     */
    public static countInstances(type: string, nodes: any[]): number {
        return nodes.filter(node => node.libraryType === type).length;
    }

    /**
     * Gets all node instances of a specific custom node type from the provided array
     */
    public static getInstances(type: string, nodes: any[]): any[] {
        return nodes.filter(node => node.libraryType === type);
    }

    /**
     * Deletes a custom node from the catalog
     * Note: This does not affect existing instances in the tree - they will keep their code
     * but will no longer be linked to the library definition
     */
    public static deleteCustomNode(type: string): boolean {
        const deleted = this.customNodes.delete(type);
        if (deleted) {
            this.saveToLocalStorage();
            console.log(`Custom node "${type}" deleted from catalog`);
        }
        return deleted;
    }

    /**
     * Checks if a custom node type exists
     */
    public static hasCustomNode(type: string): boolean {
        return this.customNodes.has(type);
    }

    /**
     * Gets the version history for a custom node
     */
    public static getVersionHistory(type: string): CustomNodeVersion[] {
        const node = this.customNodes.get(type);
        return node?.versionHistory || [];
    }

    /**
     * Gets a specific version from history
     */
    public static getVersion(type: string, version: number): CustomNodeVersion | undefined {
        const history = this.getVersionHistory(type);
        return history.find(v => v.version === version);
    }

    /**
     * Restores a custom node to a specific version from history
     * Creates a new version that contains the code from the historical version
     */
    public static restoreVersion(type: string, versionNumber: number, changeDescription?: string): CustomNodeDefinition | null {
        const node = this.customNodes.get(type);
        if (!node) {
            console.error(`Cannot restore version for non-existent custom node: ${type}`);
            return null;
        }

        const targetVersion = this.getVersion(type, versionNumber);
        if (!targetVersion) {
            console.error(`Version ${versionNumber} not found for custom node: ${type}`);
            return null;
        }

        // Update node with code from target version
        // This creates a NEW version with the old code
        const description = changeDescription || `Restored from version ${versionNumber}`;
        return this.updateCustomNode(type, {
            code: targetVersion.code,
            label: targetVersion.label,
            description: targetVersion.description
        }, description);
    }

    /**
     * Deletes old versions from history, keeping only the most recent N versions
     * Useful for managing storage space
     */
    public static pruneVersionHistory(type: string, keepCount: number = 10): boolean {
        const node = this.customNodes.get(type);
        if (!node) {
            return false;
        }

        const history = node.versionHistory || [];
        if (history.length <= keepCount) {
            return false; // Nothing to prune
        }

        // Sort by version (most recent first) and keep only the last N
        const sortedHistory = [...history].sort((a, b) => b.version - a.version);
        node.versionHistory = sortedHistory.slice(0, keepCount);

        this.saveToLocalStorage();
        console.log(`Pruned version history for "${node.label}" to ${keepCount} versions`);
        return true;
    }

    /**
     * Exports all custom nodes to a JSON-serializable format
     */
    public static exportCustomNodes(): CustomNodeDefinition[] {
        return this.getAllCustomNodes();
    }

    /**
     * Imports custom nodes from a JSON array
     */
    public static importCustomNodes(nodes: CustomNodeDefinition[]): void {
        if (!Array.isArray(nodes)) {
            throw new Error('Invalid custom nodes data: must be an array');
        }

        let importedCount = 0;
        for (const node of nodes) {
            try {
                // Validate structure
                if (!node.type || !node.label || !node.code) {
                    console.warn('Skipping invalid custom node:', node);
                    continue;
                }

                this.customNodes.set(node.type, node);
                importedCount++;
            } catch (error) {
                console.error('Failed to import custom node:', node, error);
            }
        }

        if (importedCount > 0) {
            this.saveToLocalStorage();
            console.log(`Imported ${importedCount} custom node(s)`);
        }
    }

    /**
     * Clears all custom nodes
     */
    public static clearAll(): void {
        this.customNodes.clear();
        this.saveToLocalStorage();
        console.log('All custom nodes cleared');
    }

    /**
     * Saves custom nodes to localStorage
     */
    private static saveToLocalStorage(): void {
        try {
            const data = this.exportCustomNodes();
            const json = JSON.stringify(data);
            localStorage.setItem(this.STORAGE_KEY, json);
        } catch (error) {
            console.error('Failed to save custom nodes to localStorage:', error);
        }
    }

    /**
     * Loads custom nodes from localStorage
     */
    private static loadFromLocalStorage(): void {
        try {
            const json = localStorage.getItem(this.STORAGE_KEY);
            if (!json) return;

            const data = JSON.parse(json);
            if (Array.isArray(data)) {
                this.importCustomNodes(data);
            }
        } catch (error) {
            console.error('Failed to load custom nodes from localStorage:', error);
        }
    }

    /**
     * Gets the count of custom nodes
     */
    public static count(): number {
        return this.customNodes.size;
    }
}
