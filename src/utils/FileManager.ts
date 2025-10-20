import { EditorState } from '../state/EditorState.js';
import { Canvas } from '../editor/Canvas.js';
import { FileIO } from './FileIO.js';
import { CustomNodeCatalog } from './CustomNodeCatalog.js';
import { Toast } from '../ui/Toast.js';
import { ImportTreeOperation, ClearAllNodesOperation } from '../operations/Operations.js';

/**
 * FileManager: Handles all file I/O operations for behavior trees
 *
 * Encapsulates export, import, save, load, and clear operations
 */
export class FileManager {
    constructor(
        private editorState: EditorState,
        private canvas: Canvas,
        private onCustomNodesImported?: () => void
    ) {}

    /**
     * Exports the current tree to a JSON file download
     * Exports ALL nodes from editorState, including disconnected ones
     */
    public exportTree(): void {
        const data = this.serializeTree();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        FileIO.downloadJSON(data, `behavior-tree-${timestamp}.json`);
    }

    /**
     * Saves the current tree to localStorage
     * Saves ALL nodes from editorState, including disconnected ones
     */
    public saveTree(): void {
        try {
            const data = this.serializeTree();
            const result = FileIO.saveToLocalStorage(data);

            if (result.success) {
                Toast.show('Saved', 1500);
            } else {
                Toast.show(result.error || 'Save failed', 2000);
            }
        } catch (error) {
            console.error('Failed to save tree:', error);
            Toast.show('Save failed', 2000);
        }
    }

    /**
     * Imports a tree from JSON data
     */
    public importTree(data: any): void {
        try {
            // Import custom nodes if present
            if (data.customNodes && Array.isArray(data.customNodes)) {
                CustomNodeCatalog.importCustomNodes(data.customNodes);

                // Notify that custom nodes were imported (for re-registration)
                if (this.onCustomNodesImported) {
                    this.onCustomNodesImported();
                }
            }

            // Use ImportTreeOperation for undo/redo support
            const operation = new ImportTreeOperation(this.editorState, data);
            this.editorState.operationHistory.execute(operation);

            // Rebuild port cache after importing
            this.canvas.rebuildPortCache();

            Toast.show('Tree loaded successfully', 2000);
        } catch (error) {
            console.error('Failed to import tree:', error);
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            alert('Failed to import tree: ' + errorMsg);
        }
    }

    /**
     * Loads the tree from localStorage (auto-load on startup)
     * Note: Uses ImportTreeOperation directly (not via history) since this
     * is an initialization step that shouldn't be undoable
     */
    public loadTreeFromStorage(): boolean {
        try {
            const data = FileIO.loadFromLocalStorage();
            if (data) {
                // Import custom nodes if present
                if (data.customNodes && Array.isArray(data.customNodes)) {
                    CustomNodeCatalog.importCustomNodes(data.customNodes);

                    // Notify that custom nodes were imported (for re-registration)
                    if (this.onCustomNodesImported) {
                        this.onCustomNodesImported();
                    }
                }

                // Use operation directly for consistency, but don't add to history
                const operation = new ImportTreeOperation(this.editorState, data);
                operation.execute();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            // Clear corrupted data
            localStorage.removeItem('behaviorTree_autosave');
            return false;
        }
    }

    /**
     * Clears the entire tree
     */
    public clearTree(): void {
        const operation = new ClearAllNodesOperation(this.editorState);
        this.editorState.operationHistory.execute(operation);
        // Rebuild port cache after clearing
        this.canvas.rebuildPortCache();
    }

    /**
     * Serializes the current tree to JSON
     */
    private serializeTree(): any {
        return {
            version: '1.2',
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                nodeCount: this.editorState.nodes.length,
                editorVersion: 1.2
            },
            tree: {
                nodes: this.editorState.nodes.map(node => node.toJSON()),
                root: this.editorState.behaviorTree.root?.id || null
            },
            blackboard: {
                initialValues: this.editorState.behaviorTree.blackboard.toJSON()
            },
            customNodes: CustomNodeCatalog.exportCustomNodes()
        };
    }
}
