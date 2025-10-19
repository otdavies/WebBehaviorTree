/**
 * Blackboard: A key-value data store for sharing information between nodes.
 *
 * This implements the classic "Blackboard" pattern used in behavior trees,
 * allowing nodes to read and write shared state without tight coupling.
 */
export class Blackboard {
    private data: Map<string, any>;
    private accessLog: Map<string, Set<string>>; // Track which nodes access which keys

    constructor() {
        this.data = new Map();
        this.accessLog = new Map();
    }

    /**
     * Gets a value from the blackboard
     */
    get<T = any>(key: string, nodeId?: string): T | undefined {
        // Track access for future data flow visualization
        if (nodeId) {
            if (!this.accessLog.has(key)) {
                this.accessLog.set(key, new Set());
            }
            this.accessLog.get(key)!.add(nodeId);
        }

        return this.data.get(key) as T | undefined;
    }

    /**
     * Sets a value in the blackboard
     */
    set<T = any>(key: string, value: T, nodeId?: string): void {
        this.data.set(key, value);

        // Track write access
        if (nodeId) {
            if (!this.accessLog.has(key)) {
                this.accessLog.set(key, new Set());
            }
            this.accessLog.get(key)!.add(nodeId);
        }
    }

    /**
     * Checks if a key exists in the blackboard
     */
    has(key: string): boolean {
        return this.data.has(key);
    }

    /**
     * Deletes a key from the blackboard
     */
    delete(key: string): boolean {
        this.accessLog.delete(key);
        return this.data.delete(key);
    }

    /**
     * Clears all data from the blackboard
     */
    clear(): void {
        this.data.clear();
        this.accessLog.clear();
    }

    /**
     * Returns all keys in the blackboard
     */
    keys(): string[] {
        return Array.from(this.data.keys());
    }

    /**
     * Returns all key-value pairs
     */
    entries(): Array<[string, any]> {
        return Array.from(this.data.entries());
    }

    /**
     * Returns the number of entries
     */
    size(): number {
        return this.data.size;
    }

    /**
     * Gets all nodes that have accessed a specific key
     * (Useful for future data flow visualization)
     */
    getDependencies(key: string): string[] {
        const nodeIds = this.accessLog.get(key);
        return nodeIds ? Array.from(nodeIds) : [];
    }

    /**
     * Serializes the blackboard to JSON
     */
    toJSON(): Record<string, any> {
        const result: Record<string, any> = {};
        this.data.forEach((value, key) => {
            result[key] = value;
        });
        return result;
    }

    /**
     * Loads data from a JSON object
     */
    fromJSON(data: Record<string, any>): void {
        this.clear();
        Object.entries(data).forEach(([key, value]) => {
            this.data.set(key, value);
        });
    }

    /**
     * Creates a clone of this blackboard
     */
    clone(): Blackboard {
        const cloned = new Blackboard();
        cloned.fromJSON(this.toJSON());
        return cloned;
    }
}
