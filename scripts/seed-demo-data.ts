#!/usr/bin/env tsx
/**
 * Seed demo data for development and demo mode.
 * Inserts sample conversations, files, model registry entries, and dashboard metrics.
 */

import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

interface DemoConversation {
  id: string;
  title: string;
  preview: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
}

const demoConversations: DemoConversation[] = [
  {
    id: 'demo-conv-1',
    title: 'Project Setup Guide',
    preview: 'Let me help you configure...',
    messages: [
      { role: 'user', content: 'How do I set up a new project with TypeScript and React?' },
      {
        role: 'assistant',
        content: 'Great question! Here\'s a step-by-step guide to set up a TypeScript + React project:\n\n1. **Initialize the project** with `npx create-next-app@latest --typescript`\n2. **Configure TypeScript** in `tsconfig.json` with strict mode\n3. **Set up your component structure** under `src/components/`\n4. **Add state management** — I recommend Zustand for simplicity\n\nWould you like me to go deeper into any of these steps?',
      },
    ],
  },
  {
    id: 'demo-conv-2',
    title: 'API Integration',
    preview: 'Here\'s how to connect the REST...',
    messages: [
      { role: 'user', content: 'How do I integrate a REST API with React Query?' },
      {
        role: 'assistant',
        content: 'React Query (TanStack Query) makes API integration clean and efficient. Here\'s the approach:\n\n```typescript\nimport { useQuery } from \'@tanstack/react-query\';\n\nfunction useUsers() {\n  return useQuery({\n    queryKey: [\'users\'],\n    queryFn: () => fetch(\'/api/users\').then(r => r.json()),\n    staleTime: 5 * 60 * 1000,\n  });\n}\n```\n\nKey benefits: automatic caching, background refetching, and error handling built in.',
      },
    ],
  },
  {
    id: 'demo-conv-3',
    title: 'Debugging Session',
    preview: 'The error originates from...',
    messages: [
      { role: 'user', content: 'I\'m getting a hydration mismatch error in Next.js. How do I fix it?' },
      {
        role: 'assistant',
        content: 'Hydration mismatches happen when server-rendered HTML differs from client-side React output. Common causes:\n\n1. **Browser-only APIs** — Wrap in `useEffect` or use `dynamic()` with `ssr: false`\n2. **Date/time formatting** — Server/client may render differently\n3. **Random values** — Use `useId()` for stable IDs\n4. **CSS-in-JS** — Ensure server extraction is configured\n\nCheck your browser console for the specific element causing the mismatch.',
      },
    ],
  },
];

const demoModels = [
  { slug: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', context: 200000, inputCost: 3, outputCost: 15 },
  { slug: 'anthropic/claude-haiku-4', name: 'Claude Haiku 4', provider: 'Anthropic', context: 200000, inputCost: 0.25, outputCost: 1.25 },
  { slug: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', context: 128000, inputCost: 2.5, outputCost: 10 },
  { slug: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', context: 128000, inputCost: 0.15, outputCost: 0.6 },
  { slug: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', context: 1000000, inputCost: 1.25, outputCost: 10 },
  { slug: 'meta-llama/llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', context: 1000000, inputCost: 0.2, outputCost: 0.6 },
  { slug: 'deepseek/deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', context: 164000, inputCost: 0.55, outputCost: 2.19 },
];

async function main() {
  console.log('\n🌱 Seeding Thinkora Demo Data\n');

  // Check if we can connect to database
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.startsWith('your-')) {
    console.log('ℹ️  No DATABASE_URL configured — writing demo data as JSON fallback.\n');

    const { writeFileSync, mkdirSync } = await import('fs');
    const dataDir = resolve(ROOT, 'apps/api/src/demo');
    mkdirSync(dataDir, { recursive: true });

    writeFileSync(
      resolve(dataDir, 'demo-data.json'),
      JSON.stringify({ conversations: demoConversations, models: demoModels }, null, 2)
    );
    console.log('✓ Demo data written to apps/api/src/demo/demo-data.json');
    console.log('✅ Demo seed complete.\n');
    return;
  }

  // If database is available, insert via SQL
  console.log('📡 Connecting to database...');
  try {
    // Dynamic import to avoid hard dependency
    const pg = await import('pg');
    const client = new pg.default.Client({ connectionString: dbUrl });
    await client.connect();

    // Insert demo conversations
    for (const conv of demoConversations) {
      await client.query(
        `INSERT INTO conversations (id, title, user_id, created_at, updated_at)
         VALUES ($1, $2, 'demo-user', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [conv.id, conv.title]
      );

      for (let i = 0; i < conv.messages.length; i++) {
        const msg = conv.messages[i];
        await client.query(
          `INSERT INTO messages (id, conversation_id, role, content, created_at)
           VALUES ($1, $2, $3, $4, NOW())
           ON CONFLICT (id) DO NOTHING`,
          [`${conv.id}-msg-${i}`, conv.id, msg.role, msg.content]
        );
      }
    }
    console.log(`✓ Seeded ${demoConversations.length} demo conversations`);

    // Insert demo models
    for (const model of demoModels) {
      await client.query(
        `INSERT INTO model_registry (slug, display_name, provider_family, context_length, input_cost_per_m, output_cost_per_m, synced_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (slug) DO UPDATE SET display_name = $2, synced_at = NOW()`,
        [model.slug, model.name, model.provider, model.context, model.inputCost, model.outputCost]
      );
    }
    console.log(`✓ Seeded ${demoModels.length} model registry entries`);

    await client.end();
    console.log('✅ Demo seed complete.\n');
  } catch (err: any) {
    console.log(`⚠ Could not connect to database: ${err.message}`);
    console.log('  Run demo seed without database — data will load from JSON fallback.\n');
  }
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
