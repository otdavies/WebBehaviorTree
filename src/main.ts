/**
 * Behavior Tree Editor - Main Entry Point
 */

import { TreeNode } from './core/TreeNode.js';
import { EditorState } from './state/EditorState.js';
import { Canvas } from './editor/Canvas.js';
import { InteractionManager } from './editor/InteractionManager.js';
import { Toolbar } from './ui/Toolbar.js';
import { SettingsPanel } from './ui/SettingsPanel.js';
import { CodeEditorPanel } from './ui/CodeEditorPanel.js';
import { ContextMenu } from './ui/ContextMenu.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { FileIO } from './utils/FileIO.js';
import { Vector2 } from './utils/Vector2.js';
import { NodeExecutor } from './core/NodeExecutor.js';
import { NodeRegistry } from './core/NodeRegistry.js';
import { registerDefaultNodes } from './core/DefaultNodes.js';
import { Toast } from './ui/Toast.js';
import { CustomNodeCatalog } from './utils/CustomNodeCatalog.js';
import { CustomActionNode } from './nodes/leaves/CustomActionNode.js';
import { AddNodeAction, ClearAllNodesAction, ImportTreeAction } from './actions/EditorActions.js';

// Make NodeExecutor and CustomNodeCatalog available globally for CodeEditorPanel
(window as any).NodeExecutor = NodeExecutor;
(window as any).CustomNodeCatalog = CustomNodeCatalog;

// Initialize custom node catalog
CustomNodeCatalog.initialize();

// Register all default node types
registerDefaultNodes();

// Register custom nodes from catalog
registerCustomNodesFromCatalog();

console.log('Behavior Tree Editor starting...');

/**
 * Registers all custom nodes from the catalog with the NodeRegistry
 */
function registerCustomNodesFromCatalog(): void {
    const customNodes = CustomNodeCatalog.getAllCustomNodes();

    for (const customNode of customNodes) {
        NodeRegistry.register({
            type: customNode.type,
            category: customNode.category,
            label: customNode.label,
            description: customNode.description || 'Custom user-defined node',
            icon: customNode.icon,
            factory: () => new CustomActionNode(
                customNode.type,
                customNode.label,
                customNode.code,
                customNode.icon
            ),
            tags: customNode.tags || ['custom', customNode.label.toLowerCase()]
        });
    }

    if (customNodes.length > 0) {
        console.log(`Registered ${customNodes.length} custom node(s) from catalog`);
    }
}

// Global application state
let editorState: EditorState;
let canvas: Canvas;
let interactionManager: InteractionManager;
let toolbar: Toolbar;
let settingsPanel: SettingsPanel;
let codeEditorPanel: CodeEditorPanel;
let contextMenu: ContextMenu;
let inspectorPanel: InspectorPanel;

/**
 * Creates a node by type using the NodeRegistry
 */
function createNodeByType(type: string): TreeNode {
    const node = NodeRegistry.create(type);
    if (!node) {
        throw new Error(`Failed to create node of type: ${type}`);
    }
    return node;
}

/**
 * Creates a new node at a given world position
 * Uses AddNodeAction for undo/redo support
 */
function createNode(type: string, worldPos: Vector2): TreeNode {
    const node = createNodeByType(type);
    node.position = worldPos;

    // Use action for undo/redo support
    const action = new AddNodeAction(editorState, node);
    editorState.commandHistory.execute(action);

    return node;
}

/**
 * Exports the current tree to JSON
 * Exports ALL nodes from editorState, including disconnected ones
 */
function exportTree(): void {
    // Serialize all nodes from EditorState (not just from BehaviorTree)
    const data = {
        version: '1.2',
        metadata: {
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            nodeCount: editorState.nodes.length,
            editorVersion: 1.2
        },
        tree: {
            nodes: editorState.nodes.map(node => node.toJSON()),
            root: editorState.behaviorTree.root?.id || null
        },
        blackboard: {
            initialValues: editorState.behaviorTree.blackboard.toJSON()
        },
        customNodes: CustomNodeCatalog.exportCustomNodes()
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    FileIO.downloadJSON(data, `behavior-tree-${timestamp}.json`);
    console.log('Tree exported successfully');
}

/**
 * Saves the current tree to localStorage
 * Saves ALL nodes from editorState, including disconnected ones
 */
function saveTree(): void {
    try {
        // Serialize all nodes from EditorState (not just from BehaviorTree)
        const data = {
            version: '1.2',
            metadata: {
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                nodeCount: editorState.nodes.length,
                editorVersion: 1.2
            },
            tree: {
                nodes: editorState.nodes.map(node => node.toJSON()),
                root: editorState.behaviorTree.root?.id || null
            },
            blackboard: {
                initialValues: editorState.behaviorTree.blackboard.toJSON()
            },
            customNodes: CustomNodeCatalog.exportCustomNodes()
        };

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
function importTree(data: any): void {
    try {
        // Import custom nodes if present
        if (data.customNodes && Array.isArray(data.customNodes)) {
            CustomNodeCatalog.importCustomNodes(data.customNodes);

            // Re-register custom nodes with NodeRegistry
            registerCustomNodesFromCatalog();

            console.log(`Imported ${data.customNodes.length} custom node definition(s)`);
        }

        // Use ImportTreeAction for undo/redo support
        const action = new ImportTreeAction(editorState, data);
        editorState.commandHistory.execute(action);

        Toast.show('Tree loaded successfully', 2000);
        console.log('Tree imported successfully');
    } catch (error) {
        console.error('Failed to import tree:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        alert('Failed to import tree: ' + errorMsg);
    }
}

/**
 * Loads the tree from localStorage (auto-load on startup)
 * Note: Uses ImportTreeAction directly (not via commandHistory) since this
 * is an initialization step that shouldn't be undoable
 */
function loadTreeFromStorage(): boolean {
    try {
        const data = FileIO.loadFromLocalStorage();
        if (data) {
            // Use action directly for consistency, but don't add to history
            const action = new ImportTreeAction(editorState, data);
            action.execute();
            console.log('Tree loaded from localStorage');
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
function clearTree(): void {
    const action = new ClearAllNodesAction(editorState);
    editorState.commandHistory.execute(action);
    console.log('Tree cleared');
}

/**
 * Initializes the application
 */
function initializeApp(): void {
    console.log('Initializing application...');

    // Get canvas element
    const canvasElement = document.getElementById('editor-canvas') as HTMLCanvasElement;
    if (!canvasElement) {
        throw new Error('Canvas element not found');
    }

    // Initialize state
    editorState = new EditorState();

    // Initialize canvas
    canvas = new Canvas(canvasElement, editorState);
    canvas.startRendering();

    // Hook into console.log from node execution to show floating messages
    NodeExecutor.onConsoleLog = (message: string, nodeId?: string) => {
        if (nodeId) {
            const node = editorState.findNodeById(nodeId);
            if (node) {
                const messagePos = node.position.clone().add(new Vector2(0, -50));
                canvas.floatingMessages.addMessage(messagePos, message, '#3498DB');
            }
        }
    };

    // Initialize interaction manager
    interactionManager = new InteractionManager(canvas, editorState, canvasElement);

    // Handle double-click to edit code (all leaf nodes have code)
    interactionManager.onNodeDoubleClick = (node: TreeNode) => {
        if (node.category === 'leaf') {
            codeEditorPanel.openForNode(node);
        }
    };

    // Handle context menu
    interactionManager.onContextMenu = (worldPos: Vector2) => {
        const rect = canvasElement.getBoundingClientRect();
        const screenPos = canvas.worldToScreen(worldPos);
        contextMenu.show(
            rect.left + screenPos.x,
            rect.top + screenPos.y,
            worldPos
        );
    };

    // Initialize UI components
    toolbar = new Toolbar(editorState.behaviorTree);
    settingsPanel = new SettingsPanel(editorState, editorState.commandHistory);
    codeEditorPanel = new CodeEditorPanel(editorState, editorState.commandHistory);
    contextMenu = new ContextMenu();
    inspectorPanel = new InspectorPanel(editorState.commandHistory);

    // Wire up code editor panel save callback (for Ctrl+S)
    codeEditorPanel.onSaveToFile = saveTree;

    // Wire up custom node saved callback
    codeEditorPanel.onCustomNodeSaved = (customNodeDef: any) => {
        // Register the custom node with NodeRegistry immediately
        NodeRegistry.register({
            type: customNodeDef.type,
            category: customNodeDef.category,
            label: customNodeDef.label,
            description: customNodeDef.description || 'Custom user-defined node',
            icon: customNodeDef.icon,
            factory: () => new CustomActionNode(
                customNodeDef.type,
                customNodeDef.label,
                customNodeDef.code,
                customNodeDef.icon
            ),
            tags: customNodeDef.tags || ['custom', customNodeDef.label.toLowerCase()]
        });
        console.log(`Registered custom node "${customNodeDef.label}" immediately`);
    };

    // Wire up toolbar
    toolbar.onSettingsClick = () => {
        settingsPanel.toggle();
    };

    // Wire up settings panel
    settingsPanel.onExport = exportTree;
    settingsPanel.onImport = importTree;
    settingsPanel.onClear = clearTree;

    // Wire up context menu
    contextMenu.onNodeTypeSelect = (type: string, worldPos: Vector2) => {
        createNode(type, worldPos);
    };

    // Wire up inspector panel
    canvas.selectionManager.onSelectionChange = (selectedNodes: TreeNode[]) => {
        // Show the first selected node in the inspector
        if (selectedNodes.length === 1) {
            inspectorPanel.inspect(selectedNodes[0]);
        } else if (selectedNodes.length === 0) {
            inspectorPanel.inspect(null);
        } else {
            // Multiple nodes selected - could show multi-edit in the future
            inspectorPanel.inspect(null);
        }
    };

    // Wire up save shortcut (Ctrl+S)
    interactionManager.onSave = saveTree;

    // Update blackboard inspector periodically
    setInterval(() => {
        if (editorState.isPanelOpen === 'settings') {
            settingsPanel.updateBlackboard();
        }
    }, 500);

    // Hook into behavior tree tick to show floating messages for node execution
    let previousNodeStatuses = new Map<string, string>();

    editorState.behaviorTree.onTick(() => {
        // Check all nodes for status changes
        editorState.nodes.forEach(node => {
            const prevStatus = previousNodeStatuses.get(node.id);
            const currentStatus = node.status;

            // Show message for action nodes when they complete
            if (node.type === 'action' && prevStatus !== currentStatus) {
                if (currentStatus === 'success') {
                    const messagePos = node.position.clone().add(new Vector2(0, -50));
                    canvas.floatingMessages.addMessage(messagePos, '✓ Success', '#27AE60');
                } else if (currentStatus === 'failure') {
                    const messagePos = node.position.clone().add(new Vector2(0, -50));
                    canvas.floatingMessages.addMessage(messagePos, '✗ Failure', '#E74C3C');
                } else if (currentStatus === 'running') {
                    const messagePos = node.position.clone().add(new Vector2(0, -50));
                    canvas.floatingMessages.addMessage(messagePos, '→ Running', '#F1C40F');
                }
            }

            previousNodeStatuses.set(node.id, currentStatus);
        });
    });

    // Try to load from localStorage first, if nothing found create demo tree
    const loaded = loadTreeFromStorage();
    if (!loaded) {
        createDemoTree();
    }

    console.log('Application initialized successfully!');
}

/**
 * Creates a demo tree to showcase the editor
 */
function createDemoTree(): void {
    // Create a simple demo tree
    const root = createNode('sequence', new Vector2(0, -100));
    const action1 = createNode('action', new Vector2(-100, 100));
    const action2 = createNode('action', new Vector2(100, 100));

    // Set labels
    root.label = 'Main Sequence';
    action1.label = 'Action 1';
    action2.label = 'Action 2';

    // Set demo code
    action1.code = `// Example: Set a value in the blackboard
blackboard.set('counter', 1);
console.log('Action 1 executed');
return NodeStatus.SUCCESS;`;

    action2.code = `// Example: Read from blackboard
const counter = blackboard.get('counter') || 0;
console.log('Counter value:', counter);
return NodeStatus.SUCCESS;`;

    // Connect nodes
    editorState.connectNodes(root, action1);
    editorState.connectNodes(root, action2);

    // Set as root
    editorState.behaviorTree.setRoot(root);

    console.log('Demo tree created');
}

// Wait for DOM and Monaco to be ready
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, waiting for Monaco...');

    const initApp = () => {
        try {
            initializeApp();
        } catch (error) {
            console.error('Failed to initialize application:', error);
        }
    };

    // Check if Monaco is already loaded
    if ((window as any).monacoLoaded) {
        initApp();
    } else {
        // Wait for Monaco to load
        window.addEventListener('monaco-loaded', initApp);
    }
});
