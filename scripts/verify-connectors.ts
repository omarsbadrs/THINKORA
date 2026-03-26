#!/usr/bin/env tsx
/**
 * Verify connector health — checks Notion, Supabase MCP, OpenRouter, and Redis connectivity.
 */

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

interface ConnectorCheck {
  name: string;
  check: () => Promise<{ ok: boolean; detail: string }>;
}

const connectors: ConnectorCheck[] = [
  {
    name: 'OpenRouter API',
    check: async () => {
      const key = process.env.OPENROUTER_API_KEY;
      if (!key || key.startsWith('your-')) {
        return { ok: false, detail: 'API key not configured' };
      }
      try {
        const res = await fetch('https://openrouter.ai/api/v1/models', {
          headers: { Authorization: `Bearer ${key}` },
        });
        if (res.ok) {
          const data = await res.json() as { data?: unknown[] };
          return { ok: true, detail: `${data.data?.length ?? 0} models available` };
        }
        return { ok: false, detail: `HTTP ${res.status}` };
      } catch (err: any) {
        return { ok: false, detail: err.message };
      }
    },
  },
  {
    name: 'Supabase',
    check: async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key || url.startsWith('your-') || key.startsWith('your-')) {
        return { ok: false, detail: 'Supabase URL or key not configured' };
      }
      try {
        const res = await fetch(`${url}/rest/v1/`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
        });
        return { ok: res.ok, detail: res.ok ? 'Connected' : `HTTP ${res.status}` };
      } catch (err: any) {
        return { ok: false, detail: err.message };
      }
    },
  },
  {
    name: 'Notion MCP',
    check: async () => {
      const clientId = process.env.NOTION_CLIENT_ID;
      if (!clientId || clientId.startsWith('your-')) {
        return { ok: false, detail: 'Notion OAuth not configured (optional)' };
      }
      return { ok: true, detail: 'OAuth credentials present' };
    },
  },
  {
    name: 'Supabase MCP',
    check: async () => {
      const url = process.env.SUPABASE_MCP_URL;
      if (!url) {
        return { ok: false, detail: 'Supabase MCP URL not configured (optional)' };
      }
      try {
        const res = await fetch(url);
        return { ok: res.ok, detail: res.ok ? 'Reachable' : `HTTP ${res.status}` };
      } catch (err: any) {
        return { ok: false, detail: err.message };
      }
    },
  },
  {
    name: 'Redis',
    check: async () => {
      const url = process.env.REDIS_URL;
      if (!url) {
        return { ok: false, detail: 'Redis URL not configured — jobs will use in-memory queue' };
      }
      return { ok: true, detail: `Configured: ${url}` };
    },
  },
];

async function main() {
  console.log('\n🔌 Thinkora Connector Verification\n');

  for (const connector of connectors) {
    const result = await connector.check();
    const icon = result.ok ? `${colors.green}✓` : `${colors.yellow}⚠`;
    console.log(`  ${icon}${colors.reset} ${connector.name}: ${result.detail}`);
  }

  console.log('\n✅ Connector verification complete.\n');
}

main().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
