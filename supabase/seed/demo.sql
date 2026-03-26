-- demo.sql
-- Thinkora: Seed data for development and demo environments.

-- ============================================================
-- MODEL REGISTRY — 7 representative models
-- ============================================================

INSERT INTO model_registry (
    slug, canonical_slug, display_name, provider_family, description,
    context_length, input_cost_per_m, output_cost_per_m,
    input_modalities, output_modalities, supported_parameters,
    structured_output, tools_support, reasoning_support, is_moderated,
    max_completion_tokens, deprecated, tags, synced_at
) VALUES
(
    'claude-opus-4', 'claude-opus-4', 'Claude Opus 4', 'anthropic',
    'Most capable Anthropic model for complex reasoning and analysis.',
    200000, 15.0, 75.0,
    ARRAY['text', 'image'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens', 'stop_sequences'],
    true, true, true, false,
    32000, false,
    ARRAY['flagship', 'reasoning', 'coding'],
    now()
),
(
    'claude-sonnet-4', 'claude-sonnet-4', 'Claude Sonnet 4', 'anthropic',
    'High-performance Anthropic model balancing capability and speed.',
    200000, 3.0, 15.0,
    ARRAY['text', 'image'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens', 'stop_sequences'],
    true, true, true, false,
    16000, false,
    ARRAY['balanced', 'coding', 'general'],
    now()
),
(
    'claude-haiku-3.5', 'claude-haiku-3.5', 'Claude 3.5 Haiku', 'anthropic',
    'Fastest Anthropic model for high-throughput tasks.',
    200000, 0.80, 4.0,
    ARRAY['text', 'image'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens', 'stop_sequences'],
    true, true, false, false,
    8192, false,
    ARRAY['fast', 'cost-effective', 'general'],
    now()
),
(
    'gpt-4o', 'gpt-4o', 'GPT-4o', 'openai',
    'OpenAI multimodal flagship model.',
    128000, 2.50, 10.0,
    ARRAY['text', 'image', 'audio'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens', 'frequency_penalty', 'presence_penalty'],
    true, true, false, true,
    16384, false,
    ARRAY['multimodal', 'general', 'flagship'],
    now()
),
(
    'gpt-4o-mini', 'gpt-4o-mini', 'GPT-4o Mini', 'openai',
    'Cost-effective OpenAI model for lighter tasks.',
    128000, 0.15, 0.60,
    ARRAY['text', 'image'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens', 'frequency_penalty', 'presence_penalty'],
    true, true, false, true,
    16384, false,
    ARRAY['cost-effective', 'fast', 'general'],
    now()
),
(
    'gemini-2.5-pro', 'gemini-2.5-pro', 'Gemini 2.5 Pro', 'google',
    'Google DeepMind model with large context and reasoning.',
    1000000, 1.25, 10.0,
    ARRAY['text', 'image', 'video', 'audio'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens'],
    true, true, true, false,
    65536, false,
    ARRAY['long-context', 'multimodal', 'reasoning'],
    now()
),
(
    'deepseek-r1', 'deepseek-r1', 'DeepSeek R1', 'deepseek',
    'Open-weight reasoning model from DeepSeek.',
    64000, 0.55, 2.19,
    ARRAY['text'], ARRAY['text'],
    ARRAY['temperature', 'top_p', 'max_tokens'],
    false, false, true, false,
    32768, false,
    ARRAY['reasoning', 'open-weight', 'coding'],
    now()
);

-- ============================================================
-- FEATURE FLAGS
-- ============================================================

INSERT INTO feature_flags (key, enabled, config) VALUES
('demo_mode',              true,  '{"description": "Enable demo mode with sample data and limited features"}'::jsonb),
('file_upload',            true,  '{"max_size_mb": 50, "allowed_types": ["pdf","docx","txt","md","csv"]}'::jsonb),
('vector_search',          true,  '{"default_limit": 10, "min_relevance": 0.7}'::jsonb),
('connector_google_drive', false, '{"description": "Google Drive connector integration"}'::jsonb),
('connector_notion',       false, '{"description": "Notion connector integration"}'::jsonb),
('model_routing',          true,  '{"default_mode": "cost_optimized"}'::jsonb),
('memory_system',          true,  '{"max_entries_per_user": 1000}'::jsonb);
