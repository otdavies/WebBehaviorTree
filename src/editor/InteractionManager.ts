import { Canvas } from './Canvas.js';
import { EditorState } from '../state/EditorState.js';
import { TreeNode } from '../core/TreeNode.js';
import { Vector2 } from '../utils/Vector2.js';
import {
    RemoveNodesOperation,
    MoveNodesOperation,
    AddNodeOperation,
    ConnectNodesOperation,
    DisconnectNodeOperation
} from '../actions/EditorActions.js';
import { NodeRegistry } from '../core/NodeRegistry.js';
import { Toast } from '../ui/Toast.js';

/**
 * InteractionManager: Handles all mouse and keyboard interactions
 */
export class InteractionManager {
    private canvas: Canvas;
    private editorState: EditorState;
    private canvasElement: HTMLCanvasElement;

    // Interaction state
    private isPanning: boolean = false;
    private isDraggingNodes: boolean = false;
    private isConnecting: boolean = false;
    private lastMousePos: Vector2 = new Vector2();
    private draggedNodes: Map<TreeNode, Vector2> = new Map(); // Node -> original position

    // Clipboard for copy/paste
    private clipboard: {
        nodes: any[];
        connections: Array<{ parentId: string; childId: string; index: number }>;
    } = { nodes: [], connections: [] };

    // Callbacks
    public onNodeDoubleClick?: (node: TreeNode) => void;
    public onContextMenu?: (worldPos: Vector2) => void;
    public onSave?: () => void;

    constructor(canvas: Canvas, editorState: EditorState, canvasElement: HTMLCanvasElement) {
        this.canvas = canvas;
        this.editorState = editorState;
        this.canvasElement = canvasElement;

        this.setupEventListeners();
    }

    /**
     * Sets up all event listeners
     */
    private setupEventListeners(): void {
        this.canvasElement.addEventListener('mousedown', this.onMouseDown);
        this.canvasElement.addEventListener('mousemove', this.onMouseMove);
        this.canvasElement.addEventListener('mouseup', this.onMouseUp);
        this.canvasElement.addEventListener('wheel', this.onWheel);
        this.canvasElement.addEventListener('dblclick', this.onDoubleClick);
        this.canvasElement.addEventListener('contextmenu', this.onRightClick);
        window.addEventListener('keydown', this.onKeyDown);
    }

    /**
     * Mouse down handler
     */
    private onMouseDown = (e: MouseEvent): void => {
        const worldPos = this.canvas.getWorldMousePos(e);
        this.lastMousePos = worldPos;

        // Right click - handled in contextmenu event
        if (e.button === 2) return;

        // Middle mouse or space+drag - pan
        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
            this.isPanning = true;
            this.canvasElement.style.cursor = 'grabbing';
            e.preventDefault();
            return;
        }

        // Left click
        if (e.button === 0) {
            // Check for port clicks FIRST (ports extend outside node bodies)
            // Use port cache for O(1) lookup instead of O(n) iteration
            let clickedPort: { node: TreeNode; port: { type: 'input' | 'output'; index: number; isMultiPort?: boolean } } | null = null;

            // Try cache first (fast path)
            if (this.canvas.portCache.isValidCache()) {
                clickedPort = this.canvas.portCache.getPortAtPoint(worldPos);
            } else {
                // Fallback to O(n) search if cache is invalid (rebuild will happen later)
                for (const node of this.editorState.nodes) {
                    const port = this.canvas.nodeRenderer.getPortAtPoint(node, worldPos);
                    if (port) {
                        clickedPort = { node, port };
                        break;
                    }
                }
            }

            if (clickedPort) {
                // Start connecting from either input or output port
                this.isConnecting = true;
                this.editorState.tempConnection = {
                    from: clickedPort.node,
                    fromPort: clickedPort.port.index,
                    toPos: worldPos,
                    fromPortType: clickedPort.port.type  // Track which port type we started from
                };
                return;
            }

            // Check for node body click
            const clickedNode = this.editorState.findNodeAtPosition(worldPos, this.canvas.nodeRenderer);

            if (clickedNode) {
                // Start dragging node(s)
                if (!this.canvas.selectionManager.isSelected(clickedNode)) {
                    this.canvas.selectionManager.selectNode(clickedNode, e.ctrlKey || e.metaKey);
                }

                this.isDraggingNodes = true;

                // Store original positions
                this.draggedNodes.clear();
                this.canvas.selectionManager.getSelectedNodes().forEach(node => {
                    this.draggedNodes.set(node, node.position.clone());
                });

            } else {
                // Clicking on empty space - start box select or clear selection
                if (!e.ctrlKey && !e.metaKey) {
                    this.canvas.selectionManager.clearSelection();
                }
                this.canvas.selectionManager.startBoxSelect(worldPos);
            }
        }
    };

    /**
     * Mouse move handler
     */
    private onMouseMove = (e: MouseEvent): void => {
        const worldPos = this.canvas.getWorldMousePos(e);
        const delta = worldPos.subtract(this.lastMousePos);

        // Check for port hits FIRST (ports extend outside node bodies)
        // Use port cache for O(1) lookup instead of O(n) iteration
        let portNode: TreeNode | null = null;

        // Try cache first (fast path)
        if (this.canvas.portCache.isValidCache()) {
            const portHit = this.canvas.portCache.getPortAtPoint(worldPos);
            if (portHit) {
                portNode = portHit.node;
            }
        } else {
            // Fallback to O(n) search if cache is invalid
            for (const node of this.editorState.nodes) {
                const port = this.canvas.nodeRenderer.getPortAtPoint(node, worldPos);
                if (port) {
                    portNode = node;
                    break;
                }
            }
        }

        // Update hover state (prioritize port nodes)
        const hoveredNode = portNode || this.editorState.findNodeAtPosition(worldPos, this.canvas.nodeRenderer);
        this.canvas.selectionManager.setHoveredNode(hoveredNode);

        // Update cursor based on what's being hovered
        if (!this.isPanning && !this.isDraggingNodes && !this.isConnecting) {
            if (portNode) {
                this.canvasElement.style.cursor = 'crosshair';
            } else if (hoveredNode) {
                this.canvasElement.style.cursor = 'move';
            } else {
                this.canvasElement.style.cursor = 'default';
            }
        }

        // Panning
        if (this.isPanning) {
            const screenDelta = new Vector2(e.movementX, e.movementY);
            this.canvas.viewport.pan(screenDelta);
        }

        // Dragging nodes
        else if (this.isDraggingNodes) {
            this.canvas.selectionManager.getSelectedNodes().forEach(node => {
                node.position = node.position.add(delta);
            });
            // Invalidate port cache when nodes move
            this.canvas.invalidatePortCache();
        }

        // Connecting
        else if (this.isConnecting && this.editorState.tempConnection) {
            this.editorState.tempConnection.toPos = worldPos;
            this.canvasElement.style.cursor = 'crosshair';
        }

        // Box selecting
        else if (this.canvas.selectionManager.isBoxSelectActive()) {
            this.canvas.selectionManager.updateBoxSelect(worldPos);
        }

        this.lastMousePos = worldPos;
    };

    /**
     * Mouse up handler
     */
    private onMouseUp = (e: MouseEvent): void => {
        const worldPos = this.canvas.getWorldMousePos(e);

        // End panning
        if (this.isPanning) {
            this.isPanning = false;
            this.canvasElement.style.cursor = 'default';
        }

        // End dragging nodes
        if (this.isDraggingNodes) {
            // Create undo command if nodes were actually moved
            if (this.draggedNodes.size > 0) {
                const selectedNodes = this.canvas.selectionManager.getSelectedNodes();
                const firstNode = selectedNodes[0];

                if (firstNode && this.draggedNodes.has(firstNode)) {
                    const originalPos = this.draggedNodes.get(firstNode)!;
                    const delta = firstNode.position.clone().subtract(originalPos);

                    // Only create command if there was actual movement
                    if (delta.length() > 0.1) {
                        // Create operation with the captured old positions (movement already happened)
                        const operation = new MoveNodesOperation(selectedNodes, this.draggedNodes);
                        // Record as completed since the movement already happened during drag
                        this.editorState.operationHistory.recordCompleted(operation);

                        // Re-sort children of affected parents to maintain left-to-right order
                        const affectedParents = new Set<TreeNode>();
                        selectedNodes.forEach(node => {
                            if (node.parent) {
                                affectedParents.add(node.parent);
                            }
                        });
                        affectedParents.forEach(parent => {
                            // Check if order changed after sorting
                            const originalOrder = parent.children.map(child => child.id);
                            parent.children.sort((a, b) => a.position.x - b.position.x);
                            const newOrder = parent.children.map(child => child.id);
                            const orderChanged = !originalOrder.every((id, index) => id === newOrder[index]);

                            // Only flash if order actually changed
                            if (orderChanged) {
                                this.canvas.connectionRenderer.flashConnectionsForParent(parent);
                            }
                        });

                        // Rebuild port cache after nodes moved
                        this.canvas.rebuildPortCache();
                    }
                }
            }

            this.isDraggingNodes = false;
            this.draggedNodes.clear();
        }

        // End connecting
        if (this.isConnecting && this.editorState.tempConnection) {
            const fromPortType = this.editorState.tempConnection.fromPortType || 'output';
            const targetPortType = fromPortType === 'output' ? 'input' : 'output';

            // Find the target port (opposite type of where we started)
            let targetPort: { node: TreeNode; port: { type: 'input' | 'output'; index: number } } | null = null;

            // Try cache first (fast path)
            if (this.canvas.portCache.isValidCache()) {
                const portHit = this.canvas.portCache.getPortAtPoint(worldPos);
                if (portHit && portHit.port.type === targetPortType && portHit.node !== this.editorState.tempConnection.from) {
                    targetPort = portHit;
                }
            } else {
                // Fallback to O(n) search if cache is invalid
                for (const node of this.editorState.nodes) {
                    if (node === this.editorState.tempConnection.from) continue; // Can't connect to self
                    const port = this.canvas.nodeRenderer.getPortAtPoint(node, worldPos);
                    if (port && port.type === targetPortType) {
                        targetPort = { node, port };
                        break;
                    }
                }
            }

            if (targetPort) {
                // Determine parent and child based on which direction we dragged
                let parent: TreeNode;
                let child: TreeNode;

                if (fromPortType === 'output') {
                    // Dragged from output to input (normal direction: parent -> child)
                    parent = this.editorState.tempConnection.from;
                    child = targetPort.node;
                } else {
                    // Dragged from input to output (reverse direction: child -> parent)
                    parent = targetPort.node;
                    child = this.editorState.tempConnection.from;
                }

                // Check if connection is valid before creating operation
                if (!parent.canAddMoreChildren()) {
                    const maxStr = parent.maxChildren === 1 ? 'one child' : `${parent.maxChildren} children`;
                    Toast.show(`This node can only have ${maxStr}`, 2000);
                } else {
                    // Create and execute the connect operation
                    const operation = new ConnectNodesOperation(this.editorState, parent, child);
                    this.editorState.operationHistory.execute(operation);

                    // Flash the connections after connection is made
                    this.canvas.connectionRenderer.flashConnectionsForParent(parent);

                    // Rebuild port cache after connection (output ports may have changed)
                    this.canvas.rebuildPortCache();

                    // Update root: Find Start node or use topmost parentless node
                    this.updateRoot();
                }
            }

            this.isConnecting = false;
            this.editorState.tempConnection = null;
        }

        // End box select
        if (this.canvas.selectionManager.isBoxSelectActive()) {
            this.canvas.selectionManager.endBoxSelect(
                this.editorState.nodes,
                e.ctrlKey || e.metaKey
            );
        }
    };

    /**
     * Mouse wheel handler (zoom)
     */
    private onWheel = (e: WheelEvent): void => {
        e.preventDefault();

        const oldZoom = this.canvas.viewport.zoom;
        const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
        const screenPos = new Vector2(e.offsetX, e.offsetY);

        this.canvas.viewport.zoomAt(screenPos, zoomDelta);

        // Rebuild port cache if zoom changed significantly (> 5% change)
        const zoomChangeRatio = Math.abs(this.canvas.viewport.zoom - oldZoom) / oldZoom;
        if (zoomChangeRatio > 0.05) {
            this.canvas.rebuildPortCache();
        }
    };

    /**
     * Double click handler
     */
    private onDoubleClick = (e: MouseEvent): void => {
        const worldPos = this.canvas.getWorldMousePos(e);
        const clickedNode = this.editorState.findNodeAtPosition(worldPos, this.canvas.nodeRenderer);

        if (clickedNode && this.onNodeDoubleClick) {
            this.onNodeDoubleClick(clickedNode);
        }
    };

    /**
     * Right click handler (context menu)
     */
    private onRightClick = (e: MouseEvent): void => {
        e.preventDefault();

        const worldPos = this.canvas.getWorldMousePos(e);

        // First, check if we clicked on a port
        let clickedPort: { node: TreeNode; port: { type: 'input' | 'output'; index: number; isMultiPort?: boolean } } | null = null;
        for (const node of this.editorState.nodes) {
            const port = this.canvas.nodeRenderer.getPortAtPoint(node, worldPos);
            if (port) {
                clickedPort = { node, port };
                break;
            }
        }

        // Handle port disconnection
        if (clickedPort) {
            this.handlePortDisconnect(clickedPort.node, clickedPort.port);
            return;
        }

        // If we didn't find a port in the cache, try fallback
        if (!clickedPort) {
            // Use port cache for O(1) lookup instead of O(n) iteration
            if (this.canvas.portCache.isValidCache()) {
                clickedPort = this.canvas.portCache.getPortAtPoint(worldPos);
            } else {
                // Fallback to O(n) search if cache is invalid
                for (const node of this.editorState.nodes) {
                    const port = this.canvas.nodeRenderer.getPortAtPoint(node, worldPos);
                    if (port) {
                        clickedPort = { node, port };
                        break;
                    }
                }
            }

            // Handle port disconnection (if we found one)
            if (clickedPort) {
                this.handlePortDisconnect(clickedPort.node, clickedPort.port);
                return;
            }
        }

        // Check for node click
        const clickedNode = this.editorState.findNodeAtPosition(worldPos, this.canvas.nodeRenderer);

        // Show context menu if clicked on empty space
        if (!clickedNode && this.onContextMenu) {
            this.onContextMenu(worldPos);
        }
    };

    /**
     * Keyboard handler
     */
    private onKeyDown = (e: KeyboardEvent): void => {
        // Ignore keyboard shortcuts when typing in input fields
        const target = e.target as HTMLElement;
        if (target && (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        )) {
            return; // Don't process shortcuts when focused on input elements
        }

        // Delete selected nodes
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const selectedNodes = this.canvas.selectionManager.getSelectedNodes();
            if (selectedNodes.length > 0) {
                const operation = new RemoveNodesOperation(this.editorState, selectedNodes);
                this.editorState.operationHistory.execute(operation);
                this.canvas.selectionManager.clearSelection();
                // Rebuild port cache after nodes removed
                this.canvas.rebuildPortCache();
                e.preventDefault();
            }
        }

        // Undo (Ctrl+Z)
        if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
            this.editorState.operationHistory.undo();
            // Rebuild port cache after undo
            this.canvas.rebuildPortCache();
            e.preventDefault();
        }

        // Redo (Ctrl+Shift+Z or Ctrl+Y)
        if ((e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
            (e.key === 'y' && (e.ctrlKey || e.metaKey))) {
            this.editorState.operationHistory.redo();
            // Rebuild port cache after redo
            this.canvas.rebuildPortCache();
            e.preventDefault();
        }

        // Copy (Ctrl+C)
        if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
            const selectedNodes = this.canvas.selectionManager.getSelectedNodes();
            if (selectedNodes.length > 0) {
                this.copyNodes(selectedNodes);
                e.preventDefault();
            }
        }

        // Paste (Ctrl+V)
        if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
            this.pasteNodes();
            e.preventDefault();
        }

        // Duplicate (Ctrl+D)
        if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
            const selectedNodes = this.canvas.selectionManager.getSelectedNodes();
            if (selectedNodes.length > 0) {
                this.duplicateNodes(selectedNodes);
                e.preventDefault();
            }
        }

        // Select all (Ctrl+A)
        if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
            this.editorState.nodes.forEach(node => {
                this.canvas.selectionManager.selectNode(node, true);
            });
            e.preventDefault();
        }

        // Save (Ctrl+S)
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
            if (this.onSave) {
                this.onSave();
            }
            e.preventDefault();
        }

        // Escape - cancel current operation
        if (e.key === 'Escape') {
            this.isPanning = false;
            this.isDraggingNodes = false;
            this.isConnecting = false;
            this.editorState.tempConnection = null;
            this.canvas.selectionManager.cancelBoxSelect();
            this.canvasElement.style.cursor = 'default';
        }
    };

    /**
     * Copies selected nodes to clipboard
     */
    private copyNodes(nodes: TreeNode[]): void {
        const nodeIds = new Set(nodes.map(n => n.id));
        const connections: Array<{ parentId: string; childId: string; index: number }> = [];

        // Capture connections between copied nodes
        nodes.forEach(node => {
            node.children.forEach((child, index) => {
                // Only capture connections where both parent and child are in the copied set
                if (nodeIds.has(child.id)) {
                    connections.push({
                        parentId: node.id,
                        childId: child.id,
                        index: index
                    });
                }
            });
        });

        this.clipboard = {
            nodes: nodes.map(node => node.toJSON()),
            connections: connections
        };
    }

    /**
     * Pastes nodes from clipboard
     */
    private pasteNodes(): void {
        if (this.clipboard.nodes.length === 0) return;

        const offset = new Vector2(50, 50); // Offset for pasted nodes
        const newNodes: TreeNode[] = [];
        const idMap = new Map<string, string>(); // Old ID -> New ID

        // Clear current selection
        this.canvas.selectionManager.clearSelection();

        // Create new nodes from clipboard using actions
        this.clipboard.nodes.forEach((nodeData: any) => {
            const nodeType = nodeData.type;
            const factory = this.getNodeClass(nodeType);
            if (!factory) return;

            const node = factory(); // Call the factory function to create the node (generates fresh ID)
            const newId = node.id; // Save the fresh, unique ID
            const oldId = nodeData.id;

            node.fromJSON(nodeData); // This will overwrite the ID
            node.id = newId; // Restore the fresh ID to ensure uniqueness
            node.position = node.position.add(offset);

            // Store ID mapping for connection restoration
            idMap.set(oldId, newId);

            // Use AddNodeOperation to add the node
            const addOperation = new AddNodeOperation(this.editorState, node);
            this.editorState.operationHistory.execute(addOperation);
            newNodes.push(node);

            // Select the newly pasted node
            this.canvas.selectionManager.selectNode(node, true);
        });

        // Restore connections between pasted nodes using operations
        this.clipboard.connections.forEach(conn => {
            const newParentId = idMap.get(conn.parentId);
            const newChildId = idMap.get(conn.childId);

            if (newParentId && newChildId) {
                const parent = this.editorState.findNodeById(newParentId);
                const child = this.editorState.findNodeById(newChildId);

                if (parent && child) {
                    const connectOperation = new ConnectNodesOperation(this.editorState, parent, child, conn.index);
                    this.editorState.operationHistory.execute(connectOperation);
                }
            }
        });

        // Rebuild port cache after pasting nodes
        this.canvas.rebuildPortCache();
    }

    /**
     * Duplicates selected nodes
     */
    private duplicateNodes(nodes: TreeNode[]): void {
        this.copyNodes(nodes);
        this.pasteNodes();
    }

    /**
     * Gets node class by type (helper for paste)
     */
    private getNodeClass(type: string): (() => TreeNode) | null {
        const registration = NodeRegistry.get(type);
        return registration?.factory || null;
    }

    /**
     * Handles port disconnection (right-click on port)
     */
    private handlePortDisconnect(node: TreeNode, port: { type: 'input' | 'output'; index: number; isMultiPort?: boolean }): void {
        if (port.type === 'input') {
            // Input port: disconnect this node from its parent
            if (node.parent) {
                const operation = new DisconnectNodeOperation(this.editorState, node);
                this.editorState.operationHistory.execute(operation);
                Toast.show(`Disconnected ${node.label} from parent`, 1500);
                this.updateRoot();
            } else {
                Toast.show('Node has no parent connection', 1500);
            }
        } else if (port.type === 'output') {
            // Output port: disconnect the child at this index
            if (port.index >= 0 && port.index < node.children.length) {
                const child = node.children[port.index];
                const operation = new DisconnectNodeOperation(this.editorState, child);
                this.editorState.operationHistory.execute(operation);
                Toast.show(`Disconnected ${child.label} from ${node.label}`, 1500);
                // Rebuild port cache after disconnection
                this.canvas.rebuildPortCache();
                this.updateRoot();
            }
        }
    }

    /**
     * Updates the behavior tree root based on Start nodes only
     * Start nodes are the ONLY valid execution entry points
     */
    private updateRoot(): void {
        // Find all Start nodes
        const startNodes = this.editorState.nodes.filter(node => node.type === 'start');

        if (startNodes.length > 0) {
            // Set the first Start node as root (for display purposes)
            // Note: BehaviorTree.tick() will find and execute ALL Start nodes
            this.editorState.behaviorTree.setRoot(startNodes[0]);
        } else {
            // No Start nodes - clear the root (no execution will happen)
            this.editorState.behaviorTree.setRoot(null);
        }
    }

    /**
     * Cleanup
     */
    public dispose(): void {
        this.canvasElement.removeEventListener('mousedown', this.onMouseDown);
        this.canvasElement.removeEventListener('mousemove', this.onMouseMove);
        this.canvasElement.removeEventListener('mouseup', this.onMouseUp);
        this.canvasElement.removeEventListener('wheel', this.onWheel);
        this.canvasElement.removeEventListener('dblclick', this.onDoubleClick);
        this.canvasElement.removeEventListener('contextmenu', this.onRightClick);
        window.removeEventListener('keydown', this.onKeyDown);
    }
}
