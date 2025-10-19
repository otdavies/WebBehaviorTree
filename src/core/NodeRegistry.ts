import { TreeNode } from './TreeNode.js';

/**
 * Node registration entry
 */
export interface NodeRegistration {
    type: string;
    category: 'composite' | 'decorator' | 'leaf';
    label: string;
    description: string;
    icon: string;
    factory: () => TreeNode;
    tags?: string[]; // For search/filtering
}

/**
 * NodeRegistry: Centralized registry for all available node types.
 *
 * This allows for:
 * - Easy addition of new node types
 * - Search and filtering
 * - Dynamic context menu generation
 * - Future extensibility (plugins, custom nodes, etc.)
 */
export class NodeRegistry {
    private static registrations: Map<string, NodeRegistration> = new Map();

    /**
     * Registers a new node type
     */
    public static register(registration: NodeRegistration): void {
        this.registrations.set(registration.type, registration);
    }

    /**
     * Gets a registration by type
     */
    public static get(type: string): NodeRegistration | undefined {
        return this.registrations.get(type);
    }

    /**
     * Creates a node instance by type
     */
    public static create(type: string): TreeNode | null {
        const registration = this.registrations.get(type);
        if (!registration) {
            console.error(`Node type "${type}" not found in registry`);
            return null;
        }
        return registration.factory();
    }

    /**
     * Gets all registrations
     */
    public static getAll(): NodeRegistration[] {
        return Array.from(this.registrations.values());
    }

    /**
     * Gets registrations by category
     */
    public static getByCategory(category: 'composite' | 'decorator' | 'leaf'): NodeRegistration[] {
        return Array.from(this.registrations.values())
            .filter(reg => reg.category === category);
    }

    /**
     * Searches registrations by query string
     * Searches in: label, description, type, tags
     */
    public static search(query: string): NodeRegistration[] {
        if (!query || query.trim() === '') {
            return this.getAll();
        }

        const lowerQuery = query.toLowerCase();

        return Array.from(this.registrations.values())
            .filter(reg => {
                // Search in label
                if (reg.label.toLowerCase().includes(lowerQuery)) {
                    return true;
                }

                // Search in description
                if (reg.description.toLowerCase().includes(lowerQuery)) {
                    return true;
                }

                // Search in type
                if (reg.type.toLowerCase().includes(lowerQuery)) {
                    return true;
                }

                // Search in tags
                if (reg.tags && reg.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                    return true;
                }

                return false;
            });
    }

    /**
     * Clears all registrations (useful for testing)
     */
    public static clear(): void {
        this.registrations.clear();
    }

    /**
     * Gets the number of registered nodes
     */
    public static count(): number {
        return this.registrations.size;
    }

    /**
     * Unregisters a node type (useful for removing custom nodes)
     */
    public static unregister(type: string): boolean {
        return this.registrations.delete(type);
    }

    /**
     * Checks if a node type is registered
     */
    public static has(type: string): boolean {
        return this.registrations.has(type);
    }
}
