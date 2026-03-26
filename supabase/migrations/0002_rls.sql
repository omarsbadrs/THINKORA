-- 0002_rls.sql
-- Thinkora: Row-Level Security policies
-- Principle: users can only access their own data unless otherwise specified.

-- ============================================================
-- ENABLE RLS ON ALL USER-SCOPED TABLES
-- ============================================================

ALTER TABLE users_profile         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces            ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_citations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE files                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_processing_jobs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parsed_artifacts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE connector_sync_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_prompts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_execution_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE retrieval_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_registry        ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_usage_logs      ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- USERS_PROFILE
-- ============================================================

CREATE POLICY "users_profile_select_own"
    ON users_profile FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "users_profile_insert_own"
    ON users_profile FOR INSERT
    WITH CHECK (id = auth.uid());

CREATE POLICY "users_profile_update_own"
    ON users_profile FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================
-- WORKSPACES — owner can do everything
-- ============================================================

CREATE POLICY "workspaces_select_own"
    ON workspaces FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "workspaces_insert_own"
    ON workspaces FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update_own"
    ON workspaces FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete_own"
    ON workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- Members can also select workspaces they belong to
CREATE POLICY "workspaces_select_member"
    ON workspaces FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members
            WHERE workspace_members.workspace_id = workspaces.id
              AND workspace_members.user_id = auth.uid()
        )
    );

-- ============================================================
-- WORKSPACE_MEMBERS
-- ============================================================

CREATE POLICY "workspace_members_select"
    ON workspace_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "workspace_members_insert_owner"
    ON workspace_members FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_members.workspace_id
              AND workspaces.owner_id = auth.uid()
        )
    );

CREATE POLICY "workspace_members_delete_owner"
    ON workspace_members FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces
            WHERE workspaces.id = workspace_members.workspace_id
              AND workspaces.owner_id = auth.uid()
        )
    );

-- ============================================================
-- CONVERSATIONS — scoped to user_id
-- ============================================================

CREATE POLICY "conversations_select_own"
    ON conversations FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "conversations_insert_own"
    ON conversations FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_update_own"
    ON conversations FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversations_delete_own"
    ON conversations FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================
-- MESSAGES — scoped via conversation ownership
-- ============================================================

CREATE POLICY "messages_select_own"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "messages_insert_own"
    ON messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "messages_update_own"
    ON messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversations
            WHERE conversations.id = messages.conversation_id
              AND conversations.user_id = auth.uid()
        )
    );

-- ============================================================
-- MESSAGE_CITATIONS — scoped via message -> conversation
-- ============================================================

CREATE POLICY "message_citations_select_own"
    ON message_citations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages
            JOIN conversations ON conversations.id = messages.conversation_id
            WHERE messages.id = message_citations.message_id
              AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "message_citations_insert_own"
    ON message_citations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages
            JOIN conversations ON conversations.id = messages.conversation_id
            WHERE messages.id = message_citations.message_id
              AND conversations.user_id = auth.uid()
        )
    );

-- ============================================================
-- FILES — scoped to user_id
-- ============================================================

CREATE POLICY "files_select_own"
    ON files FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "files_insert_own"
    ON files FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "files_update_own"
    ON files FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "files_delete_own"
    ON files FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================
-- FILE_VERSIONS — scoped via file ownership
-- ============================================================

CREATE POLICY "file_versions_select_own"
    ON file_versions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = file_versions.file_id
              AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "file_versions_insert_own"
    ON file_versions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = file_versions.file_id
              AND files.user_id = auth.uid()
        )
    );

-- ============================================================
-- FILE_PROCESSING_JOBS — scoped via file ownership
-- ============================================================

CREATE POLICY "file_processing_jobs_select_own"
    ON file_processing_jobs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = file_processing_jobs.file_id
              AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "file_processing_jobs_insert_own"
    ON file_processing_jobs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = file_processing_jobs.file_id
              AND files.user_id = auth.uid()
        )
    );

-- ============================================================
-- PARSED_ARTIFACTS — scoped via file ownership
-- ============================================================

CREATE POLICY "parsed_artifacts_select_own"
    ON parsed_artifacts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = parsed_artifacts.file_id
              AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "parsed_artifacts_insert_own"
    ON parsed_artifacts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = parsed_artifacts.file_id
              AND files.user_id = auth.uid()
        )
    );

-- ============================================================
-- CHUNKS — scoped via file ownership
-- ============================================================

CREATE POLICY "chunks_select_own"
    ON chunks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = chunks.file_id
              AND files.user_id = auth.uid()
        )
    );

CREATE POLICY "chunks_insert_own"
    ON chunks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM files
            WHERE files.id = chunks.file_id
              AND files.user_id = auth.uid()
        )
    );

-- ============================================================
-- CONNECTOR_ACCOUNTS — scoped to user_id
-- ============================================================

CREATE POLICY "connector_accounts_select_own"
    ON connector_accounts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "connector_accounts_insert_own"
    ON connector_accounts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "connector_accounts_update_own"
    ON connector_accounts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "connector_accounts_delete_own"
    ON connector_accounts FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================
-- CONNECTOR_SYNC_JOBS — scoped via connector ownership
-- ============================================================

CREATE POLICY "connector_sync_jobs_select_own"
    ON connector_sync_jobs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM connector_accounts
            WHERE connector_accounts.id = connector_sync_jobs.connector_id
              AND connector_accounts.user_id = auth.uid()
        )
    );

CREATE POLICY "connector_sync_jobs_insert_own"
    ON connector_sync_jobs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM connector_accounts
            WHERE connector_accounts.id = connector_sync_jobs.connector_id
              AND connector_accounts.user_id = auth.uid()
        )
    );

-- ============================================================
-- MEMORY_ENTRIES — scoped to user_id
-- ============================================================

CREATE POLICY "memory_entries_select_own"
    ON memory_entries FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "memory_entries_insert_own"
    ON memory_entries FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "memory_entries_update_own"
    ON memory_entries FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "memory_entries_delete_own"
    ON memory_entries FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================
-- SAVED_PROMPTS — scoped to user_id
-- ============================================================

CREATE POLICY "saved_prompts_select_own"
    ON saved_prompts FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "saved_prompts_insert_own"
    ON saved_prompts FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_prompts_update_own"
    ON saved_prompts FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "saved_prompts_delete_own"
    ON saved_prompts FOR DELETE
    USING (user_id = auth.uid());

-- ============================================================
-- TOOL_EXECUTION_LOGS — scoped via message -> conversation
-- ============================================================

CREATE POLICY "tool_execution_logs_select_own"
    ON tool_execution_logs FOR SELECT
    USING (
        message_id IS NULL
        OR EXISTS (
            SELECT 1 FROM messages
            JOIN conversations ON conversations.id = messages.conversation_id
            WHERE messages.id = tool_execution_logs.message_id
              AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "tool_execution_logs_insert_own"
    ON tool_execution_logs FOR INSERT
    WITH CHECK (
        message_id IS NULL
        OR EXISTS (
            SELECT 1 FROM messages
            JOIN conversations ON conversations.id = messages.conversation_id
            WHERE messages.id = tool_execution_logs.message_id
              AND conversations.user_id = auth.uid()
        )
    );

-- ============================================================
-- RETRIEVAL_LOGS — scoped via message -> conversation
-- ============================================================

CREATE POLICY "retrieval_logs_select_own"
    ON retrieval_logs FOR SELECT
    USING (
        message_id IS NULL
        OR EXISTS (
            SELECT 1 FROM messages
            JOIN conversations ON conversations.id = messages.conversation_id
            WHERE messages.id = retrieval_logs.message_id
              AND conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "retrieval_logs_insert_own"
    ON retrieval_logs FOR INSERT
    WITH CHECK (
        message_id IS NULL
        OR EXISTS (
            SELECT 1 FROM messages
            JOIN conversations ON conversations.id = messages.conversation_id
            WHERE messages.id = retrieval_logs.message_id
              AND conversations.user_id = auth.uid()
        )
    );

-- ============================================================
-- AUDIT_LOGS — insert only for authenticated, read for admins
-- ============================================================

CREATE POLICY "audit_logs_insert_authenticated"
    ON audit_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Admin read policy: uses a custom claim 'role' = 'admin' in JWT
CREATE POLICY "audit_logs_select_admin"
    ON audit_logs FOR SELECT
    USING (
        (auth.jwt() ->> 'role') = 'admin'
    );

-- ============================================================
-- MODEL_REGISTRY — readable by all authenticated users
-- ============================================================

CREATE POLICY "model_registry_select_authenticated"
    ON model_registry FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================================
-- MODEL_USAGE_LOGS — scoped to user_id
-- ============================================================

CREATE POLICY "model_usage_logs_select_own"
    ON model_usage_logs FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "model_usage_logs_insert_own"
    ON model_usage_logs FOR INSERT
    WITH CHECK (user_id = auth.uid());
