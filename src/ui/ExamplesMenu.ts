/**
 * ExamplesMenu: Modal dialog for browsing and loading example behavior trees
 */
export class ExamplesMenu {
    private container: HTMLElement;
    private overlay: HTMLElement;
    private isVisible: boolean = false;

    public onExampleLoad?: (examplePath: string) => void;

    private examples = [
        {
            id: 'basic-sequence',
            name: 'Basic Sequence',
            description: 'Demonstrates a simple sequence that executes tasks in order. All children must succeed for the sequence to succeed.',
            path: 'examples/basic-sequence.json',
            difficulty: 'beginner',
            tags: ['beginner', 'tutorial', 'sequence'],
            category: 'Tutorial'
        },
        {
            id: 'basic-selector',
            name: 'Basic Selector',
            description: 'Demonstrates a selector that tries alternatives until one succeeds. Useful for fallback behaviors.',
            path: 'examples/basic-selector.json',
            difficulty: 'beginner',
            tags: ['beginner', 'tutorial', 'selector'],
            category: 'Tutorial'
        },
        {
            id: 'conditional-logic',
            name: 'Conditional Logic',
            description: 'Demonstrates conditional branching with selectors and sequences for decision-making.',
            path: 'examples/conditional-logic.json',
            difficulty: 'intermediate',
            tags: ['intermediate', 'conditional', 'decision-making'],
            category: 'Tutorial'
        },
        {
            id: 'repeater-pattern',
            name: 'Repeater Pattern',
            description: 'Shows how to use a repeater decorator to loop behavior continuously.',
            path: 'examples/repeater-pattern.json',
            difficulty: 'intermediate',
            tags: ['intermediate', 'decorator', 'repeater'],
            category: 'Tutorial'
        },
        {
            id: 'nested-composites',
            name: 'Nested Composites',
            description: 'Shows how to nest sequences and selectors for complex behavior hierarchies.',
            path: 'examples/nested-composites.json',
            difficulty: 'advanced',
            tags: ['advanced', 'nesting', 'hierarchy'],
            category: 'Tutorial'
        },
        {
            id: 'unity-patrol',
            name: 'Unity Patrol AI',
            description: 'Simple patrol behavior for Unity NavMesh agents',
            path: 'templates/unity/patrol-ai.json',
            difficulty: 'beginner',
            tags: ['unity', 'patrol', 'navmesh', 'beginner'],
            category: 'Game AI'
        },
        {
            id: 'unity-combat',
            name: 'Unity Combat AI',
            description: 'Enemy AI with patrol and combat states',
            path: 'templates/unity/combat-ai.json',
            difficulty: 'intermediate',
            tags: ['unity', 'combat', 'enemy', 'intermediate'],
            category: 'Game AI'
        }
    ];

    constructor() {
        this.container = document.createElement('div');
        this.overlay = document.createElement('div');
        this.createUI();
        this.setupEventListeners();
    }

    /**
     * Creates the UI structure
     */
    private createUI(): void {
        // Overlay backdrop
        this.overlay.className = 'examples-menu-overlay hidden';

        // Main menu container
        this.container.className = 'examples-menu hidden';
        this.container.innerHTML = `
            <div class="examples-menu-header">
                <div class="examples-menu-title">
                    <i class="fas fa-book"></i>
                    <h2>Example Behavior Trees</h2>
                </div>
                <button class="btn-close-examples" title="Close (Esc)">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="examples-menu-search-container">
                <i class="fas fa-search"></i>
                <input
                    type="text"
                    class="examples-menu-search"
                    placeholder="Search examples..."
                    autocomplete="off"
                >
            </div>

            <div class="examples-menu-filters">
                <button class="filter-btn active" data-category="all">
                    <i class="fas fa-th"></i> All
                </button>
                <button class="filter-btn" data-category="Tutorial">
                    <i class="fas fa-graduation-cap"></i> Tutorial
                </button>
                <button class="filter-btn" data-category="Game AI">
                    <i class="fas fa-gamepad"></i> Game AI
                </button>
            </div>

            <div class="examples-menu-content">
                ${this.renderExamples()}
            </div>
        `;

        document.body.appendChild(this.overlay);
        document.body.appendChild(this.container);
    }

    /**
     * Renders example cards
     */
    private renderExamples(filter: string = '', category: string = 'all'): string {
        const filtered = this.examples.filter(example => {
            const matchesSearch = filter === '' ||
                example.name.toLowerCase().includes(filter.toLowerCase()) ||
                example.description.toLowerCase().includes(filter.toLowerCase()) ||
                example.tags.some(tag => tag.toLowerCase().includes(filter.toLowerCase()));

            const matchesCategory = category === 'all' || example.category === category;

            return matchesSearch && matchesCategory;
        });

        if (filtered.length === 0) {
            return `
                <div class="examples-menu-empty">
                    <i class="fas fa-search"></i>
                    <p>No examples found</p>
                </div>
            `;
        }

        return filtered.map(example => `
            <div class="example-card" data-example-id="${example.id}">
                <div class="example-card-header">
                    <h3 class="example-card-title">${example.name}</h3>
                    <span class="example-card-difficulty difficulty-${example.difficulty}">
                        ${this.getDifficultyIcon(example.difficulty)} ${example.difficulty}
                    </span>
                </div>
                <p class="example-card-description">${example.description}</p>
                <div class="example-card-tags">
                    ${example.tags.slice(0, 4).map(tag => `
                        <span class="example-tag">${tag}</span>
                    `).join('')}
                </div>
                <button class="example-card-load-btn" data-path="${example.path}">
                    <i class="fas fa-download"></i> Load Example
                </button>
            </div>
        `).join('');
    }

    /**
     * Gets icon for difficulty level
     */
    private getDifficultyIcon(difficulty: string): string {
        switch (difficulty) {
            case 'beginner': return '<i class="fas fa-seedling"></i>';
            case 'intermediate': return '<i class="fas fa-star"></i>';
            case 'advanced': return '<i class="fas fa-fire"></i>';
            default: return '<i class="fas fa-circle"></i>';
        }
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        // Close button
        const closeBtn = this.container.querySelector('.btn-close-examples');
        closeBtn?.addEventListener('click', () => this.hide());

        // Overlay click to close
        this.overlay.addEventListener('click', () => this.hide());

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });

        // Search input
        const searchInput = this.container.querySelector('.examples-menu-search') as HTMLInputElement;
        searchInput?.addEventListener('input', (e) => {
            const filter = (e.target as HTMLInputElement).value;
            const activeCategory = this.container.querySelector('.filter-btn.active')?.getAttribute('data-category') || 'all';
            this.updateExamples(filter, activeCategory);
        });

        // Category filters
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                filterButtons.forEach(b => b.classList.remove('active'));
                (e.currentTarget as HTMLElement).classList.add('active');

                const category = (e.currentTarget as HTMLElement).getAttribute('data-category') || 'all';
                const searchValue = searchInput?.value || '';
                this.updateExamples(searchValue, category);
            });
        });

        // Load example buttons (delegated)
        this.container.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            const loadBtn = target.closest('.example-card-load-btn') as HTMLElement;

            if (loadBtn) {
                const path = loadBtn.getAttribute('data-path');
                if (path && this.onExampleLoad) {
                    this.onExampleLoad(path);
                    this.hide();
                }
            }
        });
    }

    /**
     * Updates the examples display
     */
    private updateExamples(filter: string, category: string): void {
        const content = this.container.querySelector('.examples-menu-content');
        if (content) {
            content.innerHTML = this.renderExamples(filter, category);
        }
    }

    /**
     * Shows the examples menu
     */
    public show(): void {
        this.isVisible = true;
        this.overlay.classList.remove('hidden');
        this.container.classList.remove('hidden');

        // Focus search input
        setTimeout(() => {
            const searchInput = this.container.querySelector('.examples-menu-search') as HTMLInputElement;
            searchInput?.focus();
        }, 100);
    }

    /**
     * Hides the examples menu
     */
    public hide(): void {
        this.isVisible = false;
        this.overlay.classList.add('hidden');
        this.container.classList.add('hidden');

        // Clear search
        const searchInput = this.container.querySelector('.examples-menu-search') as HTMLInputElement;
        if (searchInput) {
            searchInput.value = '';
        }

        // Reset to all category
        const filterButtons = this.container.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => btn.classList.remove('active'));
        const allBtn = this.container.querySelector('.filter-btn[data-category="all"]');
        allBtn?.classList.add('active');

        // Reset display
        this.updateExamples('', 'all');
    }

    /**
     * Toggles menu visibility
     */
    public toggle(): void {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }
}
