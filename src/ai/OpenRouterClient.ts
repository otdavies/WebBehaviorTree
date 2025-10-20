import { ChatMessage, ToolCall, ToolCallStatus } from './MessageTypes.js';

/**
 * OpenRouterClient: OpenAI-compatible API client with streaming support
 * Uses OpenRouter's API which supports CORS and doesn't require a proxy
 */

export interface UsageStats {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requestCount: number;
}

export type OnChunkCallback = (chunk: string) => void;
export type OnToolCallCallback = (toolCall: ToolCall) => void | Promise<void>;

interface OpenRouterMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: OpenRouterToolCall[];
    tool_call_id?: string;
    name?: string;
}

interface OpenRouterToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

interface OpenRouterTool {
    type: 'function';
    function: {
        name: string;
        description: string;
        parameters: any;
    };
}

interface StreamDelta {
    role?: string;
    content?: string;
    tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
            name?: string;
            arguments?: string;
        };
    }>;
}

interface StreamChoice {
    index: number;
    delta: StreamDelta;
    finish_reason?: string | null;
}

interface StreamEvent {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    choices?: StreamChoice[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export class OpenRouterClient {
    private apiKey: string | null = null;
    private model: string = 'anthropic/claude-3.5-sonnet';
    private usageStats: UsageStats;
    private readonly OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

    constructor() {
        this.usageStats = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            requestCount: 0
        };
    }

    initialize(apiKey: string): void {
        this.apiKey = apiKey;
    }

    setModel(model: string): void {
        this.model = model;
    }

    getModel(): string {
        return this.model;
    }

    isInitialized(): boolean {
        return this.apiKey !== null;
    }

    async sendMessage(
        messages: ChatMessage[],
        systemPrompt: string,
        tools: any[],
        onChunk?: OnChunkCallback,
        onToolCall?: OnToolCallCallback
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenRouterClient not initialized');
        }

        const openRouterMessages = this.convertMessages(messages, systemPrompt);
        const openRouterTools = this.convertTools(tools);

        const requestBody: any = {
            model: this.model,
            messages: openRouterMessages,
            stream: true,
            temperature: 1.0,
            max_tokens: 8192
        };

        if (openRouterTools.length > 0) {
            requestBody.tools = openRouterTools;
        }

        const response = await fetch(this.OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': window.location.href,
                'X-Title': 'Behavior Tree Editor'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `API request failed: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                    errorMessage = errorJson.error.message;
                }
            } catch {
                errorMessage += ` ${errorText}`;
            }

            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        return this.processStream(response.body, onChunk, onToolCall);
    }

    private async processStream(
        body: ReadableStream<Uint8Array>,
        onChunk?: OnChunkCallback,
        onToolCall?: OnToolCallCallback
    ): Promise<string> {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullText = '';
        const toolCalls: Map<number, ToolCall> = new Map();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) {
                        continue;
                    }

                    const data = line.slice(6);
                    if (data === '[DONE]') {
                        continue;
                    }

                    try {
                        const event: StreamEvent = JSON.parse(data);

                        if (event.usage) {
                            this.usageStats.inputTokens += event.usage.prompt_tokens || 0;
                            this.usageStats.outputTokens += event.usage.completion_tokens || 0;
                            this.usageStats.totalTokens += event.usage.total_tokens || 0;
                        }

                        if (event.choices && event.choices.length > 0) {
                            const choice = event.choices[0];
                            const delta = choice.delta;

                            if (delta.content) {
                                fullText += delta.content;
                                if (onChunk) {
                                    onChunk(delta.content);
                                }
                            }

                            if (delta.tool_calls) {
                                for (const toolCallDelta of delta.tool_calls) {
                                    const index = toolCallDelta.index;

                                    if (!toolCalls.has(index)) {
                                        if (toolCallDelta.id && toolCallDelta.function?.name) {
                                            const toolCall: ToolCall = {
                                                id: toolCallDelta.id,
                                                name: toolCallDelta.function.name,
                                                args: {},
                                                status: 'running' as ToolCallStatus,
                                                startedAt: new Date()
                                            };
                                            toolCalls.set(index, toolCall);
                                        }
                                    } else {
                                        const toolCall = toolCalls.get(index)!;
                                        if (toolCallDelta.function?.arguments) {
                                            const existingArgs = toolCall.args as any;
                                            const argsJson = existingArgs.__partial_json || '';
                                            toolCall.args = {
                                                __partial_json: argsJson + toolCallDelta.function.arguments
                                            };
                                        }
                                    }
                                }
                            }

                            if (choice.finish_reason === 'tool_calls') {
                                for (const toolCall of toolCalls.values()) {
                                    try {
                                        const argsData = (toolCall.args as any).__partial_json;
                                        if (argsData) {
                                            toolCall.args = JSON.parse(argsData);
                                        }
                                        if (onToolCall) {
                                            await onToolCall(toolCall);
                                        }
                                        toolCall.completedAt = new Date();
                                    } catch (error) {
                                        toolCall.status = 'error';
                                        toolCall.error = `Failed to parse tool arguments: ${(error as Error).message}`;
                                        toolCall.completedAt = new Date();
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Failed to parse SSE event:', error);
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }

        this.usageStats.requestCount++;
        return fullText;
    }

    async validateApiKey(apiKey: string): Promise<boolean> {
        try {
            const response = await fetch(this.OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.href,
                    'X-Title': 'Behavior Tree Editor'
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'test' }]
                })
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    getUsage(): UsageStats {
        return { ...this.usageStats };
    }

    resetUsage(): void {
        this.usageStats = {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            requestCount: 0
        };
    }

    private convertMessages(messages: ChatMessage[], systemPrompt: string): OpenRouterMessage[] {
        const openRouterMessages: OpenRouterMessage[] = [];

        if (systemPrompt && systemPrompt.trim()) {
            openRouterMessages.push({
                role: 'system',
                content: systemPrompt
            });
        }

        for (const msg of messages) {
            if (msg.role === 'system') {
                continue;
            }

            if (msg.role === 'user') {
                openRouterMessages.push({
                    role: 'user',
                    content: msg.content
                });
            } else if (msg.role === 'assistant') {
                const assistantMessage: OpenRouterMessage = {
                    role: 'assistant',
                    content: msg.content || ''
                };

                const toolResultMessages: OpenRouterMessage[] = [];

                if (msg.toolCalls && msg.toolCalls.length > 0) {
                    const toolCalls: OpenRouterToolCall[] = [];

                    for (const toolCall of msg.toolCalls) {
                        toolCalls.push({
                            id: toolCall.id,
                            type: 'function',
                            function: {
                                name: toolCall.name,
                                arguments: JSON.stringify(toolCall.args)
                            }
                        });

                        // Collect tool results to add AFTER assistant message
                        if (toolCall.result !== undefined) {
                            toolResultMessages.push({
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                name: toolCall.name,
                                content: JSON.stringify(toolCall.result)
                            });
                        }
                    }

                    if (toolCalls.length > 0) {
                        assistantMessage.tool_calls = toolCalls;
                    }
                }

                // Push assistant message FIRST
                if (assistantMessage.content || assistantMessage.tool_calls) {
                    openRouterMessages.push(assistantMessage);
                }

                // Then push tool results AFTER
                for (const toolResultMsg of toolResultMessages) {
                    openRouterMessages.push(toolResultMsg);
                }
            }
        }

        return openRouterMessages;
    }

    private convertTools(tools: any[]): OpenRouterTool[] {
        return tools.map(tool => {
            if (tool.type === 'function' && tool.function) {
                return tool;
            }
            return {
                type: 'function',
                function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.input_schema || tool.parameters
                }
            };
        });
    }
}
