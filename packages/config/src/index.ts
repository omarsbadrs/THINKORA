/**
 * @thinkora/config — Shared configuration constants and utilities.
 */

import { z } from 'zod';

// ─── Environment Schema ─────────────────────────────────────────────────

export const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  DATABASE_URL: z.string().optional(),

  // OpenRouter
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_BASE_URL: z.string().url().default('https://openrouter.ai/api/v1'),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_APP_NAME: z.string().default('Thinkora'),
  OPENROUTER_DEFAULT_MODEL: z.string().default('anthropic/claude-sonnet-4'),

  // App
  DEMO_MODE: z.string().transform(v => v === 'true').default('false'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  MAX_UPLOAD_MB: z.string().transform(Number).default('50'),
  OCR_ENABLED: z.string().transform(v => v === 'true').default('false'),

  // Services
  API_BASE_URL: z.string().default('http://localhost:4000'),
  WORKER_BASE_URL: z.string().default('http://localhost:4100'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
});

export type EnvConfig = z.infer<typeof envSchema>;

// ─── Application Constants ──────────────────────────────────────────────

export const APP_NAME = 'Thinkora';
export const APP_VERSION = '0.1.0';

export const LIMITS = {
  MAX_UPLOAD_SIZE_MB: 50,
  MAX_MESSAGE_LENGTH: 32_000,
  MAX_CONVERSATION_TITLE_LENGTH: 200,
  MAX_CONVERSATIONS_PER_USER: 1_000,
  MAX_MESSAGES_PER_CONVERSATION: 10_000,
  MAX_FILES_PER_USER: 500,
  MAX_CHUNKS_PER_FILE: 5_000,
  MAX_MEMORY_ENTRIES: 500,
  MAX_TOOL_CALLS_PER_REQUEST: 10,
  MAX_RETRIEVAL_CHUNKS: 20,
  MAX_RESPONSE_TOKENS: 4_096,
  TOOL_TIMEOUT_MS: 30_000,
  SESSION_MEMORY_MAX: 50,
  SESSION_EXPIRY_HOURS: 24,
} as const;

export const SUPPORTED_FILE_TYPES = [
  'pdf', 'docx', 'txt', 'md', 'csv', 'xlsx',
  'json', 'html', 'xml', 'code', 'image', 'archive',
] as const;

export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/xml',
  'application/json',
  'application/xml',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/zip',
] as const;

export const ROUTING_MODES = [
  'auto', 'fast', 'balanced', 'best-quality', 'reasoning',
  'coding', 'vision', 'file-analysis', 'data-analysis',
] as const;

export type RoutingMode = (typeof ROUTING_MODES)[number];

export const TASK_TYPES = [
  'quick_chat', 'deep_reasoning', 'code_review', 'data_analysis',
  'file_analysis', 'report_generation', 'json_extraction', 'general',
] as const;

export type TaskType = (typeof TASK_TYPES)[number];

export const CONNECTOR_TYPES = ['notion', 'supabase_mcp', 'openrouter'] as const;
export type ConnectorType = (typeof CONNECTOR_TYPES)[number];

// ─── Feature Flags ──────────────────────────────────────────────────────

export const DEFAULT_FEATURE_FLAGS = {
  demo_mode: false,
  notion_enabled: true,
  supabase_mcp_enabled: true,
  file_uploads_enabled: true,
  model_sync_enabled: true,
  ocr_enabled: false,
  memory_enabled: true,
  audit_logging_enabled: true,
} as const;

// ─── Helpers ────────────────────────────────────────────────────────────

export function isDemoMode(): boolean {
  return (
    process.env.DEMO_MODE === 'true' ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.OPENROUTER_API_KEY
  );
}

export function getEnvOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}
