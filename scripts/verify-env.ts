#!/usr/bin/env tsx
/**
 * Verify environment variables are properly configured.
 * Exits with code 1 if critical variables are missing (unless DEMO_MODE=true).
 */

import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

interface EnvRequirement {
  key: string;
  label: string;
  required: boolean;
  group: string;
}

const requirements: EnvRequirement[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', required: true, group: 'Supabase' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key', required: true, group: 'Supabase' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key', required: true, group: 'Supabase' },
  { key: 'DATABASE_URL', label: 'Database URL', required: true, group: 'Supabase' },
  { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key', required: true, group: 'OpenRouter' },
  { key: 'OPENROUTER_BASE_URL', label: 'OpenRouter Base URL', required: true, group: 'OpenRouter' },
  { key: 'OPENROUTER_DEFAULT_MODEL', label: 'Default Model', required: false, group: 'OpenRouter' },
  { key: 'APP_ENCRYPTION_KEY', label: 'Encryption Key', required: true, group: 'Security' },
  { key: 'SESSION_SECRET', label: 'Session Secret', required: true, group: 'Security' },
  { key: 'API_BASE_URL', label: 'API Base URL', required: false, group: 'Services' },
  { key: 'WORKER_BASE_URL', label: 'Worker Base URL', required: false, group: 'Services' },
  { key: 'NOTION_CLIENT_ID', label: 'Notion Client ID', required: false, group: 'Notion' },
  { key: 'NOTION_CLIENT_SECRET', label: 'Notion Client Secret', required: false, group: 'Notion' },
  { key: 'SUPABASE_MCP_URL', label: 'Supabase MCP URL', required: false, group: 'Supabase MCP' },
  { key: 'REDIS_URL', label: 'Redis URL', required: false, group: 'Queue' },
];

function loadEnv(): Record<string, string> {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) return {};
  const content = readFileSync(envPath, 'utf8');
  return Object.fromEntries(
    content.split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );
}

function isSet(value: string | undefined): boolean {
  return !!value && !value.startsWith('your-') && !value.startsWith('generate-');
}

function main() {
  const env = { ...loadEnv(), ...process.env };
  const demoMode = env.DEMO_MODE === 'true';

  console.log('\n🔍 Thinkora Environment Verification\n');

  if (demoMode) {
    console.log('ℹ️  DEMO_MODE is enabled — missing credentials are expected.\n');
  }

  let groups = new Map<string, { key: string; label: string; ok: boolean; required: boolean }[]>();

  for (const req of requirements) {
    if (!groups.has(req.group)) groups.set(req.group, []);
    groups.get(req.group)!.push({
      key: req.key,
      label: req.label,
      ok: isSet(env[req.key]),
      required: req.required,
    });
  }

  let missingRequired = 0;

  for (const [group, items] of groups) {
    console.log(`  [${group}]`);
    for (const item of items) {
      const icon = item.ok ? '✓' : item.required ? '✗' : '⚠';
      const suffix = item.required ? '' : ' (optional)';
      console.log(`    ${icon} ${item.label} (${item.key})${suffix}`);
      if (!item.ok && item.required) missingRequired++;
    }
    console.log('');
  }

  if (missingRequired > 0 && !demoMode) {
    console.log(`❌ ${missingRequired} required variable(s) missing.`);
    console.log('   Set DEMO_MODE=true to run with mock data, or provide credentials.\n');
    process.exit(1);
  }

  console.log('✅ Environment verification passed.\n');
}

main();
