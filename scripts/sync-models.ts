#!/usr/bin/env tsx
/**
 * Fetch model catalog from OpenRouter and update local model registry cache.
 * Can be run manually or scheduled via cron.
 */

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    image?: string;
    request?: string;
  };
  architecture?: {
    modality: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
  per_request_limits?: Record<string, string>;
  supported_parameters?: string[];
}

interface NormalizedModel {
  slug: string;
  displayName: string;
  description: string;
  providerFamily: string;
  contextLength: number;
  inputCostPerM: number;
  outputCostPerM: number;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  isModerated: boolean;
  maxCompletionTokens: number | null;
  tags: string[];
}

function deriveProviderFamily(slug: string): string {
  const prefix = slug.split('/')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
}

function deriveTags(model: OpenRouterModel): string[] {
  const tags: string[] = [];
  const pricing = model.pricing;
  const promptCost = parseFloat(pricing.prompt) * 1_000_000;
  const completionCost = parseFloat(pricing.completion) * 1_000_000;

  if (promptCost === 0 && completionCost === 0) tags.push('free');
  else if (promptCost < 1) tags.push('cheap');
  else if (promptCost > 10) tags.push('premium');

  if (model.context_length >= 100_000) tags.push('long-context');

  const name = model.name.toLowerCase();
  const slug = model.id.toLowerCase();

  if (name.includes('vision') || model.architecture?.input_modalities?.includes('image')) tags.push('vision');
  if (slug.includes('reasoning') || name.includes('thinking') || slug.includes('r1') || slug.includes('o1') || slug.includes('o3')) tags.push('reasoning');
  if (name.includes('code') || slug.includes('code') || slug.includes('starcoder') || slug.includes('deepseek-coder')) tags.push('coding');
  if (model.supported_parameters?.includes('tools')) tags.push('tool-capable');
  if (model.supported_parameters?.includes('response_format')) tags.push('structured-output');

  // Derive best-for tags
  if (tags.includes('cheap') && model.context_length >= 32000) tags.push('best-for-chat');
  if (model.context_length >= 100_000 && promptCost <= 5) tags.push('best-for-rag');
  if (tags.includes('coding')) tags.push('best-for-file-analysis');

  return tags;
}

function normalizeModel(raw: OpenRouterModel): NormalizedModel {
  return {
    slug: raw.id,
    displayName: raw.name,
    description: raw.description || '',
    providerFamily: deriveProviderFamily(raw.id),
    contextLength: raw.context_length,
    inputCostPerM: parseFloat(raw.pricing.prompt) * 1_000_000,
    outputCostPerM: parseFloat(raw.pricing.completion) * 1_000_000,
    inputModalities: raw.architecture?.input_modalities || ['text'],
    outputModalities: raw.architecture?.output_modalities || ['text'],
    supportedParameters: raw.supported_parameters || [],
    isModerated: raw.top_provider?.is_moderated || false,
    maxCompletionTokens: raw.top_provider?.max_completion_tokens || null,
    tags: deriveTags(raw),
  };
}

async function main() {
  console.log('\n🔄 Syncing OpenRouter Model Catalog\n');

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.startsWith('your-')) {
    console.log('⚠ OPENROUTER_API_KEY not configured. Using demo model catalog.\n');
    return;
  }

  const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'Thinkora',
      },
    });

    if (!res.ok) {
      throw new Error(`OpenRouter returned HTTP ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as { data: OpenRouterModel[] };
    const models = data.data.map(normalizeModel);

    console.log(`✓ Fetched ${models.length} models from OpenRouter`);

    // Group by provider
    const byProvider = new Map<string, number>();
    for (const m of models) {
      byProvider.set(m.providerFamily, (byProvider.get(m.providerFamily) || 0) + 1);
    }
    for (const [provider, count] of [...byProvider.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      console.log(`  ${provider}: ${count} models`);
    }

    // Tag distribution
    const tagCounts = new Map<string, number>();
    for (const m of models) {
      for (const tag of m.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }
    console.log('\nTag distribution:');
    for (const [tag, count] of [...tagCounts.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${tag}: ${count}`);
    }

    // Write cache file for use without DB
    const { writeFileSync, mkdirSync } = await import('fs');
    const { resolve } = await import('path');
    const cacheDir = resolve(__dirname, '..', 'apps/api/src/demo');
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(resolve(cacheDir, 'model-catalog-cache.json'), JSON.stringify(models, null, 2));
    console.log(`\n✓ Cached ${models.length} models to apps/api/src/demo/model-catalog-cache.json`);

    // If database is available, sync to model_registry table
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !dbUrl.startsWith('your-')) {
      try {
        const pg = await import('pg');
        const client = new pg.default.Client({ connectionString: dbUrl });
        await client.connect();

        for (const model of models) {
          await client.query(
            `INSERT INTO model_registry (slug, display_name, description, provider_family, context_length,
              input_cost_per_m, output_cost_per_m, input_modalities, output_modalities,
              supported_parameters, is_moderated, max_completion_tokens, tags, synced_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
             ON CONFLICT (slug) DO UPDATE SET
              display_name=$2, description=$3, provider_family=$4, context_length=$5,
              input_cost_per_m=$6, output_cost_per_m=$7, input_modalities=$8, output_modalities=$9,
              supported_parameters=$10, is_moderated=$11, max_completion_tokens=$12, tags=$13, synced_at=NOW()`,
            [
              model.slug, model.displayName, model.description, model.providerFamily,
              model.contextLength, model.inputCostPerM, model.outputCostPerM,
              model.inputModalities, model.outputModalities, model.supportedParameters,
              model.isModerated, model.maxCompletionTokens, model.tags,
            ]
          );
        }

        await client.end();
        console.log(`✓ Synced ${models.length} models to database`);
      } catch (err: any) {
        console.log(`⚠ Database sync failed: ${err.message} — JSON cache is still available`);
      }
    }

    console.log('\n✅ Model sync complete.\n');
  } catch (err: any) {
    console.error(`✗ Sync failed: ${err.message}\n`);
    process.exit(1);
  }
}

main();
