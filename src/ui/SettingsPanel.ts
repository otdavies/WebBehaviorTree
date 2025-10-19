import { EditorState } from '../state/EditorState.js';
import { ToggleGridAction } from '../actions/EditorActions.js';
import { CommandHistory } from '../core/Command.js';

/**
 * SettingsPanel: Manages the settings sidebar
 */
export class SettingsPanel {
    private editorState: EditorState;
    private commandHistory: CommandHistory;
    private panel: HTMLElement;
    private btnClose: HTMLButtonElement;
    private btnExport: HTMLButtonElement;
    private btnImport: HTMLButtonElement;
    private btnClear: HTMLButtonElement;
    private fileInput: HTMLInputElement;
    private showGridCheckbox: HTMLInputElement;
    private settingsTickRateSlider: HTMLInputElement;
    private settingsTickRateValue: HTMLSpanElement;
    private blackboardInspector: HTMLElement;

    public onExport?: () => void;
    public onImport?: (data: any) => void;
    public onClear?: () => void;

    constructor(editorState: EditorState, commandHistory: CommandHistory) {
        this.editorState = editorState;
        this.commandHistory = commandHistory;

        // Get DOM elements
        this.panel = document.getElementById('settings-panel')!;
        this.btnClose = document.getElementById('btn-close-settings') as HTMLButtonElement;
        this.btnExport = document.getElementById('btn-export') as HTMLButtonElement;
        this.btnImport = document.getElementById('btn-import') as HTMLButtonElement;
        this.btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
        this.fileInput = document.getElementById('file-input') as HTMLInputElement;
        this.showGridCheckbox = document.getElementById('show-grid') as HTMLInputElement;
        this.settingsTickRateSlider = document.getElementById('settings-tick-rate') as HTMLInputElement;
        this.settingsTickRateValue = document.getElementById('settings-tick-rate-value') as HTMLSpanElement;
        this.blackboardInspector = document.getElementById('blackboard-inspector')!;

        // Initialize tick rate slider with current value
        const currentTickRate = this.editorState.behaviorTree.getTickRate();
        this.settingsTickRateSlider.value = currentTickRate.toString();
        this.settingsTickRateValue.textContent = currentTickRate.toString();;

        this.setupEventListeners();
        this.updateBlackboard();
    }

    /**
     * Sets up event listeners
     */
    private setupEventListeners(): void {
        this.btnClose.addEventListener('click', () => {
            this.hide();
        });

        this.btnExport.addEventListener('click', () => {
            if (this.onExport) {
                this.onExport();
            }
        });

        this.btnImport.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && this.onImport) {
                const text = await file.text();
                const data = JSON.parse(text);
                this.onImport(data);
            }
            // Reset file input
            this.fileInput.value = '';
        });

        this.btnClear.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear the entire tree?')) {
                if (this.onClear) {
                    this.onClear();
                }
            }
        });

        this.showGridCheckbox.addEventListener('change', () => {
            // Only execute action if the value actually changed
            if (this.editorState.showGrid !== this.showGridCheckbox.checked) {
                const action = new ToggleGridAction(this.editorState);
                this.commandHistory.execute(action);
            }
        });

        this.settingsTickRateSlider.addEventListener('input', () => {
            const rate = parseInt(this.settingsTickRateSlider.value);
            this.editorState.behaviorTree.setTickRate(rate);
            this.settingsTickRateValue.textContent = rate.toString();
        });
    }

    /**
     * Shows the panel
     */
    public show(): void {
        this.panel.classList.remove('hidden');
        this.editorState.isPanelOpen = 'settings';
        this.updateBlackboard();
    }

    /**
     * Hides the panel
     */
    public hide(): void {
        this.panel.classList.add('hidden');
        if (this.editorState.isPanelOpen === 'settings') {
            this.editorState.isPanelOpen = null;
        }
    }

    /**
     * Toggles the panel
     */
    public toggle(): void {
        if (this.panel.classList.contains('hidden')) {
            this.show();
        } else {
            this.hide();
        }
    }

    /**
     * Updates the blackboard inspector
     */
    public updateBlackboard(): void {
        const entries = this.editorState.behaviorTree.blackboard.entries();

        if (entries.length === 0) {
            this.blackboardInspector.innerHTML = '<em>No data</em>';
            return;
        }

        let html = '';
        entries.forEach(([key, value]) => {
            html += `
                <div class="blackboard-item">
                    <span class="blackboard-key">${key}:</span>
                    <span class="blackboard-value">${JSON.stringify(value)}</span>
                </div>
            `;
        });

        this.blackboardInspector.innerHTML = html;
    }
}
