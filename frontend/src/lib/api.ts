export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// API client for chat backend
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = new ApiError(
      `API request failed: ${response.statusText}`,
      response.status
    );
    throw error;
  }

  return response.json() as Promise<T>;
}

// Thread types
interface ThreadItem {
  thread_id: string;
  title: string;
  preview: string;
  created_at: string;
  last_updated: string;
}

interface MessageItem {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ListThreadsResponse {
  threads: ThreadItem[];
}

interface GetThreadMessagesResponse {
  messages: MessageItem[];
}

interface StartChatResponse {
  thread_id: string;
  reply: string;
}

interface SendMessageResponse {
  reply: string;
}

interface RegenerateResponse {
  reply: string;
}

export const api = {
  listThreads: () => fetchApi<ListThreadsResponse>('/api/threads'),
  
  getThreadMessages: (threadId: string) =>
    fetchApi<GetThreadMessagesResponse>(`/api/threads/${threadId}`),
  
  startChat: (content: string) =>
    fetchApi<StartChatResponse>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: content }),
    }),
  
  sendMessage: (threadId: string, content: string) =>
    fetchApi<SendMessageResponse>(`/api/chat/${threadId}`, {
      method: 'POST',
      body: JSON.stringify({ message: content }),
    }),
  
  regenerate: (threadId: string) =>
    fetchApi<RegenerateResponse>(`/api/chat/${threadId}/regenerate`, {
      method: 'POST',
    }),
  
  renameThread: (threadId: string, title: string) =>
    fetchApi<void>(`/api/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }),
  
  deleteThread: (threadId: string) =>
    fetchApi<void>(`/api/threads/${threadId}`, {
      method: 'DELETE',
    }),
};
