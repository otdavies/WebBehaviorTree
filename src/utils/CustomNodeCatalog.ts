/**
 * CustomNodeCatalog: Manages custom user-created node definitions
 *
 * This allows users to:
 * - Save customized nodes as reusable templates
 * - Store custom nodes in localStorage or export with JSON
 * - Create instances of custom nodes from the context menu
 */

export interface CustomNodeDefinition {
    type: string;
    label: string;
    description: string;
    code: string;
    icon: string;
    category: 'leaf' | 'decorator' | 'composite';
    tags?: string[];
    version: number;
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

        const fullDefinition: CustomNodeDefinition = {
            ...definition,
            version: existing ? existing.version + 1 : 1,
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
    public static updateCustomNode(type: string, updates: Partial<CustomNodeDefinition>): CustomNodeDefinition | null {
        const existing = this.customNodes.get(type);
        if (!existing) {
            console.error(`Cannot update non-existent custom node: ${type}`);
            return null;
        }

        const now = new Date().toISOString();
        const updated: CustomNodeDefinition = {
            ...existing,
            ...updates,
            type: existing.type, // Prevent type change
            version: existing.version + 1,
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
     * Deletes a custom node from the catalog
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
