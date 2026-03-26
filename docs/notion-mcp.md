# Notion MCP Integration

Thinkora integrates with Notion via OAuth, allowing users to search their Notion workspace and use Notion pages as context for AI-powered answers. The integration is implemented in `packages/connectors/src/notion-mcp/`.

## OAuth Setup in Notion

### 1. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://notion.so/my-integrations)
2. Click **"New integration"**
3. Fill in the details:
   - **Name:** Thinkora
   - **Type:** Public (for OAuth support)
   - **Associated workspace:** Your workspace
4. Under **Capabilities**, enable:
   - Read content
   - Read user information (optional)
5. Under **OAuth Domain & URIs**, add:
   - **Redirect URI:** `http://localhost:3000/api/connectors/notion/callback` (development)
   - **Redirect URI:** `https://your-domain.com/api/connectors/notion/callback` (production)
6. Save the integration
7. Note down the **OAuth client ID** and **OAuth client secret**

### 2. Configure Environment Variables

Add to your `.env`:

```bash
NOTION_CLIENT_ID=your-notion-client-id
NOTION_CLIENT_SECRET=your-notion-client-secret
NOTION_REDIRECT_URI=http://localhost:3000/api/connectors/notion/callback
```

For production, update `NOTION_REDIRECT_URI` to your production callback URL.

## Configuration in Thinkora

### Connecting a Notion Workspace

1. Navigate to the **Connectors** page in the Thinkora web app
2. Click **"Connect Notion"**
3. You are redirected to Notion's OAuth authorization page
4. Select the pages and databases you want to share with Thinkora
5. Click **"Allow access"**
6. You are redirected back to Thinkora with an authorization code

### Behind the Scenes

The connection flow works as follows:

```
User clicks "Connect Notion"
        |
        v
  NotionMCPClient.getAuthUrl(state)
    builds URL: https://api.notion.com/v1/oauth/authorize?
      client_id=...&redirect_uri=...&response_type=code&owner=user
        |
        v
  User authorizes on Notion
        |
        v
  Notion redirects to callback with ?code=...
        |
        v
  API route handles callback:
    NotionMCPClient.exchangeCode(code)
      POST https://api.notion.com/v1/oauth/token
      with Basic Auth (client_id:client_secret)
        |
        v
  Returns NotionCredentials:
    - accessToken
    - workspaceId
    - workspaceName
    - botId
        |
        v
  Credentials encrypted with APP_ENCRYPTION_KEY (AES-256-GCM)
  Stored in connector_accounts table:
    - connector_type: "notion"
    - status: "connected"
    - credentials_encrypted: "iv:authTag:ciphertext"
    - config: { workspaceId, workspaceName }
```

## How Search Works

When a user's query mentions Notion-related keywords (e.g., "notion", "page", "wiki", "workspace doc"), the orchestrator's planner includes a Notion retrieval step.

### Search Process

```
Query: "Find the Q3 budget from my Notion wiki"
        |
        v
  Planner detects Notion keywords
  Creates plan step: { type: "retrieve", source: "notion", query: "Q3 budget" }
        |
        v
  RetrievalService calls NotionMCPClient.search("Q3 budget")
        |
        v
  Notion API returns matching pages and databases
  Each result includes:
    - id, title, url
    - createdTime, lastEditedTime
    - parentType (database, page, workspace)
    - properties
        |
        v
  For top results, full page content is fetched:
    NotionMCPClient.getPage(pageId)
    Recursively retrieves all child blocks
        |
        v
  Block content is extracted as plain text:
    - Paragraphs, headings, lists, quotes, callouts -> rich_text
    - Code blocks -> language-tagged code fences
    - Equations -> expression text
    - Images, files, bookmarks -> URLs
    - Dividers -> "---"
        |
        v
  Text is chunked, embedded, and used as retrieval context
  Citations link back to the Notion page URL
```

### Search Options

The `NotionMCPClient.search()` method supports:

| Parameter | Description | Default |
|---|---|---|
| `query` | Search text | (required) |
| `filter` | Object type filter: `"page"` or `"database"` | none (both) |
| `sort` | Sort order for results | none |
| `pageSize` | Results per page | 100 |
| `startCursor` | Pagination cursor for next page | none |

## How Pages Are Indexed

### Initial Indexing

When a Notion workspace is connected, a `notion-sync` background job is enqueued. This job:

1. Calls `NotionMCPClient.search("")` to enumerate all accessible pages
2. For each page:
   - Retrieves full content via `getPage(pageId)` (page metadata + recursive block children)
   - Extracts plain text from all block types
   - Creates a file record in the `files` table (with `metadata.sourceType: "notion"`)
   - Runs the standard ingestion pipeline: parse -> chunk -> embed -> index
3. Updates the connector account with document count and last sync time

### Incremental Updates

Subsequent sync jobs compare `lastEditedTime` of known pages against the stored metadata and only re-index pages that have changed.

## Sync Scheduling

### Manual Sync

Users can trigger a sync from the Connectors page by clicking "Sync Now" on their Notion connection.

### Automatic Sync

The worker can be configured to run periodic sync jobs via the `connector-health` job, which checks all connector statuses and triggers re-syncs when needed.

## Rate Limit Handling

The Notion API has rate limits (approximately 3 requests per second). The `NotionMCPClient` handles this automatically:

1. **Detection:** Catches 429 (Too Many Requests) errors
2. **Retry:** Retries up to 3 times with automatic backoff
3. **Retry-After:** Respects the `Retry-After` header from Notion if provided
4. **Default backoff:** 1 second between retries when no header is present

## Troubleshooting

### "Client not authenticated" error

The Notion client requires an access token before making API calls. This error means either:
- The OAuth flow was not completed
- The stored credentials are corrupt or expired
- The connector account record is missing

**Fix:** Disconnect and reconnect Notion from the Connectors page.

### "OAuth token exchange failed"

The authorization code exchange failed. Common causes:
- The authorization code expired (codes are single-use and short-lived)
- `NOTION_CLIENT_ID` or `NOTION_CLIENT_SECRET` is incorrect
- `NOTION_REDIRECT_URI` does not match what is configured in Notion

**Fix:** Verify your Notion integration settings and `.env` variables match exactly.

### "Rate limit exceeded after maximum retries"

The Notion API is rejecting requests due to too many calls.

**Fix:** Wait a few minutes and try again. If this happens frequently, reduce the number of pages being synced or increase the interval between sync jobs.

### Search returns no results

- Ensure the pages you want to search are shared with the Notion integration
- In Notion, go to each page -> "..." menu -> "Connections" -> Add your integration
- Database items may not appear in search until they are explicitly shared

### Pages not updating after edits

- Trigger a manual sync from the Connectors page
- Check that the page's `lastEditedTime` is newer than the stored sync timestamp
- Verify the worker is running and processing `notion-sync` jobs

### Encrypted credentials error

If the `APP_ENCRYPTION_KEY` changes, previously encrypted Notion credentials become unreadable.

**Fix:** Disconnect and reconnect all Notion workspaces after changing the encryption key.
