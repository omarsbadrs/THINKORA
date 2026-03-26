export const config = {
  server: {
    port: parseInt(process.env.PORT || '4000', 10),
    host: process.env.HOST || '0.0.0.0',
    logLevel: process.env.LOG_LEVEL || 'info',
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  supabase: {
    url: process.env.SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    defaultModel: process.env.OPENROUTER_DEFAULT_MODEL || 'anthropic/claude-sonnet-4',
  },

  notion: {
    clientId: process.env.NOTION_CLIENT_ID || '',
    clientSecret: process.env.NOTION_CLIENT_SECRET || '',
    redirectUri: process.env.NOTION_REDIRECT_URI || 'http://localhost:4000/connectors/notion/callback',
  },

  supabaseMcp: {
    url: process.env.SUPABASE_MCP_URL || '',
    token: process.env.SUPABASE_MCP_TOKEN || '',
  },

  storage: {
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'application/pdf,text/plain,text/markdown,application/json').split(','),
  },

  security: {
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindow: process.env.RATE_LIMIT_WINDOW || '1 minute',
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(','),
  },

  demo: {
    enabled: process.env.DEMO_MODE === 'true',
    userId: process.env.DEMO_USER_ID || 'demo-user-001',
    userName: process.env.DEMO_USER_NAME || 'Demo User',
    userEmail: process.env.DEMO_USER_EMAIL || 'demo@thinkora.dev',
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL || '5000', 10),
    retryAttempts: parseInt(process.env.WORKER_RETRY_ATTEMPTS || '3', 10),
    retryDelay: parseInt(process.env.WORKER_RETRY_DELAY || '1000', 10),
  },
} as const;

export function isDemoMode(): boolean {
  return config.demo.enabled;
}

export type Config = typeof config;
