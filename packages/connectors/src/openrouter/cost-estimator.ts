// ---------------------------------------------------------------------------
// Cost estimation and tracking
// ---------------------------------------------------------------------------

import type {
  ModelMetadata,
  TokenUsage,
  CostEstimate,
  ActualCost,
  CostDeviation,
} from "./types";

/**
 * Estimates the cost of a request before sending it.
 *
 * @param model       - The model metadata (contains pricing info).
 * @param inputTokens - Number of input/prompt tokens.
 * @param outputTokensEstimate - Estimated output/completion tokens.
 * @returns A pre-send cost estimate in USD.
 */
export function estimateRequestCost(
  model: ModelMetadata,
  inputTokens: number,
  outputTokensEstimate: number,
): CostEstimate {
  const estimatedInputCost = (inputTokens / 1_000_000) * model.inputCostPerM;
  const estimatedOutputCost =
    (outputTokensEstimate / 1_000_000) * model.outputCostPerM;

  return {
    model: model.slug,
    inputTokens,
    outputTokensEstimate,
    estimatedInputCost,
    estimatedOutputCost,
    estimatedTotalCost: estimatedInputCost + estimatedOutputCost,
    currency: "USD",
  };
}

/**
 * Calculates the actual cost of a completed request.
 *
 * @param model - The model metadata (contains pricing info).
 * @param usage - The token usage reported by the API response.
 * @returns The actual cost in USD.
 */
export function calculateActualCost(
  model: ModelMetadata,
  usage: TokenUsage,
): ActualCost {
  const inputCost = (usage.prompt_tokens / 1_000_000) * model.inputCostPerM;
  const outputCost =
    (usage.completion_tokens / 1_000_000) * model.outputCostPerM;

  return {
    model: model.slug,
    inputTokens: usage.prompt_tokens,
    outputTokens: usage.completion_tokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: "USD",
  };
}

/**
 * Compares an estimated cost against the actual cost to produce a
 * deviation analysis. Useful for monitoring estimation accuracy and
 * adjusting future estimates.
 *
 * @param estimated - The pre-send estimate.
 * @param actual    - The post-response actual cost.
 * @returns A deviation analysis with absolute and percentage differences.
 */
export function compareCosts(
  estimated: CostEstimate,
  actual: ActualCost,
): CostDeviation {
  const inputTokenDeviation = actual.inputTokens - estimated.inputTokens;
  const outputTokenDeviation =
    actual.outputTokens - estimated.outputTokensEstimate;
  const costDeviation = actual.totalCost - estimated.estimatedTotalCost;

  const costDeviationPercent =
    estimated.estimatedTotalCost > 0
      ? (costDeviation / estimated.estimatedTotalCost) * 100
      : actual.totalCost > 0
        ? 100
        : 0;

  return {
    estimated,
    actual,
    inputTokenDeviation,
    outputTokenDeviation,
    costDeviation,
    costDeviationPercent,
  };
}
