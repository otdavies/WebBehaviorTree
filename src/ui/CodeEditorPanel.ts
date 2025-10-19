import { TreeNode } from '../core/TreeNode.js';
import { EditorState } from '../state/EditorState.js';

declare const monaco: any;

/**
 * CodeEditorPanel: Manages the Monaco code editor panel
 */
export class CodeEditorPanel {
    private editorState: EditorState;
    private panel: HTMLElement;
    private btnClose: HTMLButtonElement;
    private btnSave: HTMLButtonElement;
    private btnSaveToCatalog: HTMLButtonElement;
    private editorContainer: HTMLElement;
    private nodeLabel: HTMLElement;
    private deviationIndicator: HTMLElement | null = null;
    private resizeHandle: HTMLElement | null = null;

    private monacoEditor: any = null;
    private currentNode: TreeNode | null = null;
    private defaultCode: string = '';

    // Resizing state
    private isResizing: boolean = false;
    private startX: number = 0;
    private startWidth: number = 0;

    constructor(editorState: EditorState) {
        this.editorState = editorState;

        // Get DOM elements
        this.panel = document.getElementById('code-editor-panel')!;
        this.btnClose = document.getElementById('btn-close-editor') as HTMLButtonElement;
        this.editorContainer = document.getElementById('monaco-editor-container')!;
        this.nodeLabel = document.getElementById('editor-node-label')!;

        // Create buttons dynamically
        this.btnSave = this.createButton('btn-save-code', 'btn-primary', '<i class="fas fa-save"></i> Save', 'Save code (Ctrl+S)');
        this.btnSaveToCatalog = this.createButton('btn-save-catalog', 'btn-secondary', '<i class="fas fa-bookmark"></i> Save to Catalog', 'Save as reusable custom node');

        this.setupResizeHandle();
        this.setupDeviationIndicator();
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
            const newWidth = Math.max(300, Math.min(1200, this.startWidth + deltaX));
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
        const panelHeaderActions = this.panel.querySelector('.panel-header-actions');
        if (!panelHeaderActions) return;

        this.deviationIndicator = document.createElement('div');
        this.deviationIndicator.className = 'deviation-indicator hidden';
        this.deviationIndicator.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Modified';
        this.deviationIndicator.title = 'Code has been modified from default template';
        panelHeaderActions.appendChild(this.deviationIndicator);
    }

    /**
     * Sets up the header buttons
     */
    private setupHeaderButtons(): void {
        const panelHeaderActions = this.panel.querySelector('.panel-header-actions');
        if (!panelHeaderActions) return;

        // Add buttons to header (after deviation indicator)
        panelHeaderActions.appendChild(this.btnSave);
        panelHeaderActions.appendChild(this.btnSaveToCatalog);

        // Event listeners
        this.btnSave.addEventListener('click', () => {
            this.saveCodeAndFile();
        });

        this.btnSaveToCatalog.addEventListener('click', () => {
            this.saveToCatalog();
        });
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

        // Store the default code for this node type
        this.defaultCode = this.getDefaultCodeForNode(node);

        if (this.monacoEditor) {
            this.monacoEditor.setValue(node.code || '');
        }

        this.updateDeviationIndicator();
        this.show();
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
     */
    private updateDeviationIndicator(): void {
        if (!this.deviationIndicator || !this.monacoEditor) return;

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
            this.currentNode.code = this.monacoEditor.getValue();

            // Trigger file save callback if provided
            if (this.onSaveToFile) {
                this.onSaveToFile();
            }

            // Show visual feedback
            const saveBtn = this.btnSave;
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Saved';
            setTimeout(() => {
                saveBtn.innerHTML = originalText;
            }, 1000);
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
            const originalText = this.btnSaveToCatalog.innerHTML;
            this.btnSaveToCatalog.innerHTML = '<i class="fas fa-check"></i> Saved to Catalog';
            setTimeout(() => {
                this.btnSaveToCatalog.innerHTML = originalText;
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
