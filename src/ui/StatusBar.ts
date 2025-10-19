import { BehaviorTree } from '../core/BehaviorTree.js';
import { EditorState } from '../state/EditorState.js';

/**
 * StatusBar: Manages the bottom status bar displaying execution and tick information
 */
export class StatusBar {
    private behaviorTree: BehaviorTree;
    private editorState: EditorState;

    private statusBar: HTMLElement;
    private executionText: HTMLElement;
    private tickCountValue: HTMLElement;
    private tickRateValue: HTMLElement;
    private nodesValue: HTMLElement;
    private toolbarTickRateInput: HTMLInputElement | null = null;

    constructor(behaviorTree: BehaviorTree, editorState: EditorState) {
        this.behaviorTree = behaviorTree;
        this.editorState = editorState;

        // Get DOM elements
        this.statusBar = document.getElementById('status-bar')!;
        this.executionText = document.getElementById('status-execution-text')!;
        this.tickCountValue = document.getElementById('status-tick-count-value')!;
        this.tickRateValue = document.getElementById('status-tick-rate-value')!;
        this.nodesValue = document.getElementById('status-nodes-value')!;
        this.toolbarTickRateInput = document.getElementById('toolbar-tick-rate') as HTMLInputElement;

        this.setupEventListeners();
        this.update();
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        // Update when tree state changes
        this.behaviorTree.onStateChange(() => {
            this.update();
        });

        // Make tick rate item clickable to focus settings slider
        const tickRateItem = document.getElementById('status-tick-rate');
        if (tickRateItem) {
            tickRateItem.style.cursor = 'pointer';
            tickRateItem.addEventListener('click', () => {
                // Could open settings panel or show a quick adjust popup
                const settingsTickRate = document.getElementById('settings-tick-rate') as HTMLInputElement;
                if (settingsTickRate) {
                    settingsTickRate.focus();
                }
            });
        }
    }

    /**
     * Updates the status bar display
     */
    public update(): void {
        const state = this.behaviorTree.state;
        const tickCount = this.behaviorTree.tickCount;
        const tickRate = this.behaviorTree.getTickRate();
        const nodeCount = this.editorState.nodes.length;

        // Update execution state
        this.statusBar.className = 'status-bar';
        switch (state) {
            case 'running':
                this.statusBar.classList.add('state-running');
                this.executionText.textContent = 'Running';
                break;
            case 'paused':
                this.statusBar.classList.add('state-paused');
                this.executionText.textContent = 'Paused';
                break;
            case 'idle':
                this.statusBar.classList.add('state-idle');
                this.executionText.textContent = 'Idle';
                break;
            default:
                this.statusBar.classList.add('state-idle');
                this.executionText.textContent = 'Unknown';
        }

        // Update tick count
        this.tickCountValue.textContent = tickCount.toString();

        // Update tick rate
        this.tickRateValue.textContent = tickRate.toString();

        // Sync toolbar tick rate input
        if (this.toolbarTickRateInput && this.toolbarTickRateInput.value !== tickRate.toString()) {
            this.toolbarTickRateInput.value = tickRate.toString();
        }

        // Update node count
        this.nodesValue.textContent = nodeCount.toString();
    }
}
