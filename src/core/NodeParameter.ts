/**
 * Parameter types supported by the inspector
 */
export type ParameterType = 'number' | 'string' | 'boolean' | 'select';

/**
 * Definition of an exposed node parameter
 */
export interface ParameterDefinition {
    type: ParameterType;
    label: string;
    defaultValue: any;
    min?: number;        // For number type
    max?: number;        // For number type
    options?: string[];  // For select type
    description?: string;
}

/**
 * Helper class for managing node parameters
 */
export class NodeParameters {
    private definitions: Map<string, ParameterDefinition> = new Map();
    private values: Record<string, any> = {};

    /**
     * Defines a new parameter
     */
    public define(name: string, definition: ParameterDefinition): void {
        this.definitions.set(name, definition);

        // Initialize with default value if not already set
        if (this.values[name] === undefined) {
            this.values[name] = definition.defaultValue;
        }
    }

    /**
     * Gets a parameter value
     */
    public get<T = any>(name: string): T {
        return this.values[name] as T;
    }

    /**
     * Sets a parameter value
     */
    public set(name: string, value: any): void {
        const definition = this.definitions.get(name);
        if (!definition) {
            console.warn(`Parameter "${name}" is not defined`);
            return;
        }

        // Type validation and coercion
        switch (definition.type) {
            case 'number':
                value = Number(value);

                // Validate that conversion resulted in a valid number
                if (isNaN(value)) {
                    console.error(`Invalid number for parameter "${name}". Value must be a valid number.`);
                    return;
                }

                // Apply min/max constraints
                if (definition.min !== undefined) {
                    value = Math.max(definition.min, value);
                }
                if (definition.max !== undefined) {
                    value = Math.min(definition.max, value);
                }
                break;

            case 'string':
                value = String(value);
                break;

            case 'boolean':
                value = Boolean(value);
                break;

            case 'select':
                // Validate that the value is one of the allowed options
                if (definition.options && !definition.options.includes(value)) {
                    console.error(
                        `Invalid option for parameter "${name}": "${value}". ` +
                        `Valid options: ${definition.options.join(', ')}`
                    );
                    return;
                }
                break;
        }

        this.values[name] = value;
    }

    /**
     * Gets all parameter definitions
     */
    public getDefinitions(): Map<string, ParameterDefinition> {
        return this.definitions;
    }

    /**
     * Gets all parameter values
     */
    public getValues(): Record<string, any> {
        return { ...this.values };
    }

    /**
     * Sets all parameter values (e.g., when loading from JSON)
     */
    public setValues(values: Record<string, any>): void {
        Object.entries(values).forEach(([name, value]) => {
            if (this.definitions.has(name)) {
                this.set(name, value);
            }
        });
    }

    /**
     * Clears all parameters
     */
    public clear(): void {
        this.definitions.clear();
        this.values = {};
    }

    /**
     * Serializes parameter values to JSON
     */
    public toJSON(): Record<string, any> {
        return this.getValues();
    }

    /**
     * Loads parameter values from JSON
     */
    public fromJSON(data: Record<string, any>): void {
        this.setValues(data);
    }
}
