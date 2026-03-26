/**
 * Messages repository — CRUD operations for messages and citations.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MessageRow,
  MessageInsert,
  MessageUpdate,
  MessageCitationRow,
  MessageCitationInsert,
} from "../schema";

/** A message with its citations attached. */
export interface MessageWithCitations extends MessageRow {
  citations: MessageCitationRow[];
}

export class MessagesRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * List messages for a conversation, ordered by created_at ascending.
   * Optionally includes citations for each message.
   */
  async list(
    conversationId: string,
    options?: { includeCitations?: boolean }
  ): Promise<MessageWithCitations[]> {
    const selectClause = options?.includeCitations
      ? "*, message_citations(*)"
      : "*";

    const { data, error } = await this.client
      .from("messages")
      .select(selectClause)
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as Array<MessageRow & { message_citations?: MessageCitationRow[] }>).map(
      (row) => ({
        ...row,
        citations: row.message_citations ?? [],
        message_citations: undefined,
      })
    ) as MessageWithCitations[];
  }

  /**
   * Get a single message by ID, optionally with citations.
   */
  async get(
    id: string,
    options?: { includeCitations?: boolean }
  ): Promise<MessageWithCitations | null> {
    const selectClause = options?.includeCitations
      ? "*, message_citations(*)"
      : "*";

    const { data, error } = await this.client
      .from("messages")
      .select(selectClause)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const row = data as MessageRow & { message_citations?: MessageCitationRow[] };
    return {
      ...row,
      citations: row.message_citations ?? [],
      message_citations: undefined,
    } as MessageWithCitations;
  }

  /**
   * Create a new message.
   */
  async create(input: MessageInsert): Promise<MessageRow> {
    const { data, error } = await this.client
      .from("messages")
      .insert(input)
      .select()
      .single();

    if (error) throw error;

    // Also update the parent conversation's updated_at
    await this.client
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.conversation_id);

    return data as MessageRow;
  }

  /**
   * Update message content or metadata.
   */
  async update(id: string, updates: MessageUpdate): Promise<MessageRow> {
    const { data, error } = await this.client
      .from("messages")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as MessageRow;
  }

  /**
   * Add citations to a message.
   */
  async addCitations(
    citations: MessageCitationInsert[]
  ): Promise<MessageCitationRow[]> {
    if (citations.length === 0) return [];

    const { data, error } = await this.client
      .from("message_citations")
      .insert(citations)
      .select();

    if (error) throw error;
    return (data ?? []) as MessageCitationRow[];
  }

  /**
   * Get all citations for a given message.
   */
  async getCitations(messageId: string): Promise<MessageCitationRow[]> {
    const { data, error } = await this.client
      .from("message_citations")
      .select("*")
      .eq("message_id", messageId)
      .order("relevance_score", { ascending: false });

    if (error) throw error;
    return (data ?? []) as MessageCitationRow[];
  }
}
