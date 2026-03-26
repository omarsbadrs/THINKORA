-- 0004_indexes.sql
-- Thinkora: Performance indexes for critical query paths.

-- ============================================================
-- CONVERSATIONS
-- ============================================================

CREATE INDEX idx_conversations_user_updated
    ON conversations (user_id, updated_at DESC);

-- ============================================================
-- MESSAGES
-- ============================================================

CREATE INDEX idx_messages_conversation_created
    ON messages (conversation_id, created_at);

-- ============================================================
-- CHUNKS — vector similarity search
-- ============================================================

CREATE INDEX idx_chunks_file
    ON chunks (file_id);

-- IVFFlat index for vector similarity search.
-- Requires at least some rows to build; on empty tables Supabase
-- will defer list creation until first REINDEX / VACUUM.
CREATE INDEX idx_chunks_embedding_ivfflat
    ON chunks USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- FILES
-- ============================================================

CREATE INDEX idx_files_user_status
    ON files (user_id, status);

-- ============================================================
-- MODEL_USAGE_LOGS
-- ============================================================

CREATE INDEX idx_model_usage_logs_user_created
    ON model_usage_logs (user_id, created_at DESC);

CREATE INDEX idx_model_usage_logs_model_created
    ON model_usage_logs (selected_model, created_at DESC);

-- ============================================================
-- MODEL_REGISTRY
-- ============================================================

CREATE INDEX idx_model_registry_provider_family
    ON model_registry (provider_family);

CREATE INDEX idx_model_registry_tags
    ON model_registry USING GIN (tags);

-- ============================================================
-- RETRIEVAL_LOGS
-- ============================================================

CREATE INDEX idx_retrieval_logs_message
    ON retrieval_logs (message_id);

-- ============================================================
-- AUDIT_LOGS
-- ============================================================

CREATE INDEX idx_audit_logs_user_created
    ON audit_logs (user_id, created_at DESC);
