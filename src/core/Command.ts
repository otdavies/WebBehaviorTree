/**
 * Command: Interface for undoable actions using the Command pattern
 */
export interface Command {
    /**
     * Executes the command
     */
    execute(): void;

    /**
     * Undoes the command (reverses the execute operation)
     */
    undo(): void;

    /**
     * Optional: Redoes the command (same as execute, but can be overridden)
     */
    redo?(): void;

    /**
     * Description of the command for display purposes
     */
    description: string;
}

/**
 * CommandHistory: Manages undo/redo stacks
 */
export class CommandHistory {
    private undoStack: Command[] = [];
    private redoStack: Command[] = [];
    private maxStackSize: number = 100;

    /**
     * Executes a command and adds it to the undo stack
     */
    public execute(command: Command): void {
        command.execute();
        this.undoStack.push(command);
        this.redoStack = []; // Clear redo stack when new command is executed

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }
    }

    /**
     * Undoes the last command
     */
    public undo(): boolean {
        if (!this.canUndo()) {
            return false;
        }

        const command = this.undoStack.pop()!;
        command.undo();
        this.redoStack.push(command);
        return true;
    }

    /**
     * Redoes the last undone command
     */
    public redo(): boolean {
        if (!this.canRedo()) {
            return false;
        }

        const command = this.redoStack.pop()!;
        if (command.redo) {
            command.redo();
        } else {
            command.execute();
        }
        this.undoStack.push(command);
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
