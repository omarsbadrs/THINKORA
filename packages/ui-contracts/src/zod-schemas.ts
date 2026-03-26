// ---------------------------------------------------------------------------
// Zod validation schemas for runtime payload validation
// ---------------------------------------------------------------------------

import { z } from "zod";

// ---- Chat: send-message payload ----

export const SendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(100_000),
  role: z.enum(["user", "system"]).default("user"),
  modelUsed: z.string().min(1).optional(),
  attachments: z
    .array(
      z.object({
        fileId: z.string().uuid(),
        name: z.string(),
      })
    )
    .optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SendMessagePayload = z.infer<typeof SendMessageSchema>;

// ---- Files: upload metadata ----

export const FileUploadSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  metadata: z.record(z.unknown()).optional(),
});

export type FileUploadPayload = z.infer<typeof FileUploadSchema>;

// ---- Models: selection payload ----

export const RoutingModeSchema = z.enum([
  "manual",
  "cost_optimized",
  "quality_optimized",
  "latency_optimized",
  "balanced",
  "fallback_chain",
]);

export const ModelSelectionSchema = z.object({
  selectedModel: z.string().min(1),
  routingMode: RoutingModeSchema,
  fallbackModels: z.array(z.string().min(1)).default([]),
  providerPreferences: z.record(z.number().min(0).max(1)).default({}),
  maxCost: z.number().positive().nullable().default(null),
  strictZdr: z.boolean().default(false),
  requireParametersMatch: z.boolean().default(false),
});

export type ModelSelectionPayloadValidated = z.infer<
  typeof ModelSelectionSchema
>;

// ---- Connectors: config payload ----

export const ConnectorConfigSchema = z.object({
  type: z.enum(["notion", "supabase_mcp"]),
  credentials: z.string().min(1),
  config: z.record(z.unknown()).default({}),
  syncSchedule: z
    .enum(["manual", "hourly", "daily", "weekly"])
    .default("manual"),
  enabled: z.boolean().default(true),
});

export type ConnectorConfigPayload = z.infer<typeof ConnectorConfigSchema>;

// ---- Search: query payload ----

export const SearchQuerySchema = z.object({
  query: z.string().min(1).max(10_000),
  sources: z
    .array(z.enum(["file", "notion", "supabase", "web"]))
    .min(1)
    .default(["file"]),
  maxResults: z.number().int().min(1).max(100).default(10),
  relevanceThreshold: z.number().min(0).max(1).default(0.5),
  filters: z
    .object({
      fileIds: z.array(z.string().uuid()).optional(),
      connectorIds: z.array(z.string().uuid()).optional(),
      dateRange: z
        .object({
          from: z.string().datetime().optional(),
          to: z.string().datetime().optional(),
        })
        .optional(),
    })
    .optional(),
});

export type SearchQueryPayload = z.infer<typeof SearchQuerySchema>;
