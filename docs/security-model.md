# Security Model

Thinkora implements defense-in-depth security across authentication, authorization, encryption, input validation, and audit logging. The security package is in `packages/security/`.

## Authentication

### Supabase Auth

All authentication is handled by Supabase Auth (GoTrue), which provides:
- Email/password authentication with bcrypt password hashing
- JWT-based sessions with RS256 signing
- HTTP-only secure cookies for session storage
- Automatic token refresh
- Rate-limited auth endpoints

### Session Security

- Access tokens are short-lived JWTs (1 hour by default)
- Refresh tokens are long-lived and stored in HTTP-only cookies
- The `@supabase/ssr` library handles secure cookie management
- Server-side session verification on every protected request

### Demo Mode Security

Demo mode bypasses authentication entirely. It is designed for evaluation only and should never be used with real data. When enabled, a mock user with admin privileges is injected into every request.

## Authorization (Row-Level Security)

### RLS Design Principles

1. **Default deny:** RLS is enabled on all user-scoped tables
2. **User isolation:** Users can only access their own data via `auth.uid()` checks
3. **Ownership chains:** Nested data (messages, chunks, citations) is authorized via parent ownership
4. **Admin exceptions:** Audit logs are readable only by users with `role = 'admin'` in their JWT
5. **Public data:** Model registry is readable by any authenticated user

### RLS-Protected Tables

All 20+ user-scoped tables have RLS enabled. See [auth-flow.md](./auth-flow.md) for the complete policy summary.

### Role-Based Access Control

**File:** `packages/security/src/permissions.ts`

Three built-in roles with hierarchical permissions:

| Role | Permissions |
|---|---|
| `admin` | READ, WRITE, DELETE, ADMIN, MANAGE_CONNECTORS, MANAGE_MODELS |
| `editor` | READ, WRITE, MANAGE_CONNECTORS |
| `viewer` | READ |

Permission checking:

```typescript
import { hasPermission, requirePermission, Permission } from "@thinkora/security";

// Check
if (hasPermission(user, Permission.MANAGE_CONNECTORS)) { ... }

// Assert (throws if denied)
requirePermission(user, Permission.ADMIN);
```

### Agent Tool Permissions

The tool runtime enforces per-tool permission checks:

| Tool Category | Access |
|---|---|
| Public tools (`search_files`, `search_notion`, `query_database`, `upload_file`, `get_model_info`) | Any authenticated user |
| Admin tools (`admin_diagnostics`, `system_health`) | Requires `sessionMemory.isAdmin === true` |
| Unknown tools | Rejected by default |

## Encryption at Rest

**File:** `packages/security/src/encryption.ts`

### Algorithm

- **Cipher:** AES-256-GCM (authenticated encryption)
- **Key size:** 256 bits (32 bytes, stored as 64 hex characters)
- **IV:** 96 bits (12 bytes), randomly generated per encryption
- **Auth tag:** 128 bits (16 bytes)

### Format

Encrypted values are stored as: `iv:authTag:ciphertext` (all hex-encoded)

### What Is Encrypted

- **Connector credentials:** OAuth access tokens for Notion are encrypted before storage in the `connector_accounts.credentials_encrypted` column
- **API keys:** Any user-provided API keys stored in the database

### Key Management

- The encryption key is set via `APP_ENCRYPTION_KEY` environment variable
- It must be exactly 32 bytes (64 hex characters)
- Generate with: `openssl rand -hex 32`
- If the key changes, all previously encrypted data becomes unreadable
- The key should be unique per environment (dev, staging, production)

### Hashing

SHA-256 hashing is available via `hashSecret()` for one-way operations (e.g., fingerprinting tokens for comparison without storing the original).

## SQL Injection Prevention

**File:** `packages/security/src/sql-guards.ts`

### Multi-Layer Defense

1. **Parameterized queries:** All database operations use parameterized queries ($1, $2, etc.) via Supabase client -- this is the primary defense

2. **SQL keyword detection:** The `isSafeQuery()` function scans for dangerous patterns as an additional safety net:

| Blocked Pattern | Reason |
|---|---|
| `DROP`, `DELETE`, `ALTER`, `TRUNCATE` | DDL/DML destruction |
| `INSERT`, `UPDATE` | Data modification |
| `GRANT`, `REVOKE` | Privilege escalation |
| `EXEC`, `EXECUTE`, `CREATE` | Code execution |
| `UNION` | Query injection |
| `INTO OUTFILE`, `LOAD_FILE` | File system access |
| `xp_cmdshell` | OS command execution |
| `INFORMATION_SCHEMA` | Schema discovery |
| `--`, `/*`, `*/` | SQL comments (used to bypass filters) |
| `;` | Statement termination (multi-statement injection) |

3. **Read-only validation:** `validateQueryReadOnly()` ensures queries start with SELECT and contain no write keywords

4. **Input sanitization:** `sanitizeInput()` escapes SQL-special characters for logging/display purposes

### Supabase MCP Guards

The Supabase MCP client has its own write guard (`guardWriteOperation()`) that scans for write SQL keywords before any query is executed. Write operations are blocked by default (`allowWrites: false`).

## Upload Validation

**File:** `packages/security/src/upload-validation.ts`

### Validation Checks

Every file upload is validated through 6 security checks:

1. **Size check**
   - Maximum: 50 MB (configurable)
   - Minimum: > 0 bytes (reject empty files)

2. **MIME type allowlist**
   - `application/pdf`
   - `text/plain`, `text/markdown`, `text/csv`
   - `application/json`
   - `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (.docx)
   - `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (.xlsx)
   - `image/png`, `image/jpeg`, `image/webp`, `image/gif`

3. **Extension allowlist**
   - `.pdf`, `.txt`, `.md`, `.csv`, `.json`, `.docx`, `.xlsx`
   - `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`

4. **Double extension detection**
   - Rejects files like `report.pdf.exe` or `data.csv.bat`
   - Checks if the filename minus the final extension still contains a dot

5. **Null byte detection**
   - Rejects filenames containing `\0` (used to bypass extension checks in some systems)

6. **Path traversal detection**
   - Rejects filenames containing `/` or `\`
   - Prevents directory traversal attacks (e.g., `../../etc/passwd`)

### Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];  // Human-readable error messages
}
```

## Audit Logging

**File:** `packages/security/src/audit.ts`

### Audited Actions

| Action | When |
|---|---|
| `LOGIN` | User signs in |
| `LOGOUT` | User signs out |
| `FILE_UPLOAD` | File uploaded |
| `FILE_DELETE` | File deleted |
| `CONNECTOR_CONNECT` | External service connected (Notion, Supabase MCP) |
| `CONNECTOR_DISCONNECT` | External service disconnected |
| `MODEL_SWITCH` | User changes their selected model |
| `MEMORY_EXPORT` | Session memory exported |
| `MEMORY_CLEAR` | Session memory cleared |
| `PERMISSION_CHANGE` | User role or permissions modified |
| `SETTINGS_UPDATE` | User settings changed |
| `API_KEY_ROTATE` | API key rotated |
| `QUERY_EXECUTE` | SQL query executed via Supabase MCP |

### Audit Entry Structure

```typescript
interface AuditEntry {
  id: string;
  timestamp: string;        // ISO 8601
  userId: string;
  action: AuditAction;
  resourceType: string;     // e.g., "file", "connector", "model"
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}
```

### Storage

Audit entries are stored in the `audit_logs` table with RLS policies:
- **Insert:** Any authenticated user can create audit entries
- **Read:** Only users with `role = 'admin'` in their JWT can read audit logs

### Log Format

For structured logging output:
```
[2026-03-26T12:00:00Z] LOGIN user=u-001 resource=session/s-001 ip=127.0.0.1
```

## Rate Limiting

The API service configures rate limiting via Fastify:

| Setting | Default | Environment Variable |
|---|---|---|
| Max requests per window | 100 | `RATE_LIMIT_MAX` |
| Window duration | 1 minute | `RATE_LIMIT_WINDOW` |

Rate limiting applies per IP address and returns HTTP 429 when exceeded.

## Budget Controls

### Per-Request Cost Limit

`OPENROUTER_MAX_REQUEST_COST_USD` (default: $1.00) caps the estimated cost of a single LLM request. The cost is estimated before sending using the model's pricing and the input token count.

### Daily Budget

`OPENROUTER_BUDGET_DAILY_USD` (default: $10.00) limits total spending per day across all requests.

### Monthly Budget

`OPENROUTER_BUDGET_MONTHLY_USD` (default: $200.00) limits total spending per calendar month.

### Budget Enforcement

Budget checks happen in the model routing service before sending requests to OpenRouter. If a budget is exceeded, the request is rejected with a budget error rather than being sent to the API.

## CORS Configuration

The API server's CORS configuration:
- **Origins:** Configurable via `CORS_ORIGINS` (default: `http://localhost:3000,http://localhost:5173`)
- **Credentials:** Enabled (required for cookie-based auth)
- **Methods:** GET, POST, PUT, PATCH, DELETE, OPTIONS
- **Allowed Headers:** Content-Type, Authorization, X-Request-ID

For production, update `CORS_ORIGINS` to include only your production domain(s).
