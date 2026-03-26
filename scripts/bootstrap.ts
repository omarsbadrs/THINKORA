#!/usr/bin/env tsx
/**
 * Thinkora Bootstrap Script
 * Checks environment, installs dependencies, validates setup, prints status.
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg: string) { console.log(msg); }
function ok(msg: string) { log(`${colors.green}✓${colors.reset} ${msg}`); }
function warn(msg: string) { log(`${colors.yellow}⚠${colors.reset} ${msg}`); }
function fail(msg: string) { log(`${colors.red}✗${colors.reset} ${msg}`); }
function heading(msg: string) { log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`); }

async function main() {
  heading('🚀 Thinkora Bootstrap');
  log('Checking prerequisites...\n');

  let errors = 0;

  // Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (major >= 20) {
    ok(`Node.js ${nodeVersion}`);
  } else {
    fail(`Node.js ${nodeVersion} — requires >= 20.0.0`);
    errors++;
  }

  // Check pnpm
  try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf8' }).trim();
    ok(`pnpm ${pnpmVersion}`);
  } catch {
    fail('pnpm not found. Install: npm install -g pnpm');
    errors++;
  }

  // Check for .env
  const envPath = resolve(ROOT, '.env');
  const envExamplePath = resolve(ROOT, '.env.example');
  if (existsSync(envPath)) {
    ok('.env file found');
  } else {
    warn('.env file not found — copying from .env.example');
    if (existsSync(envExamplePath)) {
      execSync(`cp "${envExamplePath}" "${envPath}"`);
      ok('Created .env from .env.example');
    } else {
      fail('.env.example not found');
      errors++;
    }
  }

  // Check critical env vars
  heading('Environment Variables');
  const envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => {
        const idx = l.indexOf('=');
        return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
      })
  );

  const critical = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
    { key: 'OPENROUTER_API_KEY', label: 'OpenRouter API Key' },
    { key: 'DATABASE_URL', label: 'Database URL' },
  ];

  const optional = [
    { key: 'NOTION_CLIENT_ID', label: 'Notion Client ID' },
    { key: 'NOTION_CLIENT_SECRET', label: 'Notion Client Secret' },
    { key: 'SUPABASE_MCP_URL', label: 'Supabase MCP URL' },
    { key: 'SENTRY_DSN', label: 'Sentry DSN' },
    { key: 'REDIS_URL', label: 'Redis URL' },
  ];

  let demoMode = false;
  for (const { key, label } of critical) {
    const val = envVars[key];
    if (val && !val.startsWith('your-')) {
      ok(`${label} (${key})`);
    } else {
      warn(`${label} (${key}) — not configured, demo mode features will activate`);
      demoMode = true;
    }
  }

  for (const { key, label } of optional) {
    const val = envVars[key];
    if (val && !val.startsWith('your-')) {
      ok(`${label} (${key})`);
    } else {
      warn(`${label} (${key}) — optional, not configured`);
    }
  }

  // Install dependencies
  heading('Installing Dependencies');
  try {
    execSync('pnpm install', { cwd: ROOT, stdio: 'inherit' });
    ok('Dependencies installed');
  } catch {
    fail('Failed to install dependencies');
    errors++;
  }

  // Summary
  heading('Bootstrap Summary');
  if (errors > 0) {
    fail(`${errors} error(s) found. Fix them before proceeding.`);
    process.exit(1);
  }
  if (demoMode) {
    warn('Some credentials missing — app will run in demo mode.');
    log('  Set DEMO_MODE=true in .env to suppress warnings.');
  }
  ok('Bootstrap complete!');
  log('');
  log('Next steps:');
  log('  1. Start Supabase:  supabase start');
  log('  2. Run migrations:  pnpm db:migrate');
  log('  3. Seed demo data:  pnpm seed');
  log('  4. Start dev:       pnpm dev');
  log('');
}

main().catch(err => {
  fail(err.message);
  process.exit(1);
});
