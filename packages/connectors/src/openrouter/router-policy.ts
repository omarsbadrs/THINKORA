// ---------------------------------------------------------------------------
// Routing policy engine
// ---------------------------------------------------------------------------

import type {
  ModelMetadata,
  RoutingStrategy,
  RoutingConstraints,
  RoutingPolicy,
} from "./types";

/** Result of a model resolution attempt. */
export interface ModelResolution {
  model: ModelMetadata;
  strategy: RoutingStrategy;
  reason: string;
}

/**
 * Selects the best model for a given task type based on the applicable
 * routing policies and the available model catalog.
 *
 * Resolution order:
 * 1. Find the highest-priority policy matching the task type.
 * 2. Apply the policy's routing strategy.
 * 3. Validate the chosen model against the policy constraints.
 * 4. Return the first valid model, or `null` if none qualifies.
 */
export function resolveModel(
  taskType: string,
  policies: RoutingPolicy[],
  catalog: ModelMetadata[],
): ModelResolution | null {
  // Sort policies by priority (higher number = higher priority)
  const applicable = policies
    .filter(
      (p) => p.taskTypes.length === 0 || p.taskTypes.includes(taskType),
    )
    .sort((a, b) => b.priority - a.priority);

  if (applicable.length === 0) {
    // No policies match; fall back to first model in catalog
    if (catalog.length === 0) return null;
    return {
      model: catalog[0],
      strategy: "auto",
      reason: "No matching policy; defaulting to first available model",
    };
  }

  for (const policy of applicable) {
    const result = applyStrategy(policy, catalog);
    if (result) return result;
  }

  return null;
}

/**
 * Builds an ordered fallback chain starting from the primary model.
 * Each model in the chain is validated against the policy's constraints.
 */
export function buildFallbackChain(
  primary: string,
  policies: RoutingPolicy[],
  catalog: ModelMetadata[],
): ModelMetadata[] {
  const chain: ModelMetadata[] = [];
  const seen = new Set<string>();

  // Find the primary policy (highest priority that lists the primary model)
  const policy = policies.find((p) => p.primaryModel === primary);
  const constraints = policy?.constraints ?? {};

  // Add primary model first
  const primaryModel = catalog.find((m) => m.slug === primary);
  if (primaryModel && validateModelChoice(primaryModel, constraints)) {
    chain.push(primaryModel);
    seen.add(primaryModel.slug);
  }

  // Add explicit fallbacks from the policy
  if (policy) {
    for (const fallbackSlug of policy.fallbackModels) {
      if (seen.has(fallbackSlug)) continue;
      const model = catalog.find((m) => m.slug === fallbackSlug);
      if (model && validateModelChoice(model, constraints)) {
        chain.push(model);
        seen.add(model.slug);
      }
    }
  }

  // Fill remaining slots from catalog (sorted by quality heuristic)
  const remaining = catalog
    .filter((m) => !seen.has(m.slug) && validateModelChoice(m, constraints))
    .sort((a, b) => scoreModel(b) - scoreModel(a));

  for (const model of remaining) {
    chain.push(model);
    seen.add(model.slug);
  }

  return chain;
}

/**
 * Validates whether a model satisfies the given routing constraints.
 *
 * Checks:
 * - Cost ceiling (input + output per million tokens)
 * - ZDR (zero-data-retention / moderation) requirement
 * - Required modalities
 * - Required capabilities (tags)
 * - Provider preferences / exclusions
 * - Minimum context length
 * - Deprecation status
 */
export function validateModelChoice(
  model: ModelMetadata,
  constraints: RoutingConstraints,
): boolean {
  // Cost ceiling
  if (constraints.maxCostPerMTokens !== undefined) {
    const avgCost = (model.inputCostPerM + model.outputCostPerM) / 2;
    if (avgCost > constraints.maxCostPerMTokens) {
      return false;
    }
  }

  // ZDR / moderation requirement
  if (constraints.requireZdr && !model.isModerated) {
    return false;
  }

  // Required modalities
  if (constraints.requiredModalities) {
    for (const mod of constraints.requiredModalities) {
      if (
        !model.inputModalities.includes(mod) &&
        !model.outputModalities.includes(mod)
      ) {
        return false;
      }
    }
  }

  // Required capabilities (tags)
  if (constraints.requiredCapabilities) {
    for (const cap of constraints.requiredCapabilities) {
      if (!model.tags.includes(cap)) {
        return false;
      }
    }
  }

  // Provider exclusions
  if (constraints.excludeProviders) {
    if (constraints.excludeProviders.includes(model.providerFamily)) {
      return false;
    }
  }

  // Provider preferences (if specified, model must be from a preferred provider)
  if (
    constraints.preferredProviders &&
    constraints.preferredProviders.length > 0
  ) {
    if (!constraints.preferredProviders.includes(model.providerFamily)) {
      return false;
    }
  }

  // Minimum context length
  if (constraints.minContextLength !== undefined) {
    if (model.contextLength < constraints.minContextLength) {
      return false;
    }
  }

  // Deprecation
  if (!constraints.allowDeprecated && model.deprecated) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Strategy implementations
// ---------------------------------------------------------------------------

/** Applies the routing strategy from a policy against the model catalog. */
function applyStrategy(
  policy: RoutingPolicy,
  catalog: ModelMetadata[],
): ModelResolution | null {
  const { strategy, constraints, primaryModel } = policy;

  switch (strategy) {
    case "direct":
      return resolveDirectStrategy(primaryModel, catalog, constraints);

    case "auto":
      return resolveAutoStrategy(catalog, constraints);

    case "task-based":
      return resolveTaskBasedStrategy(policy, catalog);

    case "cheap-first":
      return resolveCheapFirstStrategy(catalog, constraints);

    case "quality-first":
      return resolveQualityFirstStrategy(catalog, constraints);

    default:
      return resolveAutoStrategy(catalog, constraints);
  }
}

/** Direct strategy: use the specified primary model, no fallback logic. */
function resolveDirectStrategy(
  primarySlug: string | null,
  catalog: ModelMetadata[],
  constraints: RoutingConstraints,
): ModelResolution | null {
  if (!primarySlug) return null;

  const model = catalog.find((m) => m.slug === primarySlug);
  if (!model) return null;

  if (!validateModelChoice(model, constraints)) return null;

  return {
    model,
    strategy: "direct",
    reason: `Directly selected model: ${model.displayName}`,
  };
}

/** Auto strategy: pick the best model by composite score. */
function resolveAutoStrategy(
  catalog: ModelMetadata[],
  constraints: RoutingConstraints,
): ModelResolution | null {
  const valid = catalog
    .filter((m) => validateModelChoice(m, constraints))
    .sort((a, b) => scoreModel(b) - scoreModel(a));

  if (valid.length === 0) return null;

  return {
    model: valid[0],
    strategy: "auto",
    reason: `Auto-selected highest-scoring model: ${valid[0].displayName}`,
  };
}

/** Task-based strategy: match required capabilities from the policy. */
function resolveTaskBasedStrategy(
  policy: RoutingPolicy,
  catalog: ModelMetadata[],
): ModelResolution | null {
  // Merge task-type hinted capabilities into constraints
  const enhancedConstraints: RoutingConstraints = {
    ...policy.constraints,
    requiredCapabilities: [
      ...(policy.constraints.requiredCapabilities ?? []),
      ...deriveCapabilitiesFromTaskTypes(policy.taskTypes),
    ],
  };

  const valid = catalog
    .filter((m) => validateModelChoice(m, enhancedConstraints))
    .sort((a, b) => scoreModel(b) - scoreModel(a));

  if (valid.length === 0) {
    // Relax: try without derived capabilities
    return resolveAutoStrategy(catalog, policy.constraints);
  }

  return {
    model: valid[0],
    strategy: "task-based",
    reason: `Task-based selection for [${policy.taskTypes.join(", ")}]: ${valid[0].displayName}`,
  };
}

/** Cheap-first strategy: sort by ascending cost, pick cheapest valid. */
function resolveCheapFirstStrategy(
  catalog: ModelMetadata[],
  constraints: RoutingConstraints,
): ModelResolution | null {
  const valid = catalog
    .filter((m) => validateModelChoice(m, constraints))
    .sort(
      (a, b) =>
        a.inputCostPerM +
        a.outputCostPerM -
        (b.inputCostPerM + b.outputCostPerM),
    );

  if (valid.length === 0) return null;

  return {
    model: valid[0],
    strategy: "cheap-first",
    reason: `Cheapest valid model: ${valid[0].displayName} ($${((valid[0].inputCostPerM + valid[0].outputCostPerM) / 2).toFixed(2)}/M avg)`,
  };
}

/** Quality-first strategy: sort by descending quality score. */
function resolveQualityFirstStrategy(
  catalog: ModelMetadata[],
  constraints: RoutingConstraints,
): ModelResolution | null {
  const valid = catalog
    .filter((m) => validateModelChoice(m, constraints))
    .sort((a, b) => scoreModel(b) - scoreModel(a));

  if (valid.length === 0) return null;

  return {
    model: valid[0],
    strategy: "quality-first",
    reason: `Highest quality model: ${valid[0].displayName}`,
  };
}

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

/**
 * Computes a composite quality score for a model.
 *
 * Higher = better. Factors:
 * - Context length (normalized)
 * - Feature support (tools, structured output, reasoning)
 * - Cost penalty (expensive models score slightly lower unless premium)
 * - Tag bonuses
 */
function scoreModel(model: ModelMetadata): number {
  let score = 0;

  // Context length bonus (0-20 points, logarithmic)
  score += Math.min(Math.log2(model.contextLength / 1000) * 3, 20);

  // Feature bonuses
  if (model.toolsSupport) score += 10;
  if (model.structuredOutput) score += 5;
  if (model.reasoningSupport) score += 8;

  // Tag bonuses
  if (model.tags.includes("best-for-chat")) score += 5;
  if (model.tags.includes("best-for-rag")) score += 5;
  if (model.tags.includes("long-context")) score += 3;
  if (model.tags.includes("vision")) score += 2;

  // Cost penalty: slightly penalize very expensive models
  // Average cost per million tokens
  const avgCost = (model.inputCostPerM + model.outputCostPerM) / 2;
  if (avgCost > 30) score -= 5;
  else if (avgCost > 15) score -= 2;

  // Deprecation penalty
  if (model.deprecated) score -= 20;

  return score;
}

/** Maps task type strings to capability tag hints. */
function deriveCapabilitiesFromTaskTypes(taskTypes: string[]): string[] {
  const capabilities: string[] = [];

  for (const task of taskTypes) {
    switch (task) {
      case "chat":
        capabilities.push("best-for-chat");
        break;
      case "rag":
      case "retrieval":
        capabilities.push("best-for-rag");
        break;
      case "code":
      case "coding":
        capabilities.push("coding");
        break;
      case "reasoning":
      case "analysis":
        capabilities.push("reasoning");
        break;
      case "file-analysis":
        capabilities.push("best-for-file-analysis");
        break;
      case "vision":
        capabilities.push("vision");
        break;
    }
  }

  return capabilities;
}
