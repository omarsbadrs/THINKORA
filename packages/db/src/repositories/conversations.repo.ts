/**
 * Conversations repository — CRUD operations for the conversations table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationRow,
  ConversationInsert,
  ConversationUpdate,
} from "../schema";

export interface ListConversationsParams {
  userId: string;
  page?: number;
  pageSize?: number;
  workspaceId?: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ConversationsRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * List conversations for a user with pagination.
   * Ordered by updated_at descending (most recent first).
   */
  async list(
    params: ListConversationsParams
  ): Promise<PaginatedResult<ConversationRow>> {
    const { userId, page = 1, pageSize = 20, workspaceId } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("conversations")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(from, to);

    if (workspaceId !== undefined) {
      if (workspaceId === null) {
        query = query.is("workspace_id", null);
      } else {
        query = query.eq("workspace_id", workspaceId);
      }
    }

    const { data, error, count } = await query;

    if (error) throw error;

    const total = count ?? 0;
    return {
      data: (data ?? []) as ConversationRow[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single conversation by ID.
   */
  async get(id: string): Promise<ConversationRow | null> {
    const { data, error } = await this.client
      .from("conversations")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw error;
    }

    return data as ConversationRow;
  }

  /**
   * Create a new conversation.
   */
  async create(input: ConversationInsert): Promise<ConversationRow> {
    const { data, error } = await this.client
      .from("conversations")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationRow;
  }

  /**
   * Update an existing conversation (e.g., rename title, change model).
   * Automatically sets updated_at to now.
   */
  async update(
    id: string,
    updates: ConversationUpdate
  ): Promise<ConversationRow> {
    const { data, error } = await this.client
      .from("conversations")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ConversationRow;
  }

  /**
   * Delete a conversation and all associated messages (cascade).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
