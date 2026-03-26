// ---------------------------------------------------------------------------
// @thinkora/api — MessageService
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  MessageRow,
  MessageInsert,
  MessageCitationRow,
  MessageCitationInsert,
} from "@thinkora/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateMessageParams {
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  modelUsed?: string;
  actualModel?: string;
  tokensInput?: number;
  tokensOutput?: number;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export interface CitationInput {
  sourceType: string;
  sourceName: string;
  sourceId: string;
  chunkText: string;
  relevanceScore: number;
  pageNumber?: number | null;
  sectionTitle?: string | null;
}

export interface MessageWithCitations extends MessageRow {
  citations: MessageCitationRow[];
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class MessageService {
  constructor(private readonly db: SupabaseClient) {}

  /**
   * List messages for a conversation, ordered by creation time ascending.
   * Supports pagination via limit and offset.
   */
  async listByConversation(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<MessageRow[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    const { data, error } = await this.db
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data ?? []) as MessageRow[];
  }

  /**
   * Create a new message in a conversation.
   * Also bumps the parent conversation's updated_at timestamp.
   */
  async create(params: CreateMessageParams): Promise<MessageRow> {
    const insert: MessageInsert = {
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      model_used: params.modelUsed ?? null,
      actual_model: params.actualModel ?? null,
      tokens_input: params.tokensInput ?? null,
      tokens_output: params.tokensOutput ?? null,
      latency_ms: params.latencyMs ?? null,
      metadata: (params.metadata ?? {}) as MessageInsert["metadata"],
    };

    const { data, error } = await this.db
      .from("messages")
      .insert(insert)
      .select()
      .single();

    if (error) throw error;

    // Touch the parent conversation
    await this.db
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", params.conversationId);

    return data as MessageRow;
  }

  /**
   * Attach citations to a message.
   */
  async addCitations(
    messageId: string,
    citations: CitationInput[]
  ): Promise<MessageCitationRow[]> {
    if (citations.length === 0) return [];

    const inserts: MessageCitationInsert[] = citations.map((c) => ({
      message_id: messageId,
      source_type: c.sourceType,
      source_name: c.sourceName,
      source_id: c.sourceId,
      chunk_text: c.chunkText,
      relevance_score: c.relevanceScore,
      page_number: c.pageNumber ?? null,
      section_title: c.sectionTitle ?? null,
    }));

    const { data, error } = await this.db
      .from("message_citations")
      .insert(inserts)
      .select();

    if (error) throw error;
    return (data ?? []) as MessageCitationRow[];
  }

  /**
   * Get a message together with its citations.
   */
  async getWithCitations(messageId: string): Promise<MessageWithCitations | null> {
    const { data, error } = await this.db
      .from("messages")
      .select("*, message_citations(*)")
      .eq("id", messageId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const row = data as MessageRow & { message_citations?: MessageCitationRow[] };
    return {
      ...row,
      citations: row.message_citations ?? [],
    } as MessageWithCitations;
  }
}
