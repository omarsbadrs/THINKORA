// ---------------------------------------------------------------------------
// @thinkora/api — ConversationService
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ConversationRow,
  ConversationInsert,
  MessageRow,
} from "@thinkora/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ListConversationsOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface ConversationListResult {
  conversations: ConversationRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface ConversationWithMessageCount extends ConversationRow {
  messageCount: number;
}

export interface ConversationWithMessages extends ConversationRow {
  messages: MessageRow[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ConversationService {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * List conversations for a user with pagination and optional search.
   * Returns most recently updated conversations first.
   */
  async list(
    userId: string,
    options?: ListConversationsOptions
  ): Promise<ConversationListResult> {
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    let query = this.db
      .from("conversations")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply title search filter when provided
    if (options?.search && options.search.trim().length > 0) {
      query = query.ilike("title", `%${options.search.trim()}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      conversations: (data ?? []) as ConversationRow[],
      total: count ?? 0,
      limit,
      offset,
    };
  }

  /**
   * Get a single conversation by ID, scoped to the requesting user.
   * Includes a count of messages.
   */
  async get(
    userId: string,
    conversationId: string
  ): Promise<ConversationWithMessageCount | null> {
    const { data, error } = await this.db
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // not found
      throw error;
    }

    // Count messages separately
    const { count, error: countError } = await this.db
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId);

    if (countError) throw countError;

    return {
      ...(data as ConversationRow),
      messageCount: count ?? 0,
    };
  }

  /**
   * Create a new conversation for a user.
   */
  async create(
    userId: string,
    data: { title?: string }
  ): Promise<ConversationRow> {
    const insert: ConversationInsert = {
      user_id: userId,
      title: data.title ?? null,
    };

    const { data: row, error } = await this.db
      .from("conversations")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;
    return row as ConversationRow;
  }

  /**
   * Update a conversation title. Only the owning user may update.
   */
  async update(
    userId: string,
    conversationId: string,
    data: { title?: string }
  ): Promise<ConversationRow> {
    const { data: row, error } = await this.db
      .from("conversations")
      .update({
        title: data.title ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) throw error;
    return row as ConversationRow;
  }

  /**
   * Soft-delete a conversation by clearing its title and marking it.
   *
   * Uses a real delete on the row since the DB schema cascades messages.
   * If soft-delete semantics are needed later, add a `deleted_at` column.
   */
  async delete(userId: string, conversationId: string): Promise<void> {
    const { error } = await this.db
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  /**
   * Get a conversation along with all its messages, ordered chronologically.
   * Scoped to the requesting user.
   */
  async getWithMessages(
    userId: string,
    conversationId: string
  ): Promise<ConversationWithMessages | null> {
    // Fetch conversation
    const { data: conv, error: convError } = await this.db
      .from("conversations")
      .select("*")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .single();

    if (convError) {
      if (convError.code === "PGRST116") return null;
      throw convError;
    }

    // Fetch messages
    const { data: messages, error: msgError } = await this.db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    return {
      ...(conv as ConversationRow),
      messages: (messages ?? []) as MessageRow[],
    };
  }
}
