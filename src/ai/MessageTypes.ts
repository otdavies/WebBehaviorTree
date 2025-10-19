/**
 * MessageTypes: Type definitions for AI chat messages
 */

/**
 * Role of the message sender
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Status of a tool call
 */
export type ToolCallStatus = 'running' | 'success' | 'error';

/**
 * A tool call made by the AI
 */
export interface ToolCall {
    /** Unique identifier for this tool call */
    id: string;

    /** Name of the operation/tool being called */
    name: string;

    /** Arguments passed to the tool */
    args: any;

    /** Result of the tool call (if completed) */
    result?: any;

    /** Current status of the tool call */
    status: ToolCallStatus;

    /** Error message if status is 'error' */
    error?: string;

    /** Timestamp when the tool call started */
    startedAt: Date;

    /** Timestamp when the tool call completed */
    completedAt?: Date;
}

/**
 * A chat message in the conversation
 */
export interface ChatMessage {
    /** Unique identifier for this message */
    id: string;

    /** Role of the message sender */
    role: MessageRole;

    /** Text content of the message */
    content: string;

    /** When the message was created */
    timestamp: Date;

    /** Tool calls made during this message (for assistant messages) */
    toolCalls?: ToolCall[];

    /** Thinking/reasoning text (for assistant messages) */
    thinking?: string;

    /** Whether the message is still being streamed */
    isStreaming?: boolean;
}

/**
 * State of the chat conversation
 */
export interface ChatState {
    /** All messages in the conversation */
    messages: ChatMessage[];

    /** Whether the AI is currently responding */
    isResponding: boolean;

    /** Whether the AI is currently thinking */
    isThinking: boolean;

    /** Current tool calls in progress */
    activeToolCalls: ToolCall[];
}
