import { Vector2 } from '../utils/Vector2.js';
import { NodeRegistry, NodeRegistration } from '../core/NodeRegistry.js';

/**
 * ContextMenu: Manages the right-click context menu with search
 */
export class ContextMenu {
    private menu: HTMLElement;
    private searchInput: HTMLInputElement;
    private menuContent: HTMLElement;
    private worldPosition: Vector2 | null = null;

    /**
     * Callback fired when a node type is selected from the menu.
     *
     * Implementation should create the node using AddNodeOperation and execute it
     * through the OperationHistory for proper undo/redo support.
     *
     * Example:
     * ```ts
     * contextMenu.onNodeTypeSelect = (type: string, worldPos: Vector2) => {
     *     const node = NodeRegistry.create(type);
     *     node.position = worldPos;
     *     const operation = new AddNodeOperation(editorState, node);
     *     commandHistory.execute(operation);
     * };
     * ```
     */
    public onNodeTypeSelect?: (type: string, worldPos: Vector2) => void;

    constructor() {
        this.menu = this.createMenuElement();
        document.body.appendChild(this.menu);

        this.searchInput = this.menu.querySelector('#context-menu-search') as HTMLInputElement;
        this.menuContent = this.menu.querySelector('#context-menu-content') as HTMLElement;

        this.setupEventListeners();
    }

    /**
     * Creates the context menu HTML structure
     */
    private createMenuElement(): HTMLElement {
        const menu = document.createElement('div');
        menu.id = 'context-menu';
        menu.className = 'context-menu hidden';

        menu.innerHTML = `
            <div class="context-menu-header">
                <input
                    type="text"
                    id="context-menu-search"
                    class="context-menu-search"
                    placeholder="Search nodes..."
                    autocomplete="off"
                />
            </div>
            <div id="context-menu-content" class="context-menu-content"></div>
        `;

        return menu;
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        // Search input
        this.searchInput.addEventListener('input', () => {
            this.renderMenuItems(this.searchInput.value);
        });

        // Prevent menu from closing when clicking inside it
        this.menu.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        // Close menu when clicking outside
        document.addEventListener('click', () => {
            this.hide();
        });

        // Keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.focusFirstItem();
            }
        });
    }

    /**
     * Renders menu items based on search query
     */
    private renderMenuItems(searchQuery: string = ''): void {
        // Get nodes from registry
        const nodes = NodeRegistry.search(searchQuery);

        // Group by category
        const grouped = {
            composite: nodes.filter(n => n.category === 'composite'),
            decorator: nodes.filter(n => n.category === 'decorator'),
            leaf: nodes.filter(n => n.category === 'leaf')
        };

        // Build HTML
        let html = '';

        if (grouped.composite.length > 0) {
            html += '<div class="context-menu-category">Composites</div>';
            html += grouped.composite.map(n => this.createMenuItem(n)).join('');
        }

        if (grouped.decorator.length > 0) {
            html += '<div class="context-menu-category">Decorators</div>';
            html += grouped.decorator.map(n => this.createMenuItem(n)).join('');
        }

        if (grouped.leaf.length > 0) {
            html += '<div class="context-menu-category">Actions</div>';
            html += grouped.leaf.map(n => this.createMenuItem(n)).join('');
        }

        if (html === '') {
            html = '<div class="context-menu-empty">No nodes found</div>';
        }

        this.menuContent.innerHTML = html;

        // Attach click handlers
        const items = this.menuContent.querySelectorAll('.context-menu-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                const nodeType = item.getAttribute('data-node-type');
                if (nodeType && this.worldPosition && this.onNodeTypeSelect) {
                    this.onNodeTypeSelect(nodeType, this.worldPosition);
                }
                this.hide();
            });
        });
    }

    /**
     * Creates HTML for a single menu item
     */
    private createMenuItem(node: NodeRegistration): string {
        return `
            <div class="context-menu-item" data-node-type="${node.type}">
                <i class="fas ${node.icon}"></i>
                <div class="context-menu-item-content">
                    <div class="context-menu-item-label">${node.label}</div>
                    <div class="context-menu-item-description">${node.description}</div>
                </div>
            </div>
        `;
    }

    /**
     * Focuses the first menu item
     */
    private focusFirstItem(): void {
        const firstItem = this.menuContent.querySelector('.context-menu-item') as HTMLElement;
        if (firstItem) {
            firstItem.focus();
        }
    }

    /**
     * Shows the context menu at a screen position
     */
    public show(screenX: number, screenY: number, worldPos: Vector2): void {
        this.worldPosition = worldPos;

        // Clear search and render all items
        this.searchInput.value = '';
        this.renderMenuItems();

        // Position menu
        this.menu.style.left = `${screenX}px`;
        this.menu.style.top = `${screenY}px`;
        this.menu.classList.remove('hidden');

        // Focus search input
        setTimeout(() => {
            this.searchInput.focus();
        }, 10);
    }

    /**
     * Hides the context menu
     */
    public hide(): void {
        this.menu.classList.add('hidden');
        this.worldPosition = null;
        this.searchInput.value = '';
    }
}
