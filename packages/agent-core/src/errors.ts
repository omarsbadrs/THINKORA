// ---------------------------------------------------------------------------
// @thinkora/agent-core — Agent error hierarchy
// ---------------------------------------------------------------------------

/**
 * Base class for all agent-originated errors.
 * Carries a machine-readable `code` for programmatic handling.
 */
export class AgentError extends Error {
  public readonly code: string;

  constructor(message: string, code = "AGENT_ERROR") {
    super(message);
    this.name = "AgentError";
    this.code = code;
    // Maintain proper prototype chain in TS
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** A tool invocation exceeded its timeout cap. */
export class ToolTimeoutError extends AgentError {
  public readonly toolName: string;
  public readonly timeoutMs: number;

  constructor(toolName: string, timeoutMs: number) {
    super(
      `Tool "${toolName}" timed out after ${timeoutMs}ms`,
      "TOOL_TIMEOUT",
    );
    this.name = "ToolTimeoutError";
    this.toolName = toolName;
    this.timeoutMs = timeoutMs;
  }
}

/** A requested skill was not found in the registry. */
export class SkillNotFoundError extends AgentError {
  public readonly skillId: string;

  constructor(skillId: string) {
    super(
      `Skill "${skillId}" is not registered`,
      "SKILL_NOT_FOUND",
    );
    this.name = "SkillNotFoundError";
    this.skillId = skillId;
  }
}

/** The estimated cost of a request would exceed the configured budget. */
export class BudgetExceededError extends AgentError {
  public readonly estimatedCost: number;
  public readonly budget: number;

  constructor(estimatedCost: number, budget: number) {
    super(
      `Estimated cost $${estimatedCost.toFixed(4)} exceeds budget $${budget.toFixed(4)}`,
      "BUDGET_EXCEEDED",
    );
    this.name = "BudgetExceededError";
    this.estimatedCost = estimatedCost;
    this.budget = budget;
  }
}

/** A retrieval operation failed (e.g. connector unavailable). */
export class RetrievalError extends AgentError {
  public readonly source: string;

  constructor(source: string, cause?: string) {
    super(
      `Retrieval from "${source}" failed${cause ? `: ${cause}` : ""}`,
      "RETRIEVAL_ERROR",
    );
    this.name = "RetrievalError";
    this.source = source;
  }
}
