/**
 * Maps backend API responses to chat UI state shapes.
 */

export interface ApiMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  model_used?: string;
  actual_model?: string;
  tokens_input?: number;
  tokens_output?: number;
  latency_ms?: number;
  citations?: ApiCitation[];
  tool_calls?: ApiToolCall[];
}

export interface ApiCitation {
  id: string;
  source_type: 'file' | 'notion' | 'supabase' | 'web';
  source_name: string;
  source_id: string;
  chunk_text: string;
  relevance_score: number;
  page_number?: number;
  section_title?: string;
}

export interface ApiToolCall {
  id: string;
  tool_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: Record<string, unknown>;
  output?: unknown;
  duration_ms?: number;
}

export interface ApiConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview?: string;
  model_used?: string;
}

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  actualModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
  citations?: UiCitation[];
  toolCalls?: UiToolCall[];
}

export interface UiCitation {
  source: string;
  text: string;
  sourceType: string;
  relevance: number;
  pageNumber?: number;
  sectionTitle?: string;
}

export interface UiToolCall {
  id: string;
  name: string;
  status: string;
  durationMs?: number;
}

export interface UiConversation {
  id: string;
  title: string;
  preview: string;
  icon: string;
  time: string;
  group: string;
}

export function mapApiMessageToUi(msg: ApiMessage): UiMessage {
  return {
    id: msg.id,
    role: msg.role === 'system' ? 'assistant' : msg.role,
    content: msg.content,
    timestamp: formatRelativeTime(msg.created_at),
    modelUsed: msg.model_used,
    actualModel: msg.actual_model,
    tokensInput: msg.tokens_input,
    tokensOutput: msg.tokens_output,
    latencyMs: msg.latency_ms,
    citations: msg.citations?.map(c => ({
      source: c.source_name,
      text: c.chunk_text,
      sourceType: c.source_type,
      relevance: c.relevance_score,
      pageNumber: c.page_number,
      sectionTitle: c.section_title,
    })),
    toolCalls: msg.tool_calls?.map(t => ({
      id: t.id,
      name: t.tool_name,
      status: t.status,
      durationMs: t.duration_ms,
    })),
  };
}

export function mapApiConversationToUi(conv: ApiConversation): UiConversation {
  return {
    id: conv.id,
    title: conv.title,
    preview: conv.last_message_preview || '',
    icon: pickConversationIcon(conv.title),
    time: formatRelativeTime(conv.updated_at),
    group: getTimeGroup(conv.updated_at),
  };
}

function pickConversationIcon(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes('debug') || lower.includes('bug') || lower.includes('error')) return '🐛';
  if (lower.includes('deploy') || lower.includes('launch') || lower.includes('release')) return '🚀';
  if (lower.includes('review') || lower.includes('code')) return '📝';
  if (lower.includes('api') || lower.includes('integrat')) return '🔗';
  if (lower.includes('design') || lower.includes('architect')) return '🏗️';
  if (lower.includes('perf') || lower.includes('optim') || lower.includes('speed')) return '⚡';
  if (lower.includes('setup') || lower.includes('config') || lower.includes('install')) return '⚙️';
  return '💬';
}

function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}

function getTimeGroup(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return 'Today';
  if (date >= yesterday) return 'Yesterday';
  if (date >= weekAgo) return 'This Week';
  return 'Earlier';
}
