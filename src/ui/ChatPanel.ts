import { ChatMessage, ChatState, ToolCall, MessageRole } from '../ai/MessageTypes.js';

/**
 * ChatPanel: Manages the AI chat interface
 *
 * Provides a floating chat widget triggered from the status bar.
 * Features:
 * - Minimal trigger: Sparkles icon in status bar
 * - Floating window: Appears bottom-right when opened
 * - Message display: User, assistant, and system messages
 * - Thinking indicator: Shows when AI is thinking
 * - Tool call display: Shows operations being executed
 * - Auto-scroll: Automatically scrolls to latest messages
 */
export class ChatPanel {
    // DOM elements
    private panel: HTMLElement;
    private toggleButton: HTMLButtonElement;
    private messagesContainer: HTMLElement;
    private inputArea: HTMLTextAreaElement;
    private sendButton: HTMLButtonElement;
    private closeButton: HTMLButtonElement;

    // State
    private isExpanded: boolean = false;
    private chatState: ChatState = {
        messages: [],
        isResponding: false,
        isThinking: false,
        activeToolCalls: []
    };

    // Callbacks
    public onSendMessage?: (message: string) => void;

    constructor() {
        // Get DOM elements
        this.panel = document.getElementById('chat-panel')!;
        this.toggleButton = document.getElementById('chat-toggle-btn') as HTMLButtonElement;
        this.messagesContainer = this.panel.querySelector('.chat-messages')!;
        this.inputArea = this.panel.querySelector('.chat-input-area textarea')!;
        this.sendButton = this.panel.querySelector('.chat-send-btn')!;
        this.closeButton = this.panel.querySelector('.chat-close-btn')!;

        this.setupEventListeners();
    }

    /**
     * Sets up all event listeners
     */
    private setupEventListeners(): void {
        // Toggle button click
        this.toggleButton.addEventListener('click', () => {
            this.toggle();
        });

        // Close button click
        this.closeButton.addEventListener('click', () => {
            this.collapse();
        });

        // Send button click
        this.sendButton.addEventListener('click', () => {
            this.handleSendMessage();
        });

        // Enter to send (Shift+Enter for new line)
        this.inputArea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSendMessage();
            }
        });

        // ESC to collapse
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isExpanded) {
                this.collapse();
            }
        });

        // Ctrl+K or Cmd+K to toggle
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
        });

        // Auto-resize textarea
        this.inputArea.addEventListener('input', () => {
            this.autoResizeTextarea();
        });
    }

    /**
     * Handles sending a message
     */
    private handleSendMessage(): void {
        const text = this.inputArea.value.trim();
        if (!text) return;

        // Prevent sending while responding
        if (this.chatState.isResponding) return;

        // Add user message to chat
        this.addUserMessage(text);

        // Clear input immediately for better UX
        this.inputArea.value = '';
        this.autoResizeTextarea();

        // Disable send button while processing
        this.setResponding(true);

        // Call callback if provided
        if (this.onSendMessage) {
            this.onSendMessage(text);
        }
    }

    /**
     * Auto-resizes the textarea based on content
     */
    private autoResizeTextarea(): void {
        this.inputArea.style.height = 'auto';
        this.inputArea.style.height = Math.min(this.inputArea.scrollHeight, 120) + 'px';
    }

    /**
     * Toggles the chat panel
     */
    public toggle(): void {
        if (this.isExpanded) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    /**
     * Expands the chat panel
     */
    public expand(): void {
        if (this.isExpanded) return;

        this.isExpanded = true;
        this.panel.classList.remove('collapsed');
        this.panel.classList.add('expanded');
        this.toggleButton.classList.add('active');

        // Focus the input
        setTimeout(() => {
            this.inputArea.focus();
        }, 300);

        this.scrollToBottom();
    }

    /**
     * Collapses the chat panel
     */
    public collapse(): void {
        if (!this.isExpanded) return;

        this.isExpanded = false;
        this.panel.classList.remove('expanded');
        this.panel.classList.add('collapsed');
        this.toggleButton.classList.remove('active');
    }

    /**
     * Adds a user message to the chat
     */
    public addUserMessage(content: string): void {
        const message: ChatMessage = {
            id: this.generateId(),
            role: 'user',
            content,
            timestamp: new Date()
        };

        this.chatState.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    /**
     * Updates a tool call status in real-time
     */
    public updateToolCallStatus(toolCallId: string, status: string, result?: any, error?: string): void {
        // Find the message containing this tool call
        for (const message of this.chatState.messages) {
            if (message.toolCalls) {
                const toolCall = message.toolCalls.find(tc => tc.id === toolCallId);
                if (toolCall) {
                    toolCall.status = status as any;
                    if (result !== undefined) {
                        toolCall.result = result;
                    }
                    if (error) {
                        toolCall.error = error;
                    }
                    toolCall.completedAt = new Date();

                    // Re-render the message to show updated status
                    const messageElement = document.getElementById(`message-${message.id}`);
                    if (messageElement) {
                        const toolCallElement = messageElement.querySelector(`.tool-call[data-id="${toolCallId}"]`);
                        if (toolCallElement) {
                            const statusIcon = this.getToolCallStatusIcon(status);
                            const headerElement = toolCallElement.querySelector('.tool-call-header');
                            if (headerElement) {
                                headerElement.innerHTML = `
                                    <i class="${statusIcon}"></i>
                                    <span class="tool-call-name">${toolCall.name}</span>
                                    <span class="tool-call-status">${status}</span>
                                `;
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    /**
     * Adds an assistant message to the chat
     */
    public addAssistantMessage(
        content: string,
        thinking?: string,
        toolCalls?: ToolCall[]
    ): void {
        const message: ChatMessage = {
            id: this.generateId(),
            role: 'assistant',
            content,
            timestamp: new Date(),
            thinking,
            toolCalls
        };

        this.chatState.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    /**
     * Adds a system message to the chat
     */
    public addSystemMessage(content: string): void {
        const message: ChatMessage = {
            id: this.generateId(),
            role: 'system',
            content,
            timestamp: new Date()
        };

        this.chatState.messages.push(message);
        this.renderMessage(message);
        this.scrollToBottom();
    }

    /**
     * Shows the thinking indicator
     */
    public showThinking(): void {
        this.chatState.isThinking = true;
        this.setResponding(true);

        // Add thinking indicator to messages
        const thinkingDiv = document.createElement('div');
        thinkingDiv.className = 'chat-message assistant thinking-indicator';
        thinkingDiv.id = 'thinking-indicator';
        thinkingDiv.innerHTML = `
            <div class="message-header">
                <i class="fas fa-robot"></i>
                <span class="message-role">AI</span>
            </div>
            <div class="message-content">
                <div class="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span class="thinking-text">Thinking...</span>
            </div>
        `;

        this.messagesContainer.appendChild(thinkingDiv);
        this.scrollToBottom();
    }

    /**
     * Hides the thinking indicator
     */
    public hideThinking(): void {
        this.chatState.isThinking = false;
        this.setResponding(false);

        const thinkingIndicator = document.getElementById('thinking-indicator');
        if (thinkingIndicator) {
            thinkingIndicator.remove();
        }
    }

    /**
     * Sets responding state (enables/disables input controls)
     */
    private setResponding(isResponding: boolean): void {
        this.chatState.isResponding = isResponding;
        this.sendButton.disabled = isResponding;
        this.inputArea.disabled = isResponding;

        if (isResponding) {
            this.sendButton.classList.add('disabled');
            this.inputArea.classList.add('disabled');
        } else {
            this.sendButton.classList.remove('disabled');
            this.inputArea.classList.remove('disabled');
        }
    }

    /**
     * Renders a message in the chat
     */
    private renderMessage(message: ChatMessage): void {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${message.role}`;
        messageDiv.id = `message-${message.id}`;

        // Message header
        const header = document.createElement('div');
        header.className = 'message-header';

        const icon = this.getMessageIcon(message.role);
        const roleText = this.getRoleText(message.role);

        header.innerHTML = `
            <i class="${icon}"></i>
            <span class="message-role">${roleText}</span>
            <span class="message-time">${this.formatTime(message.timestamp)}</span>
        `;

        messageDiv.appendChild(header);

        // Message content
        const content = document.createElement('div');
        content.className = 'message-content';
        content.textContent = message.content;
        messageDiv.appendChild(content);

        // Thinking section (if present)
        if (message.thinking) {
            const thinkingDiv = document.createElement('div');
            thinkingDiv.className = 'message-thinking';
            thinkingDiv.innerHTML = `
                <div class="thinking-header">
                    <i class="fas fa-brain"></i>
                    <span>Thinking</span>
                </div>
                <div class="thinking-content">${this.escapeHtml(message.thinking)}</div>
            `;
            messageDiv.appendChild(thinkingDiv);
        }

        // Tool calls section (if present)
        if (message.toolCalls && message.toolCalls.length > 0) {
            const toolCallsDiv = document.createElement('div');
            toolCallsDiv.className = 'message-tool-calls';

            for (const toolCall of message.toolCalls) {
                const toolCallDiv = this.renderToolCall(toolCall);
                toolCallsDiv.appendChild(toolCallDiv);
            }

            messageDiv.appendChild(toolCallsDiv);
        }

        this.messagesContainer.appendChild(messageDiv);
    }

    /**
     * Renders a tool call
     */
    private renderToolCall(toolCall: ToolCall): HTMLElement {
        const div = document.createElement('div');
        div.className = `tool-call ${toolCall.status}`;
        div.setAttribute('data-id', toolCall.id);

        const statusIcon = this.getToolCallStatusIcon(toolCall.status);

        div.innerHTML = `
            <div class="tool-call-header">
                <i class="${statusIcon}"></i>
                <span class="tool-call-name">${toolCall.name}</span>
                <span class="tool-call-status">${toolCall.status}</span>
            </div>
            <div class="tool-call-args">
                <pre>${JSON.stringify(toolCall.args, null, 2)}</pre>
            </div>
            ${toolCall.result ? `
                <div class="tool-call-result">
                    <strong>Result:</strong>
                    <pre>${JSON.stringify(toolCall.result, null, 2)}</pre>
                </div>
            ` : ''}
            ${toolCall.error ? `
                <div class="tool-call-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${this.escapeHtml(toolCall.error)}
                </div>
            ` : ''}
        `;

        return div;
    }

    /**
     * Gets the icon for a message role
     */
    private getMessageIcon(role: MessageRole): string {
        switch (role) {
            case 'user':
                return 'fas fa-user';
            case 'assistant':
                return 'fas fa-robot';
            case 'system':
                return 'fas fa-info-circle';
            default:
                return 'fas fa-circle';
        }
    }

    /**
     * Gets the text for a message role
     */
    private getRoleText(role: MessageRole): string {
        switch (role) {
            case 'user':
                return 'You';
            case 'assistant':
                return 'AI';
            case 'system':
                return 'System';
            default:
                return 'Unknown';
        }
    }

    /**
     * Gets the icon for a tool call status
     */
    private getToolCallStatusIcon(status: string): string {
        switch (status) {
            case 'running':
                return 'fas fa-spinner fa-spin';
            case 'success':
                return 'fas fa-check-circle';
            case 'error':
                return 'fas fa-times-circle';
            default:
                return 'fas fa-circle';
        }
    }

    /**
     * Formats a timestamp
     */
    private formatTime(date: Date): string {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Escapes HTML to prevent XSS
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Scrolls to the bottom of the messages
     */
    private scrollToBottom(): void {
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    /**
     * Generates a unique ID
     */
    private generateId(): string {
        return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clears all messages
     */
    public clearMessages(): void {
        this.chatState.messages = [];
        this.messagesContainer.innerHTML = '';
    }

    /**
     * Gets the chat state
     */
    public getState(): ChatState {
        return { ...this.chatState };
    }
}
