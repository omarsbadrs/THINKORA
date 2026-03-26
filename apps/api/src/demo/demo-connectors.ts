/**
 * Demo connector responses — Static mock data for demo mode.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConnectorHealth {
  id: string;
  name: string;
  type: string;
  status: "connected" | "degraded" | "disconnected";
  latencyMs: number;
  lastPing: string;
  version: string;
}

interface NotionPage {
  id: string;
  title: string;
  lastEdited: string;
  createdBy: string;
  icon: string;
  url: string;
}

interface SupabaseTableSchema {
  table: string;
  columns: { name: string; type: string; nullable: boolean }[];
  rowCount: number;
}

// ---------------------------------------------------------------------------
// Mock health status
// ---------------------------------------------------------------------------

export function getDemoConnectorHealth(): ConnectorHealth[] {
  return [
    {
      id: "notion-mcp",
      name: "Notion MCP",
      type: "knowledge_base",
      status: "connected",
      latencyMs: 42,
      lastPing: "2026-03-26T11:59:00Z",
      version: "1.2.0",
    },
    {
      id: "supabase-mcp",
      name: "Supabase MCP",
      type: "database",
      status: "connected",
      latencyMs: 18,
      lastPing: "2026-03-26T11:59:30Z",
      version: "2.0.1",
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      type: "model_provider",
      status: "connected",
      latencyMs: 105,
      lastPing: "2026-03-26T11:58:00Z",
      version: "3.1.0",
    },
    {
      id: "github-mcp",
      name: "GitHub MCP",
      type: "code_repository",
      status: "disconnected",
      latencyMs: -1,
      lastPing: "2026-03-25T22:00:00Z",
      version: "0.9.0",
    },
  ];
}

// ---------------------------------------------------------------------------
// Mock Notion pages
// ---------------------------------------------------------------------------

export function getDemoNotionPages(): NotionPage[] {
  return [
    {
      id: "notion-page-001",
      title: "Thinkora Architecture Overview",
      lastEdited: "2026-03-24T16:00:00Z",
      createdBy: "Demo User",
      icon: "📐",
      url: "https://notion.so/demo/architecture-overview",
    },
    {
      id: "notion-page-002",
      title: "Sprint 12 — RAG Pipeline Improvements",
      lastEdited: "2026-03-23T10:30:00Z",
      createdBy: "Demo User",
      icon: "🏃",
      url: "https://notion.so/demo/sprint-12",
    },
    {
      id: "notion-page-003",
      title: "Model Evaluation Criteria",
      lastEdited: "2026-03-20T09:00:00Z",
      createdBy: "Demo User",
      icon: "📊",
      url: "https://notion.so/demo/model-eval",
    },
    {
      id: "notion-page-004",
      title: "Meeting Notes — Product Sync",
      lastEdited: "2026-03-19T14:00:00Z",
      createdBy: "Demo User",
      icon: "📝",
      url: "https://notion.so/demo/meeting-notes",
    },
    {
      id: "notion-page-005",
      title: "API Design Guidelines",
      lastEdited: "2026-03-15T11:00:00Z",
      createdBy: "Demo User",
      icon: "🔌",
      url: "https://notion.so/demo/api-guidelines",
    },
  ];
}

// ---------------------------------------------------------------------------
// Mock Supabase schema
// ---------------------------------------------------------------------------

export function getDemoSupabaseSchema(): SupabaseTableSchema[] {
  return [
    {
      table: "conversations",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "user_id", type: "uuid", nullable: false },
        { name: "title", type: "text", nullable: true },
        { name: "model", type: "text", nullable: false },
        { name: "created_at", type: "timestamptz", nullable: false },
        { name: "updated_at", type: "timestamptz", nullable: false },
      ],
      rowCount: 42,
    },
    {
      table: "messages",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "conversation_id", type: "uuid", nullable: false },
        { name: "role", type: "text", nullable: false },
        { name: "content", type: "text", nullable: false },
        { name: "model", type: "text", nullable: true },
        { name: "tokens_used", type: "integer", nullable: true },
        { name: "created_at", type: "timestamptz", nullable: false },
      ],
      rowCount: 1248,
    },
    {
      table: "documents",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "user_id", type: "uuid", nullable: false },
        { name: "filename", type: "text", nullable: false },
        { name: "mime_type", type: "text", nullable: false },
        { name: "size_bytes", type: "integer", nullable: false },
        { name: "embedding", type: "vector(1536)", nullable: true },
        { name: "created_at", type: "timestamptz", nullable: false },
      ],
      rowCount: 87,
    },
    {
      table: "memories",
      columns: [
        { name: "id", type: "uuid", nullable: false },
        { name: "user_id", type: "uuid", nullable: false },
        { name: "type", type: "text", nullable: false },
        { name: "content", type: "text", nullable: false },
        { name: "metadata", type: "jsonb", nullable: true },
        { name: "expires_at", type: "timestamptz", nullable: true },
        { name: "created_at", type: "timestamptz", nullable: false },
      ],
      rowCount: 15,
    },
  ];
}
