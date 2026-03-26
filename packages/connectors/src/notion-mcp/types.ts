// ---------------------------------------------------------------------------
// Notion MCP connector types
// ---------------------------------------------------------------------------

/** Configuration for the Notion MCP client OAuth flow. */
export interface NotionConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Credentials obtained after successful OAuth exchange. */
export interface NotionCredentials {
  accessToken: string;
  workspaceId: string;
  workspaceName: string | null;
  workspaceIcon: string | null;
  botId: string;
  tokenType: "bearer";
  expiresAt: string | null;
}

/** A Notion page in normalized form. */
export interface NotionPage {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  parentType: "database" | "page" | "workspace";
  parentId: string | null;
  archived: boolean;
  icon: string | null;
  cover: string | null;
  properties: Record<string, unknown>;
}

/** A Notion database in normalized form. */
export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  createdTime: string;
  lastEditedTime: string;
  parentType: "page" | "workspace";
  parentId: string | null;
  archived: boolean;
  icon: string | null;
  properties: Record<string, NotionDatabaseProperty>;
  entries: NotionPage[];
}

/** Schema of a single database property. */
export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
}

/** A Notion block (paragraph, heading, list item, etc.). */
export interface NotionBlock {
  id: string;
  type: string;
  hasChildren: boolean;
  createdTime: string;
  lastEditedTime: string;
  content: string;
  children: NotionBlock[];
  metadata: Record<string, unknown>;
}

/** Options for the Notion search API. */
export interface NotionSearchOptions {
  filter?: "page" | "database";
  sort?: {
    direction: "ascending" | "descending";
    timestamp: "last_edited_time";
  };
  startCursor?: string;
  pageSize?: number;
}

/** Paginated search result from Notion. */
export interface NotionSearchResult {
  results: Array<NotionPage | NotionDatabase>;
  hasMore: boolean;
  nextCursor: string | null;
  totalHint: number | null;
}

/** Tracks sync state for incremental Notion syncing. */
export interface NotionSyncState {
  connectorId: string;
  lastSyncedAt: string | null;
  lastCursor: string | null;
  syncedPageIds: string[];
  syncedDatabaseIds: string[];
  totalDocuments: number;
  errorCount: number;
}
