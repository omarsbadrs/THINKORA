/**
 * Memory repository — CRUD and search for user memory entries.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemoryEntryRow, MemoryEntryInsert } from "../schema";

export interface ListMemoryParams {
  userId: string;
  entryType?: string;
  limit?: number;
  /** If true, exclude entries that have expired */
  excludeExpired?: boolean;
}

export class MemoryRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * List memory entries for a user with optional filtering.
   */
  async list(params: ListMemoryParams): Promise<MemoryEntryRow[]> {
    const {
      userId,
      entryType,
      limit = 100,
      excludeExpired = true,
    } = params;

    let query = this.client
      .from("memory_entries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entryType) {
      query = query.eq("entry_type", entryType);
    }

    if (excludeExpired) {
      // Include entries with no expiry OR expiry in the future
      query = query.or(
        `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
      );
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data ?? []) as MemoryEntryRow[];
  }

  /**
   * Create a new memory entry.
   */
  async create(input: MemoryEntryInsert): Promise<MemoryEntryRow> {
    const { data, error } = await this.client
      .from("memory_entries")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as MemoryEntryRow;
  }

  /**
   * Delete a memory entry by ID.
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from("memory_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }

  /**
   * Delete all expired memory entries for a user.
   */
  async deleteExpired(userId: string): Promise<number> {
    const { data, error } = await this.client
      .from("memory_entries")
      .delete()
      .eq("user_id", userId)
      .lt("expires_at", new Date().toISOString())
      .not("expires_at", "is", null)
      .select("id");

    if (error) throw error;
    return data?.length ?? 0;
  }

  /**
   * Search memory entries by text content (case-insensitive ILIKE).
   */
  async search(
    userId: string,
    query: string,
    options?: { entryType?: string; limit?: number }
  ): Promise<MemoryEntryRow[]> {
    const { entryType, limit = 20 } = options ?? {};

    let dbQuery = this.client
      .from("memory_entries")
      .select("*")
      .eq("user_id", userId)
      .ilike("content", `%${query}%`)
      .or(
        `expires_at.is.null,expires_at.gt.${new Date().toISOString()}`
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (entryType) {
      dbQuery = dbQuery.eq("entry_type", entryType);
    }

    const { data, error } = await dbQuery;

    if (error) throw error;
    return (data ?? []) as MemoryEntryRow[];
  }
}
