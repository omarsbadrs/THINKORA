// ---------------------------------------------------------------------------
// @thinkora/api — ChatService
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoutingMode, Citation, StreamEvent } from "@thinkora/ui-contracts";
import type { Orchestrator, AgentContext, AgentResponse } from "@thinkora/agent-core";
import type { ModelRoutingService } from "../models/model-routing.service.js";
import type { ModelLoggingService } from "../models/model-logging.service.js";
import { MessageService } from "./message.service.js";
import type {
  ChatStreamEvent,
  DoneEvent,
} from "./stream-events.js";
import { v4 as uuidv4 } from "uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HandleMessageParams {
  userId: string;
  conversationId: string;
  content: string;
  modelSelection?: {
    selectedModel?: string;
    routingMode?: RoutingMode;
  };
}

export interface ChatResponse {
  message: {
    id: string;
    conversationId: string;
    role: "assistant";
    content: string;
    createdAt: string;
  };
  citations: Citation[];
  modelUsed: string;
  actualModel: string;
  tokensUsed: { input: number; output: number };
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Demo canned responses
// ---------------------------------------------------------------------------

const CANNED_RESPONSES = [
  "I'm Thinkora, your AI command center. I can help you analyze documents, query databases, and answer questions using your workspace data. How can I assist you today?",
  "Based on the information available in your workspace, I can provide a comprehensive analysis. Let me know if you'd like me to dive deeper into any specific aspect.",
  "That's a great question! I've searched through your connected data sources and here's what I found. Let me know if you need more detail.",
  "I've analyzed the relevant documents and here are the key insights. I can also pull up the source materials if you'd like to verify any of these points.",
  "I'm processing your request now. Based on the context from your files and connected services, here is my analysis.",
];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class ChatService {
  private readonly messageService: MessageService;

  constructor(
    private readonly params: {
      db: SupabaseClient;
      orchestrator: Orchestrator | null;
      modelRouter: ModelRoutingService | null;
      modelLogger: ModelLoggingService | null;
    }
  ) {
    this.messageService = new MessageService(params.db);
  }

  // -----------------------------------------------------------------------
  // Non-streaming
  // -----------------------------------------------------------------------

  /**
   * Handle a user message: persist it, invoke the orchestrator, persist the
   * assistant response and its citations, log model usage, and return a
   * structured ChatResponse.
   */
  async handleMessage(params: HandleMessageParams): Promise<ChatResponse> {
    const start = Date.now();

    // 1. Persist the user message
    const userMsg = await this.messageService.create({
      conversationId: params.conversationId,
      role: "user",
      content: params.content,
    });

    // 2. Demo mode — return a canned response
    if (!this.params.orchestrator) {
      return this.buildDemoResponse(params, start);
    }

    // 3. Build AgentContext
    const context = await this.buildAgentContext(params);

    // 4. Invoke orchestrator
    const agentResponse: AgentResponse =
      await this.params.orchestrator.processMessage(context);

    // 5. Persist assistant message
    const assistantMsg = await this.messageService.create({
      conversationId: params.conversationId,
      role: "assistant",
      content: agentResponse.content,
      modelUsed: agentResponse.modelUsed,
      actualModel: agentResponse.actualModel,
      tokensInput: agentResponse.tokensUsed.input,
      tokensOutput: agentResponse.tokensUsed.output,
      latencyMs: agentResponse.latencyMs,
      metadata: agentResponse.metadata,
    });

    // 6. Persist citations
    const citationInputs = agentResponse.citations.map((c) => ({
      sourceType: c.sourceType,
      sourceName: c.sourceName,
      sourceId: c.sourceId,
      chunkText: c.chunkText,
      relevanceScore: c.relevanceScore,
      pageNumber: c.pageNumber,
      sectionTitle: c.sectionTitle,
    }));

    const savedCitations = await this.messageService.addCitations(
      assistantMsg.id,
      citationInputs
    );

    // 7. Log model usage (fire-and-forget)
    this.logUsage(params, agentResponse, start).catch(() => {});

    // 8. Build response
    const latencyMs = Date.now() - start;

    return {
      message: {
        id: assistantMsg.id,
        conversationId: params.conversationId,
        role: "assistant",
        content: agentResponse.content,
        createdAt: assistantMsg.created_at,
      },
      citations: agentResponse.citations.map((c, idx) => ({
        ...c,
        id: savedCitations[idx]?.id ?? c.id,
        messageId: assistantMsg.id,
      })),
      modelUsed: agentResponse.modelUsed,
      actualModel: agentResponse.actualModel,
      tokensUsed: agentResponse.tokensUsed,
      latencyMs,
    };
  }

  // -----------------------------------------------------------------------
  // Streaming
  // -----------------------------------------------------------------------

  /**
   * Streaming variant of handleMessage. Yields ChatStreamEvents as they
   * are produced by the orchestrator. Persists the final response on
   * completion.
   */
  async *handleStreamMessage(
    params: HandleMessageParams
  ): AsyncGenerator<ChatStreamEvent> {
    const start = Date.now();

    // Persist user message
    await this.messageService.create({
      conversationId: params.conversationId,
      role: "user",
      content: params.content,
    });

    // Demo mode
    if (!this.params.orchestrator) {
      yield* this.streamDemoResponse(params);
      return;
    }

    // Build context and stream
    const context = await this.buildAgentContext(params);
    const stream = this.params.orchestrator.processMessageStream(context);

    const collectedTokens: string[] = [];
    const collectedCitations: Citation[] = [];
    let modelUsed = context.selectedModel;
    let actualModel = context.selectedModel;
    let tokensInput = 0;
    let tokensOutput = 0;

    for await (const event of stream) {
      // Map internal StreamEvents to ChatStreamEvents
      switch (event.type) {
        case "token": {
          const content = typeof event.data === "string" ? event.data : "";
          collectedTokens.push(content);
          yield { type: "token", content };
          break;
        }

        case "tool_start": {
          const toolData = event.data as Record<string, unknown>;
          yield {
            type: "tool_start",
            toolName: (toolData.toolName as string) ?? (toolData.skillId as string) ?? "unknown",
          };
          break;
        }

        case "tool_end": {
          const endData = event.data as Record<string, unknown>;
          yield {
            type: "tool_end",
            toolName: (endData.toolName as string) ?? (endData.skillId as string) ?? "unknown",
            success: endData.success !== false,
            output: endData.output,
          };
          break;
        }

        case "citation": {
          const cite = event.data as Citation;
          collectedCitations.push(cite);
          yield { type: "citation", citation: cite };
          break;
        }

        case "done": {
          const doneData = event.data as Record<string, unknown>;
          if (typeof doneData.latencyMs === "number") {
            // Done event — extract final stats
          }
          break;
        }
      }
    }

    const fullContent = collectedTokens.join("");
    const latencyMs = Date.now() - start;

    // Persist assistant message
    const assistantMsg = await this.messageService.create({
      conversationId: params.conversationId,
      role: "assistant",
      content: fullContent,
      modelUsed,
      actualModel,
      tokensInput,
      tokensOutput,
      latencyMs,
    });

    // Persist citations
    if (collectedCitations.length > 0) {
      await this.messageService.addCitations(
        assistantMsg.id,
        collectedCitations.map((c) => ({
          sourceType: c.sourceType,
          sourceName: c.sourceName,
          sourceId: c.sourceId,
          chunkText: c.chunkText,
          relevanceScore: c.relevanceScore,
          pageNumber: c.pageNumber,
          sectionTitle: c.sectionTitle,
        }))
      );
    }

    // Emit done event
    const doneEvent: DoneEvent = {
      type: "done",
      tokensInput,
      tokensOutput,
      latencyMs,
      modelUsed,
      actualModel,
    };
    yield doneEvent;

    // Log usage (fire-and-forget)
    this.logUsage(
      params,
      {
        content: fullContent,
        modelUsed,
        actualModel,
        tokensUsed: { input: tokensInput, output: tokensOutput },
        latencyMs,
        citations: collectedCitations,
        toolCalls: [],
        confidence: { overall: 0, dimensions: {} },
        metadata: {},
      },
      start
    ).catch(() => {});
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Build an AgentContext from the incoming request params.
   */
  private async buildAgentContext(
    params: HandleMessageParams
  ): Promise<AgentContext> {
    const selectedModel =
      params.modelSelection?.selectedModel ?? "anthropic/claude-sonnet-4";
    const routingMode = params.modelSelection?.routingMode ?? "balanced";

    return {
      userId: params.userId,
      workspaceId: "", // resolved from user profile if needed
      conversationId: params.conversationId,
      messageContent: params.content,
      selectedModel,
      routingMode,
      availableSources: ["files", "notion", "supabase"],
      sessionMemory: {},
    };
  }

  /**
   * Build a canned demo response without calling the orchestrator.
   */
  private async buildDemoResponse(
    params: HandleMessageParams,
    startTime: number
  ): Promise<ChatResponse> {
    const content =
      CANNED_RESPONSES[Math.floor(Math.random() * CANNED_RESPONSES.length)];

    const assistantMsg = await this.messageService.create({
      conversationId: params.conversationId,
      role: "assistant",
      content,
      modelUsed: "demo/thinkora-demo",
      actualModel: "demo/thinkora-demo",
      tokensInput: 0,
      tokensOutput: 0,
      latencyMs: Date.now() - startTime,
    });

    return {
      message: {
        id: assistantMsg.id,
        conversationId: params.conversationId,
        role: "assistant",
        content,
        createdAt: assistantMsg.created_at,
      },
      citations: [],
      modelUsed: "demo/thinkora-demo",
      actualModel: "demo/thinkora-demo",
      tokensUsed: { input: 0, output: 0 },
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Stream a canned demo response word-by-word.
   */
  private async *streamDemoResponse(
    params: HandleMessageParams
  ): AsyncGenerator<ChatStreamEvent> {
    const content =
      CANNED_RESPONSES[Math.floor(Math.random() * CANNED_RESPONSES.length)];

    // Simulate streaming by yielding word-by-word
    const words = content.split(" ");
    for (let i = 0; i < words.length; i++) {
      const token = i === 0 ? words[i] : " " + words[i];
      yield { type: "token", content: token };
    }

    // Persist
    await this.messageService.create({
      conversationId: params.conversationId,
      role: "assistant",
      content,
      modelUsed: "demo/thinkora-demo",
      actualModel: "demo/thinkora-demo",
    });

    yield {
      type: "done",
      tokensInput: 0,
      tokensOutput: 0,
      latencyMs: 0,
      modelUsed: "demo/thinkora-demo",
      actualModel: "demo/thinkora-demo",
    };
  }

  /**
   * Log model usage to the ModelLoggingService.
   */
  private async logUsage(
    params: HandleMessageParams,
    response: Pick<
      AgentResponse,
      "modelUsed" | "actualModel" | "tokensUsed" | "latencyMs"
    >,
    startTime: number
  ): Promise<void> {
    if (!this.params.modelLogger) return;

    await this.params.modelLogger.logUsage({
      requestId: uuidv4(),
      userId: params.userId,
      selectedModel: response.modelUsed,
      actualModel: response.actualModel,
      routingMode: params.modelSelection?.routingMode ?? "balanced",
      tokensInput: response.tokensUsed.input,
      tokensOutput: response.tokensUsed.output,
      costUsd: 0, // computed by logging service from token counts
      latencyMs: response.latencyMs,
      status: "success",
      taskType: "chat",
      fallbackUsed: response.modelUsed !== response.actualModel,
    });
  }
}
