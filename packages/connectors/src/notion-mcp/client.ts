// ---------------------------------------------------------------------------
// Notion MCP Client
// ---------------------------------------------------------------------------

import { Client as NotionSDKClient } from "@notionhq/client";
import type {
  NotionConfig,
  NotionCredentials,
  NotionPage,
  NotionDatabase,
  NotionBlock,
  NotionSearchOptions,
  NotionSearchResult,
} from "./types";

/** Normalized error thrown by the Notion MCP client. */
export class NotionMCPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number | null = null,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = "NotionMCPError";
  }
}

/**
 * Client for interacting with the Notion API via OAuth.
 *
 * Wraps the official `@notionhq/client` SDK and adds:
 * - OAuth authorization / code exchange
 * - Automatic rate-limit handling (429 retry)
 * - Pagination helpers
 * - Error normalization
 */
export class NotionMCPClient {
  private readonly config: NotionConfig;
  private client: NotionSDKClient | null = null;
  private credentials: NotionCredentials | null = null;

  private static readonly OAUTH_BASE = "https://api.notion.com/v1/oauth";
  private static readonly MAX_RATE_LIMIT_RETRIES = 3;
  private static readonly DEFAULT_PAGE_SIZE = 100;

  constructor(config: NotionConfig) {
    this.config = config;
  }

  // -----------------------------------------------------------------------
  // OAuth
  // -----------------------------------------------------------------------

  /** Returns the Notion OAuth authorization URL the user should visit. */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      response_type: "code",
      owner: "user",
    });
    if (state) {
      params.set("state", state);
    }
    return `https://api.notion.com/v1/oauth/authorize?${params.toString()}`;
  }

  /**
   * Exchanges an authorization code for an access token and initializes
   * the internal SDK client.
   */
  async exchangeCode(code: string): Promise<NotionCredentials> {
    const basicAuth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString("base64");

    const response = await fetch(
      `${NotionMCPClient.OAUTH_BASE}/token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${basicAuth}`,
          "Notion-Version": "2022-06-28",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: this.config.redirectUri,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      throw new NotionMCPError(
        `OAuth token exchange failed: ${body}`,
        "OAUTH_EXCHANGE_FAILED",
        response.status,
      );
    }

    const data = (await response.json()) as Record<string, unknown>;

    this.credentials = {
      accessToken: data.access_token as string,
      workspaceId: data.workspace_id as string,
      workspaceName: (data.workspace_name as string) ?? null,
      workspaceIcon: (data.workspace_icon as string) ?? null,
      botId: data.bot_id as string,
      tokenType: "bearer",
      expiresAt: null,
    };

    this.initClient(this.credentials.accessToken);
    return this.credentials;
  }

  /** Manually set an existing access token (e.g. loaded from DB). */
  setAccessToken(accessToken: string): void {
    this.credentials = {
      accessToken,
      workspaceId: "",
      workspaceName: null,
      workspaceIcon: null,
      botId: "",
      tokenType: "bearer",
      expiresAt: null,
    };
    this.initClient(accessToken);
  }

  // -----------------------------------------------------------------------
  // Search
  // -----------------------------------------------------------------------

  /**
   * Searches Notion pages and databases.
   * Supports pagination via `startCursor`.
   */
  async search(
    query: string,
    options: NotionSearchOptions = {},
  ): Promise<NotionSearchResult> {
    const client = this.requireClient();

    const params: Record<string, unknown> = {
      query,
      page_size: options.pageSize ?? NotionMCPClient.DEFAULT_PAGE_SIZE,
    };

    if (options.filter) {
      params.filter = { value: options.filter, property: "object" };
    }
    if (options.sort) {
      params.sort = options.sort;
    }
    if (options.startCursor) {
      params.start_cursor = options.startCursor;
    }

    const response = await this.withRateLimitRetry(() =>
      client.search(params as Parameters<typeof client.search>[0]),
    );

    const results = response.results.map((result) =>
      this.normalizeSearchResult(result),
    );

    return {
      results,
      hasMore: response.has_more,
      nextCursor: response.next_cursor ?? null,
      totalHint: null,
    };
  }

  // -----------------------------------------------------------------------
  // Pages
  // -----------------------------------------------------------------------

  /** Retrieves a page and all its child blocks recursively. */
  async getPage(pageId: string): Promise<{
    page: NotionPage;
    blocks: NotionBlock[];
  }> {
    const client = this.requireClient();

    const pageResponse = await this.withRateLimitRetry(() =>
      client.pages.retrieve({ page_id: pageId }),
    );

    const page = this.normalizePage(pageResponse);
    const blocks = await this.getBlockChildren(pageId);

    return { page, blocks };
  }

  // -----------------------------------------------------------------------
  // Databases
  // -----------------------------------------------------------------------

  /**
   * Queries a Notion database, optionally with a filter.
   * Supports pagination via `startCursor`.
   */
  async getDatabase(
    databaseId: string,
    filter?: Record<string, unknown>,
    startCursor?: string,
    pageSize?: number,
  ): Promise<{
    database: NotionDatabase;
    hasMore: boolean;
    nextCursor: string | null;
  }> {
    const client = this.requireClient();

    // Retrieve database metadata
    const dbMeta = await this.withRateLimitRetry(() =>
      client.databases.retrieve({ database_id: databaseId }),
    );

    // Query database entries
    const queryParams: Record<string, unknown> = {
      database_id: databaseId,
      page_size: pageSize ?? NotionMCPClient.DEFAULT_PAGE_SIZE,
    };
    if (filter) {
      queryParams.filter = filter;
    }
    if (startCursor) {
      queryParams.start_cursor = startCursor;
    }

    const queryResponse = await this.withRateLimitRetry(() =>
      client.databases.query(
        queryParams as Parameters<typeof client.databases.query>[0],
      ),
    );

    const entries = queryResponse.results.map((entry) =>
      this.normalizePage(entry),
    );

    const database = this.normalizeDatabase(dbMeta, entries);

    return {
      database,
      hasMore: queryResponse.has_more,
      nextCursor: queryResponse.next_cursor ?? null,
    };
  }

  // -----------------------------------------------------------------------
  // Blocks (recursive)
  // -----------------------------------------------------------------------

  /** Retrieves all child blocks of a given block/page, recursively. */
  private async getBlockChildren(blockId: string): Promise<NotionBlock[]> {
    const client = this.requireClient();
    const blocks: NotionBlock[] = [];
    let cursor: string | undefined;

    do {
      const params: Record<string, unknown> = {
        block_id: blockId,
        page_size: NotionMCPClient.DEFAULT_PAGE_SIZE,
      };
      if (cursor) {
        params.start_cursor = cursor;
      }

      const response = await this.withRateLimitRetry(() =>
        client.blocks.children.list(
          params as Parameters<typeof client.blocks.children.list>[0],
        ),
      );

      for (const block of response.results) {
        const normalized = this.normalizeBlock(block);
        if (normalized.hasChildren) {
          normalized.children = await this.getBlockChildren(normalized.id);
        }
        blocks.push(normalized);
      }

      cursor = response.has_more
        ? (response.next_cursor ?? undefined)
        : undefined;
    } while (cursor);

    return blocks;
  }

  // -----------------------------------------------------------------------
  // Rate-limit handling
  // -----------------------------------------------------------------------

  /**
   * Wraps an API call with automatic retry on 429 (Too Many Requests).
   * Respects the `Retry-After` header when available.
   */
  private async withRateLimitRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: unknown;

    for (
      let attempt = 0;
      attempt <= NotionMCPClient.MAX_RATE_LIMIT_RETRIES;
      attempt++
    ) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;

        if (!this.isRateLimitError(error)) {
          throw this.normalizeError(error);
        }

        if (attempt === NotionMCPClient.MAX_RATE_LIMIT_RETRIES) {
          throw new NotionMCPError(
            "Rate limit exceeded after maximum retries",
            "RATE_LIMIT_EXHAUSTED",
            429,
            false,
          );
        }

        const retryAfterMs = this.getRetryAfterMs(error);
        await this.sleep(retryAfterMs);
      }
    }

    throw this.normalizeError(lastError);
  }

  /** Checks if an error is a 429 rate-limit response. */
  private isRateLimitError(error: unknown): boolean {
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      return err.status === 429 || err.code === "rate_limited";
    }
    return false;
  }

  /** Extracts retry delay from the error or defaults to exponential backoff. */
  private getRetryAfterMs(error: unknown): number {
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      if (typeof err.headers === "object" && err.headers) {
        const headers = err.headers as Record<string, string>;
        const retryAfter = headers["retry-after"];
        if (retryAfter) {
          return Math.max(parseInt(retryAfter, 10) * 1000, 1000);
        }
      }
    }
    return 1000;
  }

  // -----------------------------------------------------------------------
  // Normalization helpers
  // -----------------------------------------------------------------------

  /** Normalizes a Notion API error into a NotionMCPError. */
  private normalizeError(error: unknown): NotionMCPError {
    if (error instanceof NotionMCPError) {
      return error;
    }

    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>;
      return new NotionMCPError(
        (err.message as string) ?? "Unknown Notion API error",
        (err.code as string) ?? "UNKNOWN",
        (err.status as number) ?? null,
        (err.status as number) === 429 || (err.status as number) === 502,
      );
    }

    return new NotionMCPError(
      String(error),
      "UNKNOWN",
      null,
      false,
    );
  }

  /** Normalizes a search result (page or database) into the appropriate type. */
  private normalizeSearchResult(
    result: Record<string, unknown>,
  ): NotionPage | NotionDatabase {
    if ((result as Record<string, unknown>).object === "database") {
      return this.normalizeDatabase(result, []);
    }
    return this.normalizePage(result);
  }

  /** Normalizes a raw Notion page object. */
  private normalizePage(raw: unknown): NotionPage {
    const page = raw as Record<string, unknown>;
    const parent = page.parent as Record<string, unknown> | undefined;

    return {
      id: page.id as string,
      title: this.extractTitle(page),
      url: (page.url as string) ?? "",
      createdTime: page.created_time as string,
      lastEditedTime: page.last_edited_time as string,
      parentType: this.resolveParentType(parent),
      parentId: this.resolveParentId(parent),
      archived: (page.archived as boolean) ?? false,
      icon: this.extractIcon(page.icon),
      cover: this.extractCover(page.cover),
      properties: (page.properties as Record<string, unknown>) ?? {},
    };
  }

  /** Normalizes a raw Notion database object. */
  private normalizeDatabase(
    raw: unknown,
    entries: NotionPage[],
  ): NotionDatabase {
    const db = raw as Record<string, unknown>;
    const parent = db.parent as Record<string, unknown> | undefined;

    const rawProperties =
      (db.properties as Record<string, Record<string, unknown>>) ?? {};
    const properties: Record<string, { id: string; name: string; type: string; config: Record<string, unknown> }> = {};

    for (const [key, prop] of Object.entries(rawProperties)) {
      properties[key] = {
        id: (prop.id as string) ?? key,
        name: key,
        type: (prop.type as string) ?? "unknown",
        config: prop,
      };
    }

    return {
      id: db.id as string,
      title: this.extractDatabaseTitle(db),
      url: (db.url as string) ?? "",
      createdTime: db.created_time as string,
      lastEditedTime: db.last_edited_time as string,
      parentType: this.resolveParentType(parent) as "page" | "workspace",
      parentId: this.resolveParentId(parent),
      archived: (db.archived as boolean) ?? false,
      icon: this.extractIcon(db.icon),
      properties,
      entries,
    };
  }

  /** Normalizes a raw Notion block into a NotionBlock. */
  private normalizeBlock(raw: unknown): NotionBlock {
    const block = raw as Record<string, unknown>;
    const type = block.type as string;
    const typeData = (block[type] as Record<string, unknown>) ?? {};

    return {
      id: block.id as string,
      type,
      hasChildren: (block.has_children as boolean) ?? false,
      createdTime: block.created_time as string,
      lastEditedTime: block.last_edited_time as string,
      content: this.extractBlockContent(type, typeData),
      children: [],
      metadata: typeData,
    };
  }

  /** Extracts the plain-text title from a page's properties. */
  private extractTitle(page: Record<string, unknown>): string {
    const properties = page.properties as Record<string, unknown> | undefined;
    if (!properties) return "Untitled";

    for (const prop of Object.values(properties)) {
      const p = prop as Record<string, unknown>;
      if (p.type === "title") {
        const titleArray = p.title as Array<{ plain_text: string }> | undefined;
        if (titleArray && titleArray.length > 0) {
          return titleArray.map((t) => t.plain_text).join("");
        }
      }
    }
    return "Untitled";
  }

  /** Extracts the title from a database object. */
  private extractDatabaseTitle(db: Record<string, unknown>): string {
    const title = db.title as Array<{ plain_text: string }> | undefined;
    if (title && title.length > 0) {
      return title.map((t) => t.plain_text).join("");
    }
    return "Untitled Database";
  }

  /** Extracts plain-text content from a block's type-specific data. */
  private extractBlockContent(
    type: string,
    data: Record<string, unknown>,
  ): string {
    const richTextTypes = [
      "paragraph",
      "heading_1",
      "heading_2",
      "heading_3",
      "bulleted_list_item",
      "numbered_list_item",
      "toggle",
      "quote",
      "callout",
      "to_do",
    ];

    if (richTextTypes.includes(type)) {
      const richText = data.rich_text as
        | Array<{ plain_text: string }>
        | undefined;
      if (richText) {
        return richText.map((rt) => rt.plain_text).join("");
      }
    }

    if (type === "code") {
      const richText = data.rich_text as
        | Array<{ plain_text: string }>
        | undefined;
      const language = (data.language as string) ?? "";
      const code = richText?.map((rt) => rt.plain_text).join("") ?? "";
      return `\`\`\`${language}\n${code}\n\`\`\``;
    }

    if (type === "equation") {
      return (data.expression as string) ?? "";
    }

    if (type === "image" || type === "file" || type === "pdf") {
      const fileData = (data.file as Record<string, unknown>) ??
        (data.external as Record<string, unknown>);
      return (fileData?.url as string) ?? `[${type}]`;
    }

    if (type === "bookmark" || type === "link_preview" || type === "embed") {
      return (data.url as string) ?? `[${type}]`;
    }

    if (type === "divider") return "---";
    if (type === "table_of_contents") return "[Table of Contents]";
    if (type === "breadcrumb") return "[Breadcrumb]";

    return "";
  }

  /** Resolves the parent type from a Notion parent object. */
  private resolveParentType(
    parent: Record<string, unknown> | undefined,
  ): "database" | "page" | "workspace" {
    if (!parent) return "workspace";
    if (parent.type === "database_id") return "database";
    if (parent.type === "page_id") return "page";
    return "workspace";
  }

  /** Resolves the parent ID from a Notion parent object. */
  private resolveParentId(
    parent: Record<string, unknown> | undefined,
  ): string | null {
    if (!parent) return null;
    return (
      (parent.database_id as string) ??
      (parent.page_id as string) ??
      null
    );
  }

  /** Extracts an icon URL or emoji. */
  private extractIcon(icon: unknown): string | null {
    if (!icon || typeof icon !== "object") return null;
    const i = icon as Record<string, unknown>;
    if (i.type === "emoji") return i.emoji as string;
    if (i.type === "external")
      return (i.external as Record<string, string>)?.url ?? null;
    if (i.type === "file")
      return (i.file as Record<string, string>)?.url ?? null;
    return null;
  }

  /** Extracts a cover image URL. */
  private extractCover(cover: unknown): string | null {
    if (!cover || typeof cover !== "object") return null;
    const c = cover as Record<string, unknown>;
    if (c.type === "external")
      return (c.external as Record<string, string>)?.url ?? null;
    if (c.type === "file")
      return (c.file as Record<string, string>)?.url ?? null;
    return null;
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /** Initializes the Notion SDK client with the given auth token. */
  private initClient(auth: string): void {
    this.client = new NotionSDKClient({ auth });
  }

  /** Returns the initialized client or throws if not authenticated. */
  private requireClient(): NotionSDKClient {
    if (!this.client) {
      throw new NotionMCPError(
        "Client not authenticated. Call exchangeCode() or setAccessToken() first.",
        "NOT_AUTHENTICATED",
      );
    }
    return this.client;
  }

  /** Promise-based sleep. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
