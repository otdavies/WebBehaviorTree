import { EditorState } from '../state/EditorState.js';
import { ToggleGridOperation } from '../operations/Operations.js';
import { OperationHistory } from '../core/Operation.js';

/**
 * SettingsPanel: Manages the settings sidebar
 */
export class SettingsPanel {
    private editorState: EditorState;
    private commandHistory: OperationHistory;
    private panel: HTMLElement;
    private btnClose: HTMLButtonElement;
    private btnExport: HTMLButtonElement;
    private btnImport: HTMLButtonElement;
    private btnClear: HTMLButtonElement;
    private fileInput: HTMLInputElement;
    private showGridCheckbox: HTMLInputElement;
    private blackboardInspector: HTMLElement;

    // AI Authentication elements
    private apiKeyInput: HTMLInputElement;
    private btnSaveApiKey: HTMLButtonElement;
    private btnClearApiKey: HTMLButtonElement;
    private apiKeyStatus: HTMLElement;

    public onExport?: () => void;
    public onImport?: (data: any) => void;
    public onClear?: () => void;

    constructor(editorState: EditorState, commandHistory: OperationHistory) {
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
        this.blackboardInspector = document.getElementById('blackboard-inspector')!;

        // Get AI authentication elements
        this.apiKeyInput = document.getElementById('api-key-input') as HTMLInputElement;
        this.btnSaveApiKey = document.getElementById('btn-save-api-key') as HTMLButtonElement;
        this.btnClearApiKey = document.getElementById('btn-clear-api-key') as HTMLButtonElement;
        this.apiKeyStatus = document.getElementById('api-key-status')!;

        this.setupEventListeners();
        this.updateBlackboard();
        this.loadApiKey();
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
            // Only execute operation if the value actually changed
            if (this.editorState.showGrid !== this.showGridCheckbox.checked) {
                const operation = new ToggleGridOperation(this.editorState);
                this.commandHistory.execute(operation);
            }
        });

        // AI authentication event listeners
        this.btnSaveApiKey.addEventListener('click', () => {
            this.saveApiKey();
        });

        this.btnClearApiKey.addEventListener('click', () => {
            this.clearApiKey();
        });

        this.apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
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

    /**
     * Loads API key from localStorage and updates UI
     */
    private loadApiKey(): void {
        const apiKey = localStorage.getItem('openrouter_api_key');

        if (apiKey) {
            this.apiKeyInput.value = apiKey;
            this.updateApiKeyStatus('valid', this.maskApiKey(apiKey));
        } else {
            this.updateApiKeyStatus('not-set', 'No API key configured');
        }
    }

    /**
     * Gets the stored API key from localStorage
     * @returns The API key or null if not set
     */
    public getApiKey(): string | null {
        return localStorage.getItem('openrouter_api_key');
    }

    /**
     * Saves API key to localStorage
     */
    private saveApiKey(): void {
        const apiKey = this.apiKeyInput.value.trim();

        if (!apiKey) {
            this.updateApiKeyStatus('error', 'API key cannot be empty');
            return;
        }

        // Basic validation: check if it starts with expected prefix
        if (!apiKey.startsWith('sk-or-v1-')) {
            this.updateApiKeyStatus('error', 'Invalid API key format. Should start with "sk-or-v1-"');
            return;
        }

        // Save to localStorage
        localStorage.setItem('openrouter_api_key', apiKey);

        // Update status
        this.updateApiKeyStatus('valid', 'API key saved: ' + this.maskApiKey(apiKey));

        // Show success message briefly
        this.showTemporaryMessage('API key saved successfully');
    }

    /**
     * Clears API key from localStorage
     */
    private clearApiKey(): void {
        if (confirm('Are you sure you want to clear the API key?')) {
            localStorage.removeItem('openrouter_api_key');
            this.apiKeyInput.value = '';
            this.updateApiKeyStatus('not-set', 'No API key configured');
            this.showTemporaryMessage('API key cleared');
        }
    }

    /**
     * Masks API key for display (shows first 10 and last 4 characters)
     */
    private maskApiKey(apiKey: string): string {
        if (apiKey.length < 20) {
            return apiKey.substring(0, 8) + '***';
        }
        return apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4);
    }

    /**
     * Updates API key status indicator
     */
    private updateApiKeyStatus(status: 'valid' | 'invalid' | 'not-set' | 'error', message: string): void {
        this.apiKeyStatus.className = 'api-key-status';
        this.apiKeyStatus.classList.add(`status-${status}`);

        let icon = '';
        switch (status) {
            case 'valid':
                icon = '<i class="fas fa-check-circle"></i>';
                break;
            case 'invalid':
            case 'error':
                icon = '<i class="fas fa-exclamation-circle"></i>';
                break;
            case 'not-set':
                icon = '<i class="fas fa-info-circle"></i>';
                break;
        }

        this.apiKeyStatus.innerHTML = `${icon} <span>${message}</span>`;
    }

    /**
     * Shows a temporary success/info message
     */
    private showTemporaryMessage(message: string): void {
        const originalStatus = this.apiKeyStatus.innerHTML;
        const originalClass = this.apiKeyStatus.className;

        this.apiKeyStatus.className = 'api-key-status status-success';
        this.apiKeyStatus.innerHTML = `<i class="fas fa-check"></i> <span>${message}</span>`;

        setTimeout(() => {
            this.apiKeyStatus.className = originalClass;
            this.apiKeyStatus.innerHTML = originalStatus;
        }, 3000);
    }
}
