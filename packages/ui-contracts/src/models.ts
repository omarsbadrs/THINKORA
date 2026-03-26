// ---------------------------------------------------------------------------
// Model catalogue & routing types
// ---------------------------------------------------------------------------

import type { RoutingMode } from "./chat";

/** Input / output modality supported by a model. */
export type Modality = "text" | "image" | "audio" | "video" | "embedding";

/** Level of feature support a model advertises. */
export type FeatureSupport = "none" | "basic" | "full";

/** A model record synchronised from the OpenRouter catalogue. */
export interface ModelRecord {
  slug: string;
  canonicalSlug: string;
  displayName: string;
  providerFamily: string;
  description: string;
  contextLength: number;
  inputCostPerM: number;
  outputCostPerM: number;
  inputModalities: Modality[];
  outputModalities: Modality[];
  supportedParameters: string[];
  structuredOutputSupport: FeatureSupport;
  toolsSupport: FeatureSupport;
  reasoningSupport: FeatureSupport;
  isModerated: boolean;
  maxCompletionTokens: number | null;
  deprecated: boolean;
  expiresAt: string | null;
  tags: string[];
  syncedAt: string;
}

/** A named routing policy that governs how requests are dispatched. */
export interface ModelRoutingPolicy {
  id: string;
  name: string;
  routingMode: RoutingMode;
  primaryModel: string;
  fallbackModels: string[];
  providerPreferences: Record<string, number>;
  maxCostPerRequest: number | null;
  requireZdr: boolean;
  requireParametersMatch: boolean;
  taskTypes: string[];
  priority: number;
}

/** Status of a model usage log entry. */
export type ModelUsageStatus = "success" | "error" | "fallback";

/** A single logged model usage event. */
export interface ModelUsageLog {
  id: string;
  requestId: string;
  userId: string;
  selectedModel: string;
  actualModel: string;
  routingMode: RoutingMode;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  latencyMs: number;
  status: ModelUsageStatus;
  taskType: string;
  fallbackUsed: boolean;
  createdAt: string;
}

/** A benchmark result for a specific model and task type. */
export interface ModelBenchmark {
  id: string;
  modelSlug: string;
  taskType: string;
  score: number;
  runAt: string;
}

/** AI-generated analysis summarising a model's capabilities. */
export interface ModelAnalysis {
  modelSlug: string;
  summary: string;
  idealUseCases: string[];
  strengths: string[];
  weaknesses: string[];
  suitabilityScores: Record<string, number>;
}
