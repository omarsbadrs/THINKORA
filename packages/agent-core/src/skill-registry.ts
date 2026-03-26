// ---------------------------------------------------------------------------
// @thinkora/agent-core — Skill registry
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  Logger,
  SkillDefinition,
  SkillExecutionResult,
  SkillHandler,
} from "./types";
import { SkillNotFoundError } from "./errors";

/**
 * Central registry of agent skills.
 *
 * Skills are registered at application startup and invoked by the Orchestrator
 * during plan execution.  Each skill has a static {@link SkillDefinition} and
 * an async handler function that performs the actual work.
 */
export class SkillRegistry {
  private readonly definitions = new Map<string, SkillDefinition>();
  private readonly handlers = new Map<string, SkillHandler>();
  private readonly logger: Logger;

  constructor(params: { logger: Logger }) {
    this.logger = params.logger;
  }

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  /** Register a skill definition together with its handler. */
  register(skill: SkillDefinition, handler: SkillHandler): void {
    if (this.definitions.has(skill.id)) {
      this.logger.warn(`Skill "${skill.id}" is being re-registered — previous handler will be replaced`);
    }
    this.definitions.set(skill.id, skill);
    this.handlers.set(skill.id, handler);
    this.logger.info(`Skill registered: ${skill.id}`, {
      name: skill.name,
      toolDependencies: skill.toolDependencies,
    });
  }

  // -----------------------------------------------------------------------
  // Lookups
  // -----------------------------------------------------------------------

  /** Retrieve a skill definition by id, or undefined if not registered. */
  get(skillId: string): SkillDefinition | undefined {
    return this.definitions.get(skillId);
  }

  /** Return all registered skill definitions. */
  list(): SkillDefinition[] {
    return Array.from(this.definitions.values());
  }

  /** Check whether a skill id is registered. */
  has(skillId: string): boolean {
    return this.definitions.has(skillId);
  }

  // -----------------------------------------------------------------------
  // Execution
  // -----------------------------------------------------------------------

  /**
   * Execute a skill by id.
   *
   * @throws {SkillNotFoundError} if the skill is not registered.
   */
  async execute(
    skillId: string,
    input: unknown,
    context: AgentContext,
  ): Promise<SkillExecutionResult> {
    const handler = this.handlers.get(skillId);
    if (!handler) {
      throw new SkillNotFoundError(skillId);
    }

    const start = Date.now();
    this.logger.debug(`Executing skill "${skillId}"`, { input });

    try {
      const output = await handler(input, context);
      const duration = Date.now() - start;

      this.logger.info(`Skill "${skillId}" completed in ${duration}ms`);

      return {
        skillId,
        output,
        duration,
        success: true,
      };
    } catch (err) {
      const duration = Date.now() - start;
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      this.logger.error(`Skill "${skillId}" failed after ${duration}ms: ${errorMessage}`);

      return {
        skillId,
        output: null,
        duration,
        success: false,
        error: errorMessage,
      };
    }
  }
}
