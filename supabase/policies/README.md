# Thinkora RLS Policy Model

## Overview

Thinkora uses Supabase Row-Level Security (RLS) to enforce data isolation at the database level. Every user-scoped table has RLS enabled, meaning no row can be read or written without passing its security policy -- even if the application layer has a bug.

## Core Principles

1. **User-scoped isolation** -- Each user can only access rows they own (`user_id = auth.uid()`).
2. **Cascading ownership** -- Child tables (messages, chunks, file_versions, etc.) inherit access through their parent's ownership. For example, a message is accessible only if the parent conversation belongs to the requesting user.
3. **Least privilege** -- Policies grant the minimum permissions needed. Audit logs are insert-only for regular users; only admins can read them.
4. **No public access** -- All tables require authentication. The `model_registry` is the only table readable by all authenticated users.

## Table-by-Table Policy Summary

### Direct ownership (`user_id = auth.uid()`)

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `users_profile` | Own | Own | Own | -- |
| `conversations` | Own | Own | Own | Own |
| `files` | Own | Own | Own | Own |
| `connector_accounts` | Own | Own | Own | Own |
| `memory_entries` | Own | Own | Own | Own |
| `saved_prompts` | Own | Own | Own | Own |
| `model_usage_logs` | Own | Own | -- | -- |

### Cascading ownership (checked via parent FK)

| Table | Parent Chain | SELECT | INSERT |
|---|---|---|---|
| `messages` | conversation.user_id | Yes | Yes |
| `message_citations` | message -> conversation.user_id | Yes | Yes |
| `file_versions` | file.user_id | Yes | Yes |
| `file_processing_jobs` | file.user_id | Yes | Yes |
| `parsed_artifacts` | file.user_id | Yes | Yes |
| `chunks` | file.user_id | Yes | Yes |
| `connector_sync_jobs` | connector_account.user_id | Yes | Yes |
| `tool_execution_logs` | message -> conversation.user_id | Yes | Yes |
| `retrieval_logs` | message -> conversation.user_id | Yes | Yes |

### Special policies

| Table | Policy |
|---|---|
| `workspaces` | Owner has full CRUD; members can SELECT via `workspace_members` join |
| `workspace_members` | Users can SELECT their own memberships; workspace owners can INSERT/DELETE |
| `model_registry` | SELECT for all authenticated users (read-only reference data) |
| `audit_logs` | INSERT for all authenticated users; SELECT only for users with `role = 'admin'` in JWT claims |

## Storage Policies

The `uploads` bucket enforces folder-based isolation:

- Path pattern: `uploads/{user_id}/{filename}`
- Users can only INSERT, SELECT, UPDATE, DELETE objects where the first folder segment matches their `auth.uid()`.

## Admin Access

Admin-level operations (reading audit logs, managing feature flags, syncing model registry) should be performed via the **service role key**, which bypasses RLS entirely. The service role key must never be exposed to the client.

## Adding New Tables

When adding a new user-scoped table:

1. Add `ENABLE ROW LEVEL SECURITY` in the migration.
2. Create policies following the patterns above.
3. If the table has a direct `user_id` column, use `user_id = auth.uid()`.
4. If access is derived from a parent, use an `EXISTS` subquery to check ownership.
5. Document the policy in this file.
