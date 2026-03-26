/**
 * API client for communicating with the Thinkora backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || body.message || message;
    } catch {}
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  // Health
  health: () => request<{ status: string }>('/health'),

  // Conversations
  getConversations: () => request<{ data: any[] }>('/chat/conversations'),
  getConversation: (id: string) => request<any>(`/chat/conversations/${id}`),
  createConversation: (data: { title?: string }) =>
    request<any>('/chat/conversations', { method: 'POST', body: JSON.stringify(data) }),
  updateConversation: (id: string, data: { title?: string }) =>
    request<any>(`/chat/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteConversation: (id: string) =>
    request<void>(`/chat/conversations/${id}`, { method: 'DELETE' }),

  // Chat
  sendMessage: (data: {
    conversationId: string;
    content: string;
    selectedModel?: string;
    routingMode?: string;
    fallbackModels?: string[];
    maxCost?: number;
    strictZdr?: boolean;
  }) => request<any>('/chat/send', { method: 'POST', body: JSON.stringify(data) }),

  streamMessage: async function* (data: {
    conversationId: string;
    content: string;
    selectedModel?: string;
    routingMode?: string;
  }) {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) throw new ApiError(res.status, 'Stream failed');
    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            yield JSON.parse(data);
          } catch {}
        }
      }
    }
  },

  // Files
  getFiles: () => request<{ data: any[] }>('/files'),
  getFile: (id: string) => request<any>(`/files/${id}`),
  reprocessFile: (id: string) => request<any>(`/files/${id}/reprocess`, { method: 'POST' }),
  deleteFile: (id: string) => request<void>(`/files/${id}`, { method: 'DELETE' }),

  // Connectors
  getConnectors: () => request<{ data: any[] }>('/connectors'),
  getConnectorHealth: () => request<any>('/connectors/health'),
  connectNotion: () => request<{ authUrl: string }>('/connectors/notion/start', { method: 'POST' }),
  disconnectNotion: () => request<void>('/connectors/notion/disconnect', { method: 'POST' }),
  connectSupabaseMcp: (data: { url: string; accessToken: string }) =>
    request<any>('/connectors/supabase-mcp/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectSupabaseMcp: () =>
    request<void>('/connectors/supabase-mcp/disconnect', { method: 'POST' }),

  // Models
  getModels: (params?: { search?: string; tags?: string[]; maxCost?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.tags) query.set('tags', params.tags.join(','));
    if (params?.maxCost) query.set('maxCost', params.maxCost.toString());
    return request<{ data: any[] }>(`/models?${query}`);
  },
  getModel: (id: string) => request<any>(`/models/${encodeURIComponent(id)}`),
  refreshModels: () => request<any>('/models/refresh', { method: 'POST' }),
  getModelRecommendations: () => request<any>('/models/recommendations'),
  analyzeModel: (data: { modelId: string; taskType?: string }) =>
    request<any>('/models/analyze', { method: 'POST', body: JSON.stringify(data) }),
  getModelStats: () => request<any>('/models/stats'),

  // Search
  search: (data: { query: string; sources?: string[]; limit?: number }) =>
    request<any>('/search/query', { method: 'POST', body: JSON.stringify(data) }),
  debugSearch: (data: { query: string }) =>
    request<any>('/search/debug', { method: 'POST', body: JSON.stringify(data) }),

  // Dashboard
  getDashboardOverview: (params?: { period?: string }) => {
    const query = params?.period ? `?period=${params.period}` : '';
    return request<any>(`/dashboard/overview${query}`);
  },
  getDashboardLogs: (params?: Record<string, string>) => {
    const query = new URLSearchParams(params || {});
    return request<any>(`/dashboard/logs?${query}`);
  },
  getDashboardErrors: () => request<any>('/dashboard/errors'),
  getDashboardCosts: () => request<any>('/dashboard/costs'),
  getDashboardModels: () => request<any>('/dashboard/models'),
  getDashboardRetrieval: () => request<any>('/dashboard/retrieval'),
  getDashboardConnectors: () => request<any>('/dashboard/connectors'),
  getDashboardJobs: () => request<any>('/dashboard/jobs'),
  getDashboardUsageTimeseries: (params?: { period?: string }) => {
    const query = params?.period ? `?period=${params.period}` : '';
    return request<any>(`/dashboard/usage-timeseries${query}`);
  },
  getModelCompare: () => request<any>('/dashboard/model-compare'),
  getModelPerformance: (id: string) =>
    request<any>(`/dashboard/model/${encodeURIComponent(id)}/performance`),

  // Memory
  getMemory: () => request<any>('/memory'),
  deleteMemory: (id: string) => request<void>(`/memory/${id}`, { method: 'DELETE' }),
};

export default api;
