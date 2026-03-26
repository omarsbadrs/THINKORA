-- 0001_initial.sql
-- Thinkora: Initial schema migration
-- Creates all tables with proper types, constraints, and defaults.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- USER & WORKSPACE TABLES
-- ============================================================

CREATE TABLE users_profile (
    id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name    text,
    avatar_url   text,
    preferences  jsonb DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    owner_id   uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    settings   jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
    workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id      uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    role         text NOT NULL DEFAULT 'member',
    joined_at    timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================
-- CONVERSATION & MESSAGE TABLES
-- ============================================================

CREATE TABLE conversations (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title        text,
    user_id      uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
    model_used   text,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role            text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content         text NOT NULL,
    model_used      text,
    actual_model    text,
    tokens_input    int,
    tokens_output   int,
    latency_ms      int,
    metadata        jsonb DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE message_citations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    source_type     text NOT NULL,
    source_name     text,
    source_id       text,
    chunk_text      text,
    relevance_score float,
    page_number     int,
    section_title   text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- FILE & PROCESSING TABLES
-- ============================================================

CREATE TABLE files (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
    name         text NOT NULL,
    mime_type    text,
    size_bytes   bigint,
    storage_key  text,
    status       text NOT NULL DEFAULT 'uploaded',
    version      int NOT NULL DEFAULT 1,
    metadata     jsonb DEFAULT '{}'::jsonb,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE file_versions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id     uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    version     int NOT NULL,
    storage_key text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE file_processing_jobs (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id      uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    status       text NOT NULL DEFAULT 'pending',
    stage        text,
    progress     int NOT NULL DEFAULT 0,
    started_at   timestamptz,
    completed_at timestamptz,
    error        text,
    retry_count  int NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE parsed_artifacts (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id       uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    artifact_type text NOT NULL,
    content       text,
    metadata      jsonb DEFAULT '{}'::jsonb,
    page_number   int,
    section_title text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE chunks (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id     uuid NOT NULL REFERENCES files(id) ON DELETE CASCADE,
    content     text NOT NULL,
    embedding   vector(1536),
    metadata    jsonb DEFAULT '{}'::jsonb,
    position    int NOT NULL,
    token_count int,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- CONNECTOR TABLES
-- ============================================================

CREATE TABLE connector_accounts (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    connector_type        text NOT NULL,
    status                text NOT NULL DEFAULT 'disconnected',
    credentials_encrypted text,
    config                jsonb DEFAULT '{}'::jsonb,
    last_sync             timestamptz,
    documents_count       int NOT NULL DEFAULT 0,
    error_message         text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE connector_sync_jobs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    connector_id        uuid NOT NULL REFERENCES connector_accounts(id) ON DELETE CASCADE,
    status              text NOT NULL,
    documents_processed int NOT NULL DEFAULT 0,
    documents_total     int,
    started_at          timestamptz,
    completed_at        timestamptz,
    error               text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MEMORY & PROMPTS
-- ============================================================

CREATE TABLE memory_entries (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    entry_type text NOT NULL,
    content    text NOT NULL,
    metadata   jsonb DEFAULT '{}'::jsonb,
    expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE saved_prompts (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
    title      text NOT NULL,
    content    text NOT NULL,
    tags       text[] DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- OBSERVABILITY & LOGS
-- ============================================================

CREATE TABLE tool_execution_logs (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id  uuid REFERENCES messages(id) ON DELETE SET NULL,
    tool_name   text NOT NULL,
    status      text NOT NULL,
    input       jsonb,
    output      jsonb,
    duration_ms int,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE retrieval_logs (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id       uuid REFERENCES messages(id) ON DELETE SET NULL,
    query            text NOT NULL,
    chunks_retrieved int,
    avg_relevance    float,
    duration_ms      int,
    cache_hit        boolean DEFAULT false,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid,
    action        text NOT NULL,
    resource_type text,
    resource_id   text,
    metadata      jsonb DEFAULT '{}'::jsonb,
    ip_address    text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- FEATURE FLAGS
-- ============================================================

CREATE TABLE feature_flags (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key        text NOT NULL UNIQUE,
    enabled    boolean NOT NULL DEFAULT false,
    config     jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MODEL REGISTRY & ROUTING
-- ============================================================

CREATE TABLE model_registry (
    slug                  text PRIMARY KEY,
    canonical_slug        text,
    display_name          text,
    provider_family       text,
    description           text,
    context_length        int,
    input_cost_per_m      float,
    output_cost_per_m     float,
    input_modalities      text[] DEFAULT '{text}',
    output_modalities     text[] DEFAULT '{text}',
    supported_parameters  text[] DEFAULT '{}',
    structured_output     boolean DEFAULT false,
    tools_support         boolean DEFAULT false,
    reasoning_support     boolean DEFAULT false,
    is_moderated          boolean DEFAULT false,
    max_completion_tokens int,
    deprecated            boolean DEFAULT false,
    expires_at            timestamptz,
    tags                  text[] DEFAULT '{}',
    synced_at             timestamptz
);

CREATE TABLE model_sync_jobs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    status        text NOT NULL,
    models_synced int,
    started_at    timestamptz,
    completed_at  timestamptz,
    error         text
);

CREATE TABLE model_routing_policies (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                      text NOT NULL,
    routing_mode              text NOT NULL,
    primary_model             text,
    fallback_models           text[] DEFAULT '{}',
    provider_preferences      jsonb DEFAULT '{}'::jsonb,
    max_cost_per_request      float,
    require_zdr               boolean DEFAULT false,
    require_parameters_match  boolean DEFAULT false,
    task_types                text[] DEFAULT '{}',
    priority                  int NOT NULL DEFAULT 0,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- MODEL USAGE & ANALYTICS
-- ============================================================

CREATE TABLE model_usage_logs (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id     text,
    user_id        uuid,
    selected_model text,
    actual_model   text,
    routing_mode   text,
    tokens_input   int,
    tokens_output  int,
    cost_usd       float,
    latency_ms     int,
    status         text,
    task_type      text,
    fallback_used  boolean DEFAULT false,
    workspace_id   uuid,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_benchmarks (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_slug text NOT NULL,
    task_type  text NOT NULL,
    score      float NOT NULL,
    metadata   jsonb DEFAULT '{}'::jsonb,
    run_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_task_scores (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_slug  text NOT NULL,
    task_type   text NOT NULL,
    score       float NOT NULL,
    sample_size int,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_fallback_events (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id     text,
    original_model text NOT NULL,
    fallback_model text NOT NULL,
    reason         text,
    created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_cost_daily (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    date           date NOT NULL,
    model_slug     text NOT NULL,
    total_cost     float NOT NULL DEFAULT 0,
    total_requests int NOT NULL DEFAULT 0,
    total_tokens   int NOT NULL DEFAULT 0,
    UNIQUE (date, model_slug)
);

CREATE TABLE model_cost_monthly (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    month          date NOT NULL,
    model_slug     text NOT NULL,
    total_cost     float NOT NULL DEFAULT 0,
    total_requests int NOT NULL DEFAULT 0,
    total_tokens   int NOT NULL DEFAULT 0,
    UNIQUE (month, model_slug)
);

CREATE TABLE model_error_events (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_slug    text NOT NULL,
    error_type    text NOT NULL,
    error_message text,
    request_id    text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE model_cache_metrics (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    model_slug   text NOT NULL,
    cache_hits   int NOT NULL DEFAULT 0,
    cache_misses int NOT NULL DEFAULT 0,
    tokens_saved int NOT NULL DEFAULT 0,
    cost_saved   float NOT NULL DEFAULT 0,
    date         date NOT NULL,
    UNIQUE (date, model_slug)
);
