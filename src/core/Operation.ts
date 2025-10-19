/**
 * Operation: Interface for undoable operations using the Command pattern
 */
export interface Operation {
    /**
     * Executes the operation
     */
    execute(): void;

    /**
     * Undoes the operation (reverses the execute operation)
     */
    undo(): void;

    /**
     * Optional: Redoes the operation (same as execute, but can be overridden)
     */
    redo?(): void;

    /**
     * Description of the operation for display purposes
     */
    description: string;
}

/**
 * OperationHistory: Manages undo/redo stacks
 */
export class OperationHistory {
    private undoStack: Operation[] = [];
    private redoStack: Operation[] = [];
    private maxStackSize: number = 100;

    /**
     * Executes an operation and adds it to the undo stack
     */
    public execute(operation: Operation): void {
        operation.execute();
        this.undoStack.push(operation);
        this.redoStack = []; // Clear redo stack when new operation is executed

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Records an operation that has already been executed (for operations that
     * mutate state before creating the operation, like drag operations)
     */
    public recordCompleted(operation: Operation): void {
        this.undoStack.push(operation);
        this.redoStack = []; // Clear redo stack when new operation is recorded

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undoes the last operation
     */
    public undo(): boolean {
        if (!this.canUndo()) {
            return false;
        }

        const operation = this.undoStack.pop()!;
        operation.undo();
        this.redoStack.push(operation);
        return true;
    }

    /**
     * Redoes the last undone operation
     */
    public redo(): boolean {
        if (!this.canRedo()) {
            return false;
        }

        const operation = this.redoStack.pop()!;
        if (operation.redo) {
            operation.redo();
        } else {
            operation.execute();
        }
        this.undoStack.push(operation);
        return true;
    }

    /**
     * Checks if undo is available
     */
    public canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    /**
     * Checks if redo is available
     */
    public canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    /**
     * Gets the description of the next undo action
     */
    public getUndoDescription(): string | null {
        if (!this.canUndo()) return null;
        return this.undoStack[this.undoStack.length - 1].description;
    }

    /**
     * Gets the description of the next redo action
     */
    public getRedoDescription(): string | null {
        if (!this.canRedo()) return null;
        return this.redoStack[this.redoStack.length - 1].description;
    }

    /**
     * Clears all history
     */
    public clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Gets the size of the undo stack
     */
    public getUndoStackSize(): number {
        return this.undoStack.length;
    }

    /**
     * Gets the size of the redo stack
     */
    public getRedoStackSize(): number {
        return this.redoStack.length;
    }
}
