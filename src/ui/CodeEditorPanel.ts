import { TreeNode } from '../core/TreeNode.js';
import { EditorState } from '../state/EditorState.js';
import { UpdateNodeCodeOperation } from '../actions/EditorActions.js';
import { OperationHistory } from '../core/Operation.js';

declare const monaco: any;

/**
 * CodeEditorPanel: Manages the Monaco code editor panel
 */
export class CodeEditorPanel {
    private editorState: EditorState;
    private commandHistory: OperationHistory;
    private panel: HTMLElement;
    private btnClose: HTMLButtonElement;
    private btnSave: HTMLButtonElement;
    private btnSaveAsNew: HTMLButtonElement;
    private btnOverrideDefinition: HTMLButtonElement;
    private btnResyncWithLibrary: HTMLButtonElement;
    private btnUpdateToLatest: HTMLButtonElement;
    private btnSaveToCatalog: HTMLButtonElement;
    private editorContainer: HTMLElement;
    private nodeLabel: HTMLElement;
    private deviationIndicator: HTMLElement | null = null;
    private syncStatusIndicator: HTMLElement | null = null;
    private resizeHandle: HTMLElement | null = null;

    private monacoEditor: any = null;
    private currentNode: TreeNode | null = null;
    private defaultCode: string = '';

    // Resizing state
    private isResizing: boolean = false;
    private startX: number = 0;
    private startWidth: number = 0;

    constructor(editorState: EditorState, commandHistory: OperationHistory) {
        this.editorState = editorState;
        this.commandHistory = commandHistory;

        // Get DOM elements
        this.panel = document.getElementById('code-editor-panel')!;
        this.btnClose = document.getElementById('btn-close-editor') as HTMLButtonElement;
        this.editorContainer = document.getElementById('monaco-editor-container')!;
        this.nodeLabel = document.getElementById('editor-node-label')!;

        // Create buttons dynamically (icon-only buttons with tooltips)
        this.btnSave = this.createButton('btn-save', 'btn-editor btn-icon', '<i class="fas fa-save"></i>', 'Save (Ctrl+S)');
        this.btnSaveAsNew = this.createButton('btn-save-as-new', 'btn-editor btn-icon', '<i class="fas fa-plus-circle"></i>', 'Save as new custom node');
        this.btnOverrideDefinition = this.createButton('btn-override-def', 'btn-editor btn-icon', '<i class="fas fa-cloud-upload-alt"></i>', 'Push to library (update definition & sync all instances)');
        this.btnResyncWithLibrary = this.createButton('btn-resync', 'btn-editor btn-icon', '<i class="fas fa-undo"></i>', 'Revert to library version (discard changes)');
        this.btnUpdateToLatest = this.createButton('btn-update-latest', 'btn-editor btn-icon', '<i class="fas fa-cloud-download-alt"></i>', 'Pull from library (update to latest version)');
        this.btnSaveToCatalog = this.createButton('btn-save-catalog', 'btn-editor btn-icon', '<i class="fas fa-bookmark"></i>', 'Save as reusable custom node');

        this.setupResizeHandle();
        this.setupDeviationIndicator();
        this.setupSyncStatusIndicator();
        this.setupHeaderButtons();
        this.setupEventListeners();
        this.initializeMonaco();
    }

    /**
     * Creates a button element
     */
    private createButton(id: string, className: string, innerHTML: string, title: string): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = id;
        button.className = className;
        button.innerHTML = innerHTML;
        button.title = title;
        return button;
    }

    /**
     * Sets up the resize handle for horizontal resizing
     */
    private setupResizeHandle(): void {
        // Create resize handle
        this.resizeHandle = document.createElement('div');
        this.resizeHandle.className = 'panel-resize-handle';
        this.panel.insertBefore(this.resizeHandle, this.panel.firstChild);

        // Mouse events for resizing
        this.resizeHandle.addEventListener('mousedown', (e) => {
            this.isResizing = true;
            this.startX = e.clientX;
            this.startWidth = this.panel.offsetWidth;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isResizing) return;

            const deltaX = this.startX - e.clientX;
            const newWidth = Math.max(400, Math.min(1200, this.startWidth + deltaX));
            this.panel.style.width = `${newWidth}px`;
        });

        document.addEventListener('mouseup', () => {
            this.isResizing = false;
        });
    }

    /**
     * Sets up the deviation indicator
     */
    private setupDeviationIndicator(): void {
        const editorToolbar = this.panel.querySelector('.editor-toolbar');
        if (!editorToolbar) return;

        this.deviationIndicator = document.createElement('div');
        this.deviationIndicator.className = 'deviation-indicator hidden';
        this.deviationIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Modified';
        this.deviationIndicator.title = 'Code has been modified from default template';
        editorToolbar.appendChild(this.deviationIndicator);
    }

    /**
     * Sets up the sync status indicator
     */
    private setupSyncStatusIndicator(): void {
        const editorToolbar = this.panel.querySelector('.editor-toolbar');
        if (!editorToolbar) return;

        this.syncStatusIndicator = document.createElement('div');
        this.syncStatusIndicator.className = 'sync-status-indicator hidden';
        editorToolbar.appendChild(this.syncStatusIndicator);
    }

    /**
     * Sets up the header buttons
     */
    private setupHeaderButtons(): void {
        const editorToolbar = this.panel.querySelector('.editor-toolbar');
        if (!editorToolbar) return;

        // Add all buttons to toolbar
        editorToolbar.appendChild(this.btnSave);
        editorToolbar.appendChild(this.btnSaveAsNew);
        editorToolbar.appendChild(this.btnOverrideDefinition);
        editorToolbar.appendChild(this.btnResyncWithLibrary);
        editorToolbar.appendChild(this.btnUpdateToLatest);
        editorToolbar.appendChild(this.btnSaveToCatalog);

        // Event listeners
        this.btnSave.addEventListener('click', () => this.saveCodeAndFile());
        this.btnSaveAsNew.addEventListener('click', () => this.saveAsNewNode());
        this.btnOverrideDefinition.addEventListener('click', () => this.overrideExistingDefinition());
        this.btnResyncWithLibrary.addEventListener('click', () => this.resyncWithLibrary());
        this.btnUpdateToLatest.addEventListener('click', () => this.updateToLatestVersion());
        this.btnSaveToCatalog.addEventListener('click', () => this.saveToCatalog());
    }

    /**
     * Updates which buttons are visible based on node state
     */
    private updateButtonVisibility(): void {
        if (!this.currentNode) return;

        const isLibraryNode = !!this.currentNode.libraryType;
        const isModified = this.currentNode.isModified;

        let isOutOfSync = false;
        let libraryDef: any = null;

        if (isLibraryNode) {
            const CustomNodeCatalog = (window as any).CustomNodeCatalog;
            if (CustomNodeCatalog) {
                libraryDef = CustomNodeCatalog.getCustomNode(this.currentNode.libraryType);
                if (libraryDef) {
                    isOutOfSync = this.currentNode.libraryVersion !== libraryDef.version;
                }
            }
        }

        // Show/hide buttons based on state
        if (isLibraryNode) {
            // Library node - show most buttons
            this.btnSave.classList.remove('hidden');
            this.btnSaveAsNew.classList.remove('hidden');
            this.btnOverrideDefinition.classList.toggle('hidden', !libraryDef);
            this.btnResyncWithLibrary.classList.toggle('hidden', !isModified || !libraryDef);
            this.btnUpdateToLatest.classList.toggle('hidden', !isOutOfSync || !libraryDef);
            this.btnSaveToCatalog.classList.add('hidden');
        } else {
            // Regular action node - only show save as new and catalog
            this.btnSave.classList.add('hidden');
            this.btnSaveAsNew.classList.remove('hidden');
            this.btnOverrideDefinition.classList.add('hidden');
            this.btnResyncWithLibrary.classList.add('hidden');
            this.btnUpdateToLatest.classList.add('hidden');
            this.btnSaveToCatalog.classList.add('hidden');
        }
    }

    /**
     * Initializes Monaco editor
     */
    private initializeMonaco(): void {
        if (typeof monaco === 'undefined') {
            console.error('Monaco editor not loaded');
            return;
        }

        this.monacoEditor = monaco.editor.create(this.editorContainer, {
            value: '',
            language: 'javascript',
            theme: 'vs-dark',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            tabSize: 2
        });

        // Provide type definitions
        monaco.languages.typescript.javascriptDefaults.addExtraLib(`
            declare const blackboard: {
                get<T>(key: string): T | undefined;
                set<T>(key: string, value: T): void;
                has(key: string): boolean;
            };

            declare const NodeStatus: {
                SUCCESS: 'success';
                FAILURE: 'failure';
                RUNNING: 'running';
                IDLE: 'idle';
            };
        `, 'bt-types.d.ts');

        // Add Ctrl+S handler
        this.monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            this.saveCodeAndFile();
        });

        // Track changes to update deviation indicator
        this.monacoEditor.onDidChangeModelContent(() => {
            this.updateDeviationIndicator();
        });
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        this.btnClose.addEventListener('click', () => {
            this.hide();
        });
    }

    /**
     * Opens the editor for a node
     */
    public openForNode(node: TreeNode): void {
        this.currentNode = node;
        this.nodeLabel.textContent = node.label;

        // Apply node color to the badge
        this.nodeLabel.style.borderColor = node.color;
        this.nodeLabel.style.backgroundColor = this.hexToRgba(node.color, 0.1);

        // Store the default code for this node type
        this.defaultCode = this.getDefaultCodeForNode(node);

        if (this.monacoEditor) {
            this.monacoEditor.setValue(node.code || '');
        }

        this.updateDeviationIndicator();
        this.updateSyncStatusIndicator();
        this.updateButtonVisibility();
        this.show();
    }

    /**
     * Converts hex color to rgba with specified alpha
     */
    private hexToRgba(hex: string, alpha: number): string {
        // Remove # if present
        hex = hex.replace('#', '');

        // Parse hex values
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Gets the default code template for a node type
     * For custom nodes, returns the code from the catalog
     * For regular action nodes, returns the base template
     */
    private getDefaultCodeForNode(node: TreeNode): string {
        // Check if this is a custom node (type starts with "custom_")
        if (node.type.startsWith('custom_')) {
            const CustomNodeCatalog = (window as any).CustomNodeCatalog;
            if (CustomNodeCatalog) {
                const customNode = CustomNodeCatalog.getCustomNode(node.type);
                if (customNode && customNode.code) {
                    return customNode.code;
                }
            }
        }

        // Fall back to base action template
        const NodeExecutor = (window as any).NodeExecutor;
        if (NodeExecutor && typeof NodeExecutor.getDefaultCode === 'function') {
            return NodeExecutor.getDefaultCode();
        }
        return '';
    }

    /**
     * Updates the deviation indicator based on current code vs default
     * Note: Only shown for non-library nodes. Library nodes use sync status indicator instead.
     */
    private updateDeviationIndicator(): void {
        if (!this.deviationIndicator || !this.monacoEditor) return;

        // Only show deviation indicator for non-library nodes
        // Library nodes use the sync status indicator instead
        if (this.currentNode && this.currentNode.libraryType) {
            this.deviationIndicator.classList.add('hidden');
            return;
        }

        const currentCode = this.monacoEditor.getValue().trim();
        const hasDeviated = currentCode !== this.defaultCode.trim() && currentCode !== '';

        if (hasDeviated) {
            this.deviationIndicator.classList.remove('hidden');
        } else {
            this.deviationIndicator.classList.add('hidden');
        }
    }

    /**
     * Saves the code and triggers a full file save (Ctrl+S handler)
     */
    private saveCodeAndFile(): void {
        if (this.currentNode && this.monacoEditor) {
            const newCode = this.monacoEditor.getValue();
            const operation = new UpdateNodeCodeOperation(this.currentNode, newCode);
            this.commandHistory.execute(operation);

            // Mark node as modified ONLY if code differs from library definition
            if (this.currentNode.libraryType) {
                const CustomNodeCatalog = (window as any).CustomNodeCatalog;
                const libraryDef = CustomNodeCatalog?.getCustomNode(this.currentNode.libraryType);

                if (libraryDef) {
                    // Compare trimmed code to avoid whitespace-only differences
                    const codeMatches = newCode.trim() === libraryDef.code.trim();
                    this.currentNode.isModified = !codeMatches;
                } else {
                    // Library definition doesn't exist, mark as modified
                    this.currentNode.isModified = true;
                }
            }

            // Trigger file save callback if provided
            if (this.onSaveToFile) {
                this.onSaveToFile();
            }

            // Update indicators and button visibility
            this.updateSyncStatusIndicator();
            this.updateButtonVisibility();

            // Show visual feedback
            const originalIcon = this.btnSave.innerHTML;
            this.btnSave.innerHTML = '<i class="fas fa-check"></i>';
            this.btnSave.style.color = '#89D185';
            setTimeout(() => {
                this.btnSave.innerHTML = originalIcon;
                this.btnSave.style.color = '';
            }, 1000);
        }
    }

    /**
     * Saves as a new custom node in the library
     */
    private saveAsNewNode(): void {
        if (!this.currentNode || !this.monacoEditor) return;

        const nodeName = prompt('Enter a name for this custom node:', '');
        if (!nodeName || nodeName.trim() === '') return;

        const nodeDescription = prompt('Enter a description (optional):', '') || '';

        // Import CustomNodeCatalog
        const CustomNodeCatalog = (window as any).CustomNodeCatalog;
        if (!CustomNodeCatalog) {
            alert('Custom node catalog not available');
            return;
        }

        const code = this.monacoEditor.getValue();

        try {
            const customNodeDef = {
                type: `custom_${nodeName.toLowerCase().replace(/\s+/g, '_')}`,
                label: nodeName,
                description: nodeDescription,
                code: code,
                icon: this.currentNode.icon,
                category: 'leaf' as 'leaf',
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            CustomNodeCatalog.saveCustomNode(customNodeDef);

            // Trigger callback to register the custom node immediately
            if (this.onCustomNodeSaved) {
                this.onCustomNodeSaved(customNodeDef);
            }

            // Update current node to track the library
            this.currentNode.libraryType = customNodeDef.type;
            this.currentNode.libraryVersion = customNodeDef.version;
            this.currentNode.isModified = false;

            // Update indicators and button visibility
            this.updateSyncStatusIndicator();
            this.updateButtonVisibility();

            // Visual feedback
            const originalIcon = this.btnSaveAsNew.innerHTML;
            this.btnSaveAsNew.innerHTML = '<i class="fas fa-check"></i>';
            this.btnSaveAsNew.style.color = '#89D185';
            setTimeout(() => {
                this.btnSaveAsNew.innerHTML = originalIcon;
                this.btnSaveAsNew.style.color = '';
            }, 2000);

            alert(`Custom node "${nodeName}" created successfully!`);

        } catch (error) {
            alert('Failed to save custom node: ' + (error as Error).message);
        }
    }

    /**
     * Overrides the existing library definition and syncs all instances
     */
    private overrideExistingDefinition(): void {
        if (!this.currentNode || !this.monacoEditor) return;

        // Check if this node has a library type
        if (!this.currentNode.libraryType) {
            alert('This node is not associated with a library definition.\nUse "Save as New Node" to create a library definition first.');
            return;
        }

        const CustomNodeCatalog = (window as any).CustomNodeCatalog;
        if (!CustomNodeCatalog) {
            alert('Custom node catalog not available');
            return;
        }

        // Get the current library definition
        const libraryDef = CustomNodeCatalog.getCustomNode(this.currentNode.libraryType);
        if (!libraryDef) {
            alert(`Library definition for "${this.currentNode.libraryType}" not found.`);
            return;
        }

        // Confirm with user
        const confirmMsg = `This will update the library definition "${libraryDef.label}" and sync all non-modified instances.\n\nAre you sure?`;
        if (!confirm(confirmMsg)) {
            return;
        }

        const newCode = this.monacoEditor.getValue();

        try {
            // Update the library definition
            const updated = CustomNodeCatalog.updateCustomNode(this.currentNode.libraryType, {
                code: newCode,
                label: libraryDef.label,
                description: libraryDef.description,
                icon: libraryDef.icon,
                category: libraryDef.category
            });

            if (!updated) {
                alert('Failed to update library definition');
                return;
            }

            // Sync all non-modified instances
            if (this.onLibraryDefinitionUpdated) {
                this.onLibraryDefinitionUpdated(this.currentNode.libraryType, updated);
            }

            // Update current node
            this.currentNode.libraryVersion = updated.version;
            this.currentNode.isModified = false;

            // Trigger file save
            if (this.onSaveToFile) {
                this.onSaveToFile();
            }

            // Update indicators and button visibility
            this.updateSyncStatusIndicator();
            this.updateButtonVisibility();

            // Visual feedback
            const originalIcon = this.btnOverrideDefinition.innerHTML;
            this.btnOverrideDefinition.innerHTML = '<i class="fas fa-check"></i>';
            this.btnOverrideDefinition.style.color = '#89D185';
            setTimeout(() => {
                this.btnOverrideDefinition.innerHTML = originalIcon;
                this.btnOverrideDefinition.style.color = '';
            }, 2000);

            alert(`Library definition "${libraryDef.label}" updated to v${updated.version}.\nAll non-modified instances have been synced.`);

        } catch (error) {
            alert('Failed to override library definition: ' + (error as Error).message);
        }
    }

    /**
     * Resyncs the node with its library definition (abandons local changes)
     */
    private resyncWithLibrary(): void {
        if (!this.currentNode || !this.monacoEditor) return;

        if (!this.currentNode.libraryType) {
            alert('This node is not associated with a library definition.');
            return;
        }

        const CustomNodeCatalog = (window as any).CustomNodeCatalog;
        if (!CustomNodeCatalog) {
            alert('Custom node catalog not available');
            return;
        }

        const libraryDef = CustomNodeCatalog.getCustomNode(this.currentNode.libraryType);
        if (!libraryDef) {
            alert(`Library definition for "${this.currentNode.libraryType}" not found.`);
            return;
        }

        // Confirm with user
        const confirmMsg = `This will abandon your local changes and restore the library version (v${libraryDef.version}).\n\nAre you sure?`;
        if (!confirm(confirmMsg)) {
            return;
        }

        // Restore library code
        this.currentNode.code = libraryDef.code;
        this.currentNode.libraryVersion = libraryDef.version;
        this.currentNode.isModified = false;

        // Update editor
        this.monacoEditor.setValue(libraryDef.code);

        // Update indicators and button visibility
        this.updateDeviationIndicator();
        this.updateSyncStatusIndicator();
        this.updateButtonVisibility();

        // Save
        if (this.onSaveToFile) {
            this.onSaveToFile();
        }

        // Visual feedback
        const originalIcon = this.btnResyncWithLibrary.innerHTML;
        this.btnResyncWithLibrary.innerHTML = '<i class="fas fa-check"></i>';
        this.btnResyncWithLibrary.style.color = '#89D185';
        setTimeout(() => {
            this.btnResyncWithLibrary.innerHTML = originalIcon;
            this.btnResyncWithLibrary.style.color = '';
        }, 2000);

        console.log(`Node resynced with library v${libraryDef.version}`);
    }

    /**
     * Updates the node to the latest library version
     */
    private updateToLatestVersion(): void {
        if (!this.currentNode || !this.monacoEditor) return;

        if (!this.currentNode.libraryType) {
            alert('This node is not associated with a library definition.');
            return;
        }

        const CustomNodeCatalog = (window as any).CustomNodeCatalog;
        if (!CustomNodeCatalog) {
            alert('Custom node catalog not available');
            return;
        }

        const libraryDef = CustomNodeCatalog.getCustomNode(this.currentNode.libraryType);
        if (!libraryDef) {
            alert(`Library definition for "${this.currentNode.libraryType}" not found.`);
            return;
        }

        // Check if actually out of sync
        if (this.currentNode.libraryVersion === libraryDef.version) {
            alert('This node is already at the latest version.');
            return;
        }

        // Confirm with user (especially important if modified)
        let confirmMsg = `Update from v${this.currentNode.libraryVersion} to v${libraryDef.version}?`;
        if (this.currentNode.isModified) {
            confirmMsg = `This will update to v${libraryDef.version} and you will lose your local modifications.\n\nAre you sure?`;
        }
        if (!confirm(confirmMsg)) {
            return;
        }

        // Update to latest version
        this.currentNode.code = libraryDef.code;
        this.currentNode.libraryVersion = libraryDef.version;
        this.currentNode.isModified = false;

        // Update editor
        this.monacoEditor.setValue(libraryDef.code);

        // Update indicators and button visibility
        this.updateDeviationIndicator();
        this.updateSyncStatusIndicator();
        this.updateButtonVisibility();

        // Save
        if (this.onSaveToFile) {
            this.onSaveToFile();
        }

        // Visual feedback
        const originalIcon = this.btnUpdateToLatest.innerHTML;
        this.btnUpdateToLatest.innerHTML = '<i class="fas fa-check"></i>';
        this.btnUpdateToLatest.style.color = '#89D185';
        setTimeout(() => {
            this.btnUpdateToLatest.innerHTML = originalIcon;
            this.btnUpdateToLatest.style.color = '';
        }, 2000);

        console.log(`Node updated to library v${libraryDef.version}`);
    }

    /**
     * Updates the sync status indicator based on current node state
     */
    private updateSyncStatusIndicator(): void {
        if (!this.syncStatusIndicator || !this.currentNode) return;

        // Only show for nodes with a library type
        if (!this.currentNode.libraryType) {
            this.syncStatusIndicator.classList.add('hidden');
            return;
        }

        const CustomNodeCatalog = (window as any).CustomNodeCatalog;
        if (!CustomNodeCatalog) {
            this.syncStatusIndicator.classList.add('hidden');
            return;
        }

        const libraryDef = CustomNodeCatalog.getCustomNode(this.currentNode.libraryType);
        if (!libraryDef) {
            // Library definition doesn't exist (maybe deleted)
            this.syncStatusIndicator.className = 'sync-status-indicator out-of-sync';
            this.syncStatusIndicator.innerHTML = '<i class="fas fa-unlink"></i> Library definition not found';
            this.syncStatusIndicator.title = 'The library definition for this node no longer exists';
            this.syncStatusIndicator.classList.remove('hidden');
            return;
        }

        // Check if out of sync
        const isOutOfSync = this.currentNode.libraryVersion !== libraryDef.version;

        if (this.currentNode.isModified) {
            // Node is modified
            this.syncStatusIndicator.className = 'sync-status-indicator out-of-sync';
            this.syncStatusIndicator.innerHTML = '<i class="fas fa-edit"></i> Modified (not synced)';
            this.syncStatusIndicator.title = 'This node has been modified and will not receive library updates';
            this.syncStatusIndicator.classList.remove('hidden');
        } else if (isOutOfSync) {
            // Node is out of sync
            this.syncStatusIndicator.className = 'sync-status-indicator out-of-sync';
            this.syncStatusIndicator.innerHTML = `<i class="fas fa-exclamation-circle"></i> Out of sync (v${this.currentNode.libraryVersion} → v${libraryDef.version})`;
            this.syncStatusIndicator.title = 'A newer version is available in the library';
            this.syncStatusIndicator.classList.remove('hidden');
        } else {
            // Node is synced
            this.syncStatusIndicator.className = 'sync-status-indicator synced';
            this.syncStatusIndicator.innerHTML = `<i class="fas fa-check-circle"></i> Synced (v${libraryDef.version})`;
            this.syncStatusIndicator.title = 'This node is synced with the library';
            this.syncStatusIndicator.classList.remove('hidden');
        }
    }

    /**
     * Saves the current node to the custom node catalog
     */
    private saveToCatalog(): void {
        if (!this.currentNode || !this.monacoEditor) return;

        const nodeName = prompt('Enter a name for this custom node:', this.currentNode.label);
        if (!nodeName || nodeName.trim() === '') return;

        const nodeDescription = prompt('Enter a description (optional):', '') || '';

        // Import CustomNodeCatalog
        const CustomNodeCatalog = (window as any).CustomNodeCatalog;
        if (!CustomNodeCatalog) {
            alert('Custom node catalog not available');
            return;
        }

        const code = this.monacoEditor.getValue();

        try {
            const customNodeDef = {
                type: `custom_${nodeName.toLowerCase().replace(/\s+/g, '_')}`,
                label: nodeName,
                description: nodeDescription,
                code: code,
                icon: this.currentNode.icon,
                category: 'leaf' as 'leaf'
            };

            CustomNodeCatalog.saveCustomNode(customNodeDef);

            // Trigger callback to register the custom node immediately
            if (this.onCustomNodeSaved) {
                this.onCustomNodeSaved(customNodeDef);
            }

            // Visual feedback
            const originalIcon = this.btnSaveToCatalog.innerHTML;
            this.btnSaveToCatalog.innerHTML = '<i class="fas fa-check"></i>';
            this.btnSaveToCatalog.style.color = '#89D185';
            setTimeout(() => {
                this.btnSaveToCatalog.innerHTML = originalIcon;
                this.btnSaveToCatalog.style.color = '';
            }, 2000);

        } catch (error) {
            alert('Failed to save custom node: ' + (error as Error).message);
        }
    }

    /**
     * Callback for triggering full file save
     */
    public onSaveToFile?: () => void;

    /**
     * Callback for when a custom node is saved to the catalog
     */
    public onCustomNodeSaved?: (customNodeDef: any) => void;

    /**
     * Callback for when a library definition is updated (to sync all instances)
     */
    public onLibraryDefinitionUpdated?: (libraryType: string, updatedDef: any) => void;

    /**
     * Shows the panel
     */
    public show(): void {
        this.panel.classList.remove('hidden');
        this.editorState.isPanelOpen = 'code';

        // Focus the editor
        if (this.monacoEditor) {
            setTimeout(() => {
                this.monacoEditor.focus();
            }, 100);
        }
    }

    /**
     * Hides the panel
     */
    public hide(): void {
        this.panel.classList.add('hidden');
        if (this.editorState.isPanelOpen === 'code') {
            this.editorState.isPanelOpen = null;
        }
        this.currentNode = null;
    }
}
