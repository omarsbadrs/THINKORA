// ---------------------------------------------------------------------------
// @thinkora/agent-core — Orchestrator
// ---------------------------------------------------------------------------

import type { Citation, StreamEvent } from "@thinkora/ui-contracts";
import type {
  AgentContext,
  AgentResponse,
  ConfidenceScore,
  Logger,
  ToolCallResult,
} from "./types";
import type { SkillRegistry } from "./skill-registry";
import type { ToolRuntime } from "./tool-runtime";
import type { ResponseBuilder } from "./response-builder";
import { Planner } from "./planner";
import {
  MAX_RETRIEVAL_CHUNKS,
  MAX_TOOL_CALLS_PER_REQUEST,
} from "./policies";
import { AgentError, BudgetExceededError } from "./errors";

// ---------------------------------------------------------------------------
// Interfaces consumed by the Orchestrator
// ---------------------------------------------------------------------------

/** Model router — selects and calls the LLM. */
export interface ModelRouter {
  /** Pick the best model for the task and call it, returning raw text. */
  chat(params: {
    model: string;
    routingMode: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  }): Promise<{
    content: string;
    model: string;
    actualModel: string;
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
  }>;

  /** Streaming variant. */
  chatStream?(params: {
    model: string;
    routingMode: string;
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
  }): AsyncGenerator<StreamEvent>;
}

/** Retrieval service — fetches relevant chunks. */
export interface RetrievalService {
  retrieve(params: {
    query: string;
    source: string;
    workspaceId: string;
    maxChunks: number;
  }): Promise<RetrievedChunk[]>;
}

/** A single chunk returned by the retrieval service. */
export interface RetrievedChunk {
  text: string;
  source: string;
  sourceId: string;
  sourceName: string;
  relevanceScore: number;
  pageNumber?: number;
  sectionTitle?: string;
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

/**
 * Top-level agent orchestrator.
 *
 * Given a user message wrapped in an {@link AgentContext}, the orchestrator:
 * 1. Classifies intent / task type
 * 2. Plans retrieval sources
 * 3. Plans model selection
 * 4. Executes retrieval
 * 5. Executes skills
 * 6. Calls the LLM with context + retrieved data
 * 7. Builds citations
 * 8. Computes confidence
 * 9. Assembles and returns the final {@link AgentResponse}
 */
export class Orchestrator {
  private readonly modelRouter: ModelRouter;
  private readonly retrieval: RetrievalService;
  private readonly skillRegistry: SkillRegistry;
  private readonly toolRuntime: ToolRuntime;
  private readonly responseBuilder: ResponseBuilder;
  private readonly logger: Logger;
  private readonly planner: Planner;

  constructor(params: {
    modelRouter: ModelRouter;
    retrieval: RetrievalService;
    skillRegistry: SkillRegistry;
    toolRuntime: ToolRuntime;
    responseBuilder: ResponseBuilder;
    logger: Logger;
  }) {
    this.modelRouter = params.modelRouter;
    this.retrieval = params.retrieval;
    this.skillRegistry = params.skillRegistry;
    this.toolRuntime = params.toolRuntime;
    this.responseBuilder = params.responseBuilder;
    this.logger = params.logger;
    this.planner = new Planner({ skillRegistry: this.skillRegistry });
  }

  // -----------------------------------------------------------------------
  // Non-streaming entry point
  // -----------------------------------------------------------------------

  async processMessage(context: AgentContext): Promise<AgentResponse> {
    const overallStart = Date.now();
    this.logger.info("Processing message", {
      conversationId: context.conversationId,
      userId: context.userId,
    });

    // --- 1. Plan execution -----------------------------------------------
    const plan = this.planner.createPlan(context);
    this.logger.debug("Plan created", { reasoning: plan.reasoning, stepCount: plan.steps.length });

    // Accumulators
    const allChunks: RetrievedChunk[] = [];
    const allToolCalls: ToolCallResult[] = [];
    const skillOutputs: Record<string, unknown> = {};
    let toolCallCount = 0;

    // --- 2-5. Execute plan steps in order --------------------------------
    for (const step of plan.steps) {
      // Guard: do not exceed tool call budget
      if (toolCallCount >= MAX_TOOL_CALLS_PER_REQUEST) {
        this.logger.warn("Tool call budget exhausted — skipping remaining steps");
        break;
      }

      switch (step.type) {
        case "retrieve": {
          if (!step.source || !step.query) break;
          try {
            const chunks = await this.retrieval.retrieve({
              query: step.query,
              source: step.source,
              workspaceId: context.workspaceId,
              maxChunks: MAX_RETRIEVAL_CHUNKS,
            });
            allChunks.push(...chunks);
            toolCallCount++;
            this.logger.debug(`Retrieved ${chunks.length} chunks from ${step.source}`);
          } catch (err) {
            this.logger.error(`Retrieval from ${step.source} failed`, {
              error: err instanceof Error ? err.message : String(err),
            });
          }
          break;
        }

        case "tool": {
          const toolName = step.params?.toolName as string | undefined;
          if (!toolName) break;
          const result = await this.toolRuntime.executeTool(
            toolName,
            step.params,
            context,
          );
          allToolCalls.push(result);
          toolCallCount++;
          break;
        }

        case "analyze": {
          if (!step.skillId) break;
          const skillResult = await this.skillRegistry.execute(
            step.skillId,
            { ...(step.params ?? {}), retrievedChunks: allChunks },
            context,
          );
          skillOutputs[step.skillId] = skillResult.output;
          toolCallCount++;
          break;
        }

        case "respond":
          // handled below
          break;
      }
    }

    // --- 6. Call LLM with context + retrieved data -----------------------
    const systemPrompt = this.buildSystemPrompt(allChunks, skillOutputs);
    const llmResult = await this.modelRouter.chat({
      model: context.selectedModel,
      routingMode: context.routingMode,
      systemPrompt,
      userPrompt: context.messageContent,
      maxTokens: 4096,
    });

    // --- 7. Build citations ----------------------------------------------
    const citations = this.buildCitations(allChunks, context.conversationId);

    // --- 8. Compute confidence -------------------------------------------
    const confidence = this.computeConfidence(allChunks, citations, llmResult.content);

    // --- 9. Assemble response --------------------------------------------
    const latencyMs = Date.now() - overallStart;

    return this.responseBuilder.buildResponse({
      llmOutput: llmResult.content,
      citations,
      confidence,
      context,
      toolCalls: allToolCalls,
      modelUsed: llmResult.model,
      actualModel: llmResult.actualModel,
      tokensInput: llmResult.tokensInput,
      tokensOutput: llmResult.tokensOutput,
      latencyMs,
    });
  }

  // -----------------------------------------------------------------------
  // Streaming entry point
  // -----------------------------------------------------------------------

  async *processMessageStream(
    context: AgentContext,
  ): AsyncGenerator<StreamEvent> {
    const overallStart = Date.now();
    this.logger.info("Processing message (streaming)", {
      conversationId: context.conversationId,
    });

    // --- Plan & execute retrieval / skills up-front ----------------------
    const plan = this.planner.createPlan(context);
    const allChunks: RetrievedChunk[] = [];
    const allToolCalls: ToolCallResult[] = [];
    const skillOutputs: Record<string, unknown> = {};
    let toolCallCount = 0;

    for (const step of plan.steps) {
      if (toolCallCount >= MAX_TOOL_CALLS_PER_REQUEST) break;

      if (step.type === "retrieve" && step.source && step.query) {
        try {
          const chunks = await this.retrieval.retrieve({
            query: step.query,
            source: step.source,
            workspaceId: context.workspaceId,
            maxChunks: MAX_RETRIEVAL_CHUNKS,
          });
          allChunks.push(...chunks);
          toolCallCount++;
        } catch {
          // retrieval failures are non-fatal in streaming mode
        }
      }

      if (step.type === "tool" && step.params?.toolName) {
        yield { type: "tool_start", data: { toolName: step.params.toolName } };
        const result = await this.toolRuntime.executeTool(
          step.params.toolName as string,
          step.params,
          context,
        );
        allToolCalls.push(result);
        toolCallCount++;
        yield { type: "tool_end", data: result };
      }

      if (step.type === "analyze" && step.skillId) {
        yield { type: "tool_start", data: { skillId: step.skillId } };
        const skillResult = await this.skillRegistry.execute(
          step.skillId,
          { ...(step.params ?? {}), retrievedChunks: allChunks },
          context,
        );
        skillOutputs[step.skillId] = skillResult.output;
        toolCallCount++;
        yield { type: "tool_end", data: { skillId: step.skillId, success: skillResult.success } };
      }
    }

    // --- Stream LLM tokens -----------------------------------------------
    const systemPrompt = this.buildSystemPrompt(allChunks, skillOutputs);

    if (this.modelRouter.chatStream) {
      const stream = this.modelRouter.chatStream({
        model: context.selectedModel,
        routingMode: context.routingMode,
        systemPrompt,
        userPrompt: context.messageContent,
        maxTokens: 4096,
      });

      for await (const event of stream) {
        yield event;
      }
    } else {
      // Fallback: call non-streaming and emit a single token event
      const result = await this.modelRouter.chat({
        model: context.selectedModel,
        routingMode: context.routingMode,
        systemPrompt,
        userPrompt: context.messageContent,
        maxTokens: 4096,
      });
      yield { type: "token", data: result.content };
    }

    // --- Emit citations ---------------------------------------------------
    const citations = this.buildCitations(allChunks, context.conversationId);
    for (const cite of citations) {
      yield { type: "citation", data: cite };
    }

    // --- Done event -------------------------------------------------------
    yield {
      type: "done",
      data: {
        latencyMs: Date.now() - overallStart,
        toolCalls: allToolCalls,
      },
    };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /** Build the system prompt that includes retrieved context. */
  private buildSystemPrompt(
    chunks: RetrievedChunk[],
    skillOutputs: Record<string, unknown>,
  ): string {
    const parts: string[] = [
      "You are Thinkora, an AI assistant with access to the user's workspace data.",
      "Answer the user's question using the provided context. Cite your sources.",
      "If you don't have enough information, say so honestly.",
    ];

    if (chunks.length > 0) {
      parts.push("\n--- Retrieved Context ---");
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        parts.push(
          `\n[Source ${i + 1}: ${c.sourceName}${c.sectionTitle ? ` > ${c.sectionTitle}` : ""}]\n${c.text}`,
        );
      }
    }

    const skillKeys = Object.keys(skillOutputs);
    if (skillKeys.length > 0) {
      parts.push("\n--- Skill Analysis Results ---");
      for (const key of skillKeys) {
        parts.push(`\n[${key}]\n${JSON.stringify(skillOutputs[key], null, 2)}`);
      }
    }

    return parts.join("\n");
  }

  /** Map retrieved chunks to Citation objects. */
  private buildCitations(
    chunks: RetrievedChunk[],
    _conversationId: string,
  ): Citation[] {
    return chunks.map((chunk, idx) => {
      const sourceType = this.inferSourceType(chunk.source);
      return {
        id: `cite-${idx + 1}`,
        messageId: "", // filled in by the persistence layer
        sourceType,
        sourceName: chunk.sourceName,
        sourceId: chunk.sourceId,
        chunkText: chunk.text,
        relevanceScore: chunk.relevanceScore,
        pageNumber: chunk.pageNumber ?? null,
        sectionTitle: chunk.sectionTitle ?? null,
      };
    });
  }

  /** Map source identifier to CitationSourceType. */
  private inferSourceType(source: string): "file" | "notion" | "supabase" | "web" {
    if (source.includes("notion")) return "notion";
    if (source.includes("supabase") || source.includes("database")) return "supabase";
    if (source.includes("web")) return "web";
    return "file";
  }

  /** Heuristic confidence computation. */
  private computeConfidence(
    chunks: RetrievedChunk[],
    citations: Citation[],
    llmContent: string,
  ): ConfidenceScore {
    // Retrieval quality: average relevance of top chunks
    const avgRelevance =
      chunks.length > 0
        ? chunks.reduce((sum, c) => sum + c.relevanceScore, 0) / chunks.length
        : 0;

    // Citation coverage: ratio of cited text to total content length
    const citedChars = citations.reduce((s, c) => s + c.chunkText.length, 0);
    const citationCoverage =
      llmContent.length > 0
        ? Math.min(1, citedChars / llmContent.length)
        : 0;

    // Source diversity: how many distinct sources contributed
    const uniqueSources = new Set(chunks.map((c) => c.source)).size;
    const sourceDiversity = Math.min(1, uniqueSources / 3); // normalize to max 3 sources

    const overall =
      avgRelevance * 0.5 + citationCoverage * 0.3 + sourceDiversity * 0.2;

    return {
      overall: Math.round(overall * 100) / 100,
      dimensions: {
        retrieval_quality: Math.round(avgRelevance * 100) / 100,
        citation_coverage: Math.round(citationCoverage * 100) / 100,
        source_diversity: Math.round(sourceDiversity * 100) / 100,
      },
    };
  }
}
