export class ApiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// API client for chat backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

if (!API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_BASE_URL is not defined');
}

function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

function getAuthTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function withQuery(endpoint: string, query?: Record<string, string | undefined>): string {
  if (!query) return endpoint;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([k, v]) => {
    if (v) params.set(k, v);
  });
  const qs = params.toString();
  return qs ? `${endpoint}?${qs}` : endpoint;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  query?: Record<string, string | undefined>
): Promise<T> {
  const token = getAuthTokenFromCookie();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildApiUrl(withQuery(endpoint, query)), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.statusText}`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (typeof data?.detail === 'string' && data.detail.trim()) {
        message = data.detail;
      }
    } catch {
      // Keep default message when body is not JSON.
    }
    const error = new ApiError(
      message,
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
  listThreads: (userId: string) => fetchApi<ListThreadsResponse>('/threads', {}, { user_id: userId }),
  
  getThreadMessages: (threadId: string, userId: string) =>
    fetchApi<GetThreadMessagesResponse>(`/threads/${threadId}`, {}, { user_id: userId }),
  
  startChat: (content: string, userId: string) =>
    fetchApi<StartChatResponse>('/chat/start', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, message: content }),
    }),
  
  sendMessage: (threadId: string, content: string, userId: string) =>
    fetchApi<SendMessageResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, thread_id: threadId, message: content }),
    }),
  
  regenerate: (threadId: string, userId: string) =>
    fetchApi<RegenerateResponse>('/chat/regenerate', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, thread_id: threadId }),
    }),
  
  renameThread: (threadId: string, title: string, userId: string) =>
    fetchApi<void>(`/threads/${threadId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }, { user_id: userId }),
  
  deleteThread: (threadId: string, userId: string) =>
    fetchApi<void>(`/threads/${threadId}`, {
      method: 'DELETE',
    }, { user_id: userId }),
};
