/**
 * TypeScript type definitions for Calm Sphere chat functionality
 * 
 * LOCAL MEMORY ONLY - All thread state is stored in React state.
 * No backend API calls are made.
 */

/**
 * Message role enum
 */
export type MessageRole = 'user' | 'assistant';


/**
 * Represents a single message in a conversation thread
 */
export interface Message {
  /** Role of the message sender */
  role: MessageRole;
  /** Text content of the message */
  content: string;
}


/**
 * Represents a conversation thread (local memory only)
 * 
 * TASK 1: Thread shape stored in React state
 */
export interface Thread {
  /** Unique thread identifier */
  id: string;
  /** List of messages in the thread */
  messages: Message[];
  /** ISO 8601 timestamp when thread was created */
  createdAt: string;
  /** ISO 8601 timestamp of last activity */
  updatedAt: string;
}


/**
 * Thread item for list displays (derived from Thread)
 */
export interface ThreadListItem {
  /** Unique thread identifier */
  id: string;
  /** Preview of the last message (truncated) */
  preview: string;
  /** ISO 8601 timestamp when thread was created */
  createdAt: string;
  /** ISO 8601 timestamp of last activity */
  updatedAt: string;
}
