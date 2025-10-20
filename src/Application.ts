import { EditorState } from './state/EditorState.js';
import { Canvas } from './editor/Canvas.js';
import { InteractionManager } from './editor/InteractionManager.js';
import { Toolbar } from './ui/Toolbar.js';
import { StatusBar } from './ui/StatusBar.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { CodeEditorPanel } from './ui/CodeEditorPanel.js';
import { ContextMenu } from './ui/ContextMenu.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { ChatPanel } from './ui/ChatPanel.js';
import { Vector2 } from './utils/Vector2.js';
import { NodeExecutor } from './core/NodeExecutor.js';
import { NodeRegistry } from './core/NodeRegistry.js';
import { registerDefaultNodes } from './core/DefaultNodes.js';
import { CustomNodeCatalog } from './utils/CustomNodeCatalog.js';
import { CustomActionNode } from './nodes/leaves/CustomActionNode.js';
import { ModelInterface } from './ai/ModelInterface.js';
import { OpenRouterClient } from './ai/OpenRouterClient.js';
import { ChatHandler } from './ai/ChatHandler.js';
import { FileManager } from './utils/FileManager.js';
import { DemoTree } from './utils/DemoTree.js';
import { TreeNode } from './core/TreeNode.js';
import { AddNodeOperation, UpdateNodeCodeOperation, BatchOperation } from './operations/Operations.js';

/**
 * Application: Main application class that handles initialization and wiring
 *
 * This class encapsulates all application setup logic, reducing main.ts to just an entry point
 */
export class Application {
    private editorState!: EditorState;
    private canvas!: Canvas;
    private interactionManager!: InteractionManager;
    private toolbar!: Toolbar;
    private statusBar!: StatusBar;
    private settingsPanel!: SettingsPanel;
    private codeEditorPanel!: CodeEditorPanel;
    private contextMenu!: ContextMenu;
    private inspectorPanel!: InspectorPanel;
    private chatPanel!: ChatPanel;
    private modelInterface!: ModelInterface;
    private openRouterClient!: OpenRouterClient;
    private chatHandler!: ChatHandler;
    private fileManager!: FileManager;

    /**
     * Initializes the application
     */
    public initialize(): void {
        // Initialize catalogs and registries
        CustomNodeCatalog.initialize();
        registerDefaultNodes();
        CustomNodeCatalog.registerAllWithNodeRegistry(NodeRegistry, CustomActionNode);

        // Initialize core components
        this.initializeCore();

        // Initialize UI components
        this.initializeUI();

        // Initialize AI components
        this.initializeAI();

        // Wire up all callbacks
        this.wireUpCallbacks();

        // Load tree or create demo
        this.loadOrCreateDemoTree();

        // Build initial port cache
        this.canvas.rebuildPortCache();
    }

    /**
     * Initializes core components (state, canvas, interaction)
     */
    private initializeCore(): void {
        const canvasElement = document.getElementById('editor-canvas') as HTMLCanvasElement;
        if (!canvasElement) {
            throw new Error('Canvas element not found');
        }

        // Initialize state
        this.editorState = new EditorState();

        // Initialize canvas
        this.canvas = new Canvas(canvasElement, this.editorState);
        this.canvas.startRendering();

        // Hook into console.log from node execution
        NodeExecutor.onConsoleLog = (message: string, nodeId?: string) => {
            if (nodeId) {
                const node = this.editorState.findNodeById(nodeId);
                if (node) {
                    const messagePos = node.position.clone().add(new Vector2(0, -50));
                    this.canvas.floatingMessages.addMessage(messagePos, message, '#3498DB');
                }
            }
        };

        // Initialize interaction manager
        this.interactionManager = new InteractionManager(this.canvas, this.editorState, canvasElement);

        // Initialize file manager
        this.fileManager = new FileManager(
            this.editorState,
            this.canvas,
            () => CustomNodeCatalog.registerAllWithNodeRegistry(NodeRegistry, CustomActionNode)
        );
    }

    /**
     * Initializes UI components (panels, toolbar, etc.)
     */
    private initializeUI(): void {
        this.toolbar = new Toolbar(this.editorState.behaviorTree);
        this.statusBar = new StatusBar(this.editorState.behaviorTree, this.editorState);
        this.settingsPanel = new SettingsPanel(this.editorState, this.editorState.operationHistory);
        this.codeEditorPanel = new CodeEditorPanel(
            this.editorState,
            this.editorState.operationHistory,
            NodeExecutor,
            CustomNodeCatalog
        );
        this.contextMenu = new ContextMenu();
        this.inspectorPanel = new InspectorPanel(this.editorState.operationHistory);
        this.chatPanel = new ChatPanel();
    }

    /**
     * Initializes AI components
     */
    private initializeAI(): void {
        this.modelInterface = new ModelInterface(
            this.editorState,
            this.canvas.viewport,
            this.canvas.selectionManager,
            this.editorState.operationHistory
        );

        // Wire up code editor panel to model interface
        this.modelInterface.setCodeEditorPanel(this.codeEditorPanel);

        // Expose modelInterface globally for debugging
        (window as any).modelInterface = this.modelInterface;

        // Initialize OpenRouter client
        const apiKey = localStorage.getItem('openrouter_api_key');
        const model = localStorage.getItem('openrouter_model') || 'anthropic/claude-3.5-sonnet';
        this.openRouterClient = new OpenRouterClient();
        if (apiKey) {
            this.openRouterClient.initialize(apiKey);
        }
        this.openRouterClient.setModel(model);

        // Initialize chat handler
        this.chatHandler = new ChatHandler(
            this.chatPanel,
            this.editorState,
            this.modelInterface,
            this.openRouterClient,
            this.canvas,
            this.canvas.viewport,
            this.canvas.selectionManager
        );
        this.chatHandler.initialize();
    }

    /**
     * Wires up all callbacks between components
     */
    private wireUpCallbacks(): void {
        // Interaction manager callbacks
        this.interactionManager.onNodeDoubleClick = (node: TreeNode) => {
            if (node.category === 'leaf') {
                this.codeEditorPanel.openForNode(node);
            }
        };

        this.interactionManager.onContextMenu = (worldPos: Vector2) => {
            const canvasElement = document.getElementById('editor-canvas') as HTMLCanvasElement;
            const rect = canvasElement.getBoundingClientRect();
            const screenPos = this.canvas.worldToScreen(worldPos);
            this.contextMenu.show(
                rect.left + screenPos.x,
                rect.top + screenPos.y,
                worldPos
            );
        };

        this.interactionManager.onSave = () => this.fileManager.saveTree();

        // Toolbar callbacks
        this.toolbar.onSettingsClick = () => {
            this.settingsPanel.toggle();
        };

        // Settings panel callbacks
        this.settingsPanel.onExport = () => this.fileManager.exportTree();
        this.settingsPanel.onImport = (data: any) => this.fileManager.importTree(data);
        this.settingsPanel.onClear = () => this.fileManager.clearTree();

        // Code editor panel callbacks
        this.codeEditorPanel.onSaveToFile = () => this.fileManager.saveTree();

        this.codeEditorPanel.onCustomNodeSaved = (customNodeDef: any) => {
            // Register the custom node with NodeRegistry immediately
            NodeRegistry.register({
                type: customNodeDef.type,
                category: customNodeDef.category,
                label: customNodeDef.label,
                description: customNodeDef.description || 'Custom user-defined node',
                icon: customNodeDef.icon,
                factory: () => {
                    const node = new CustomActionNode(
                        customNodeDef.type,
                        customNodeDef.label,
                        customNodeDef.code,
                        customNodeDef.icon
                    );
                    node.libraryType = customNodeDef.type;
                    node.libraryVersion = customNodeDef.version;
                    node.isModified = false;
                    return node;
                },
                tags: customNodeDef.tags || ['custom', customNodeDef.label.toLowerCase()]
            });
        };

        this.codeEditorPanel.onLibraryDefinitionUpdated = (libraryType: string, updatedDef: any) => {
            const operations: UpdateNodeCodeOperation[] = [];

            // Find all nodes in the tree that match this library type
            for (const node of this.editorState.nodes) {
                if (node.libraryType !== libraryType || node.isModified) continue;

                // Create operation to update node code
                operations.push(new UpdateNodeCodeOperation(node, updatedDef.code));

                // Update library version metadata
                node.libraryVersion = updatedDef.version;
            }

            // Execute all code updates as a single undoable batch operation
            if (operations.length > 0) {
                const batchOp = new BatchOperation(
                    operations,
                    `Sync ${operations.length} node(s) to library ${updatedDef.label} v${updatedDef.version}`
                );
                this.editorState.operationHistory.execute(batchOp);
            }

            // Re-register the factory with updated code
            NodeRegistry.register({
                type: updatedDef.type,
                category: updatedDef.category,
                label: updatedDef.label,
                description: updatedDef.description || 'Custom user-defined node',
                icon: updatedDef.icon,
                factory: () => {
                    const node = new CustomActionNode(
                        updatedDef.type,
                        updatedDef.label,
                        updatedDef.code,
                        updatedDef.icon
                    );
                    node.libraryType = updatedDef.type;
                    node.libraryVersion = updatedDef.version;
                    node.isModified = false;
                    return node;
                },
                tags: updatedDef.tags || ['custom', updatedDef.label.toLowerCase()]
            });

            // Save the tree after syncing
            this.fileManager.saveTree();
        };

        // Context menu callbacks
        this.contextMenu.onNodeTypeSelect = (type: string, worldPos: Vector2) => {
            this.createNodeAtPosition(type, worldPos);
            this.statusBar.update();
            this.canvas.rebuildPortCache();
        };

        // Selection manager callbacks
        this.canvas.selectionManager.onSelectionChange = (selectedNodes: TreeNode[]) => {
            if (selectedNodes.length === 1) {
                this.inspectorPanel.inspect(selectedNodes[0]);
            } else if (selectedNodes.length === 0) {
                this.inspectorPanel.inspect(null);
            } else {
                this.inspectorPanel.inspect(null);
            }
        };

        // Behavior tree tick hook
        this.setupBehaviorTreeTickHook();

        // Update blackboard inspector periodically
        setInterval(() => {
            if (this.editorState.isPanelOpen === 'settings') {
                this.settingsPanel.updateBlackboard();
            }
        }, 500);
    }

    /**
     * Sets up the behavior tree tick hook for status updates
     */
    private setupBehaviorTreeTickHook(): void {
        let previousNodeStatuses = new Map<string, string>();

        this.editorState.behaviorTree.onTick(() => {
            // Update status bar on each tick
            this.statusBar.update();

            // Check all nodes for status changes
            this.editorState.nodes.forEach(node => {
                const prevStatus = previousNodeStatuses.get(node.id);
                const currentStatus = node.status;

                // Show message for action nodes when they complete
                if (node.type === 'action' && prevStatus !== currentStatus) {
                    const messagePos = node.position.clone().add(new Vector2(0, -50));

                    if (currentStatus === 'success') {
                        this.canvas.floatingMessages.addMessage(messagePos, '✓ Success', '#27AE60');
                    } else if (currentStatus === 'failure') {
                        this.canvas.floatingMessages.addMessage(messagePos, '✗ Failure', '#E74C3C');
                    } else if (currentStatus === 'running') {
                        this.canvas.floatingMessages.addMessage(messagePos, '→ Running', '#F1C40F');
                    }
                }

                previousNodeStatuses.set(node.id, currentStatus);
            });
        });
    }

    /**
     * Creates a node at a given world position
     */
    private createNodeAtPosition(type: string, worldPos: Vector2): TreeNode {
        const node = NodeRegistry.create(type);
        if (!node) {
            throw new Error(`Failed to create node of type: ${type}`);
        }

        node.position = worldPos;

        const operation = new AddNodeOperation(this.editorState, node);
        this.editorState.operationHistory.execute(operation);

        return node;
    }

    /**
     * Loads tree from storage or creates a demo tree
     */
    private loadOrCreateDemoTree(): void {
        const loaded = this.fileManager.loadTreeFromStorage();
        if (!loaded) {
            const demoTree = new DemoTree(this.editorState);
            demoTree.create();
        }
    }
}
