/**
 * Files repository — CRUD operations for the files table.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FileRow, FileInsert, FileUpdate } from "../schema";
import type { PaginatedResult } from "./conversations.repo";

export interface ListFilesParams {
  userId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  workspaceId?: string | null;
}

export class FilesRepo {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * List files for a user with optional filtering and pagination.
   */
  async list(params: ListFilesParams): Promise<PaginatedResult<FileRow>> {
    const { userId, page = 1, pageSize = 20, status, workspaceId } = params;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.client
      .from("files")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) {
      query = query.eq("status", status);
    }

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
      data: (data ?? []) as FileRow[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single file by ID.
   */
  async get(id: string): Promise<FileRow | null> {
    const { data, error } = await this.client
      .from("files")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    return data as FileRow;
  }

  /**
   * Create a new file record.
   */
  async create(input: FileInsert): Promise<FileRow> {
    const { data, error } = await this.client
      .from("files")
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as FileRow;
  }

  /**
   * Update a file's status (e.g., uploaded -> processing -> ready -> error).
   */
  async updateStatus(
    id: string,
    status: string,
    metadata?: Record<string, unknown>
  ): Promise<FileRow> {
    const updates: FileUpdate = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (metadata) {
      updates.metadata = metadata;
    }

    const { data, error } = await this.client
      .from("files")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as FileRow;
  }

  /**
   * Update arbitrary file fields.
   */
  async update(id: string, updates: FileUpdate): Promise<FileRow> {
    const { data, error } = await this.client
      .from("files")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as FileRow;
  }

  /**
   * Delete a file record (cascades to file_versions, chunks, etc.).
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.client.from("files").delete().eq("id", id);

    if (error) throw error;
  }
}
