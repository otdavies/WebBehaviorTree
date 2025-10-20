import { ChatPanel } from '../ui/ChatPanel.js';
import { EditorState } from '../state/EditorState.js';
import { ModelInterface } from './ModelInterface.js';
import { OpenRouterClient } from './OpenRouterClient.js';
import { Canvas } from '../editor/Canvas.js';
import { Viewport } from '../editor/Viewport.js';
import { SelectionManager } from '../editor/SelectionManager.js';
import { TreeSerializer } from '../utils/TreeSerializer.js';
import { buildSystemPrompt } from './SystemPrompt.js';
import { TOOL_DEFINITIONS, executeToolCall } from './ToolDefinitions.js';
import { ToolCall } from './MessageTypes.js';

/**
 * ChatHandler: Handles AI chat message processing and tool execution
 *
 * This class encapsulates all the logic for:
 * - Sending messages to the AI
 * - Handling retries and errors
 * - Executing tool calls
 * - Updating the UI
 */
export class ChatHandler {
    constructor(
        private chatPanel: ChatPanel,
        private editorState: EditorState,
        private modelInterface: ModelInterface,
        private openRouterClient: OpenRouterClient,
        private canvas: Canvas,
        private viewport: Viewport,
        private selectionManager: SelectionManager
    ) {}

    /**
     * Initializes the chat handler by wiring up the message handler
     */
    public initialize(): void {
        this.chatPanel.onSendMessage = async (_message: string) => {
            await this.handleMessage();
        };
    }

    /**
     * Handles an incoming chat message
     */
    private async handleMessage(): Promise<void> {
        // Check if API key is configured
        if (!this.openRouterClient.isInitialized()) {
            this.chatPanel.addSystemMessage(
                'Please set your OpenRouter API key in Settings → AI Assistant to use AI chat.'
            );
            return;
        }

        // Show thinking indicator
        this.chatPanel.showThinking();

        // Retry logic
        let retryCount = 0;
        const maxRetries = 2;

        while (retryCount <= maxRetries) {
            try {
                await this.processMessage();
                // Success - break out of retry loop
                break;
            } catch (error) {
                this.chatPanel.hideThinking();
                const shouldRetry = await this.handleError(error, retryCount, maxRetries);
                if (shouldRetry) {
                    retryCount++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    this.chatPanel.showThinking();
                } else {
                    break;
                }
            }
        }
    }

    /**
     * Processes the current message with the AI
     */
    private async processMessage(): Promise<void> {
        // Get current tree state
        const treeState = TreeSerializer.serializeForAI(
            this.editorState,
            this.viewport,
            this.selectionManager
        );

        // Build system prompt with tree state and instructions
        const nodeTypes = this.modelInterface.getAvailableNodeTypes();
        const systemPrompt = buildSystemPrompt(
            TreeSerializer.createTextSummary(treeState),
            nodeTypes.success ? nodeTypes.data : null
        );

        // Call OpenRouter API with streaming
        let assistantMessage = '';
        const toolCalls: ToolCall[] = [];

        // Get full conversation history
        const conversationHistory = this.chatPanel.getState().messages;

        console.log('[Chat Debug] Sending messages to API:', conversationHistory.length, 'messages');
        console.log('[Chat Debug] Last 3 messages:', conversationHistory.slice(-3).map(m => ({
            role: m.role,
            contentLength: m.content?.length || 0,
            toolCalls: m.toolCalls?.length || 0
        })));

        await this.openRouterClient.sendMessage(
            conversationHistory,
            systemPrompt,
            TOOL_DEFINITIONS,
            // On text chunk
            (text) => {
                assistantMessage += text;
                // Could update UI in real-time here if desired
            },
            // On tool call
            async (toolCall) => {
                await this.handleToolCall(toolCall, toolCalls);
            }
        );

        // Hide thinking, show response
        this.chatPanel.hideThinking();

        // Add assistant message with tool calls
        if (assistantMessage || toolCalls.length > 0) {
            this.chatPanel.addAssistantMessage(
                assistantMessage || 'I executed the requested operations.',
                undefined,
                toolCalls
            );
        }
    }

    /**
     * Handles a tool call from the AI
     */
    private async handleToolCall(toolCall: ToolCall, toolCalls: ToolCall[]): Promise<void> {
        toolCalls.push(toolCall);

        console.log('[Chat Debug] Executing tool:', toolCall.name, 'with args:', toolCall.args);

        // Execute tool via ModelInterface
        const result = await executeToolCall(
            { name: toolCall.name, args: toolCall.args },
            this.modelInterface
        );

        console.log('[Chat Debug] Tool result:', result);

        // Update tool call status
        toolCall.result = result;
        toolCall.status = result.success ? 'success' : 'error';
        if (!result.success && result.error) {
            toolCall.error = result.error;
        }

        // Rebuild port cache after tool execution (for node operations)
        if (['create_node', 'delete_node', 'connect_nodes', 'disconnect_node'].includes(toolCall.name)) {
            this.canvas.rebuildPortCache();
        }
    }

    /**
     * Handles errors during message processing
     * @returns true if should retry, false otherwise
     */
    private async handleError(error: unknown, retryCount: number, maxRetries: number): Promise<boolean> {
        let errorMessage = '';
        let shouldRetry = false;

        if (error instanceof Error) {
            const errMsg = error.message.toLowerCase();

            // Network or CORS error
            if (errMsg.includes('cors') || errMsg.includes('network') || errMsg.includes('fetch')) {
                if (retryCount < maxRetries) {
                    errorMessage = `Network error. Retrying... (Attempt ${retryCount + 1}/${maxRetries})`;
                    shouldRetry = true;
                } else {
                    errorMessage = 'Network error. Please check your connection and try again.';
                }
            }
            // API authentication error
            else if (errMsg.includes('401') || errMsg.includes('unauthorized') || errMsg.includes('authentication')) {
                errorMessage = 'Invalid API key. Please check your OpenRouter API key in Settings → AI Assistant.';
            }
            // API rate limit
            else if (errMsg.includes('429') || errMsg.includes('rate limit')) {
                errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            }
            // API error with status code
            else if (errMsg.includes('api request failed:')) {
                errorMessage = `API Error: ${error.message}`;
            }
            // Generic error
            else {
                errorMessage = `Error: ${error.message}`;
            }
        } else {
            errorMessage = 'Unknown error occurred. Please try again.';
        }

        console.error('[Chat Error]', error);
        this.chatPanel.addSystemMessage(errorMessage);

        return shouldRetry;
    }
}
