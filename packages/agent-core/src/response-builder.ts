// ---------------------------------------------------------------------------
// @thinkora/agent-core — Response builder
// ---------------------------------------------------------------------------

import type { Citation } from "@thinkora/ui-contracts";
import type {
  AgentContext,
  AgentResponse,
  ConfidenceScore,
  ToolCallResult,
} from "./types";
import { MAX_RESPONSE_TOKENS } from "./policies";

// ---------------------------------------------------------------------------
// ResponseBuilder
// ---------------------------------------------------------------------------

/**
 * Assembles the final {@link AgentResponse} from the various artefacts
 * produced during plan execution: LLM output, citations, tool call
 * results, and confidence assessment.
 */
export class ResponseBuilder {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Build a complete agent response.
   *
   * @param params.llmOutput     Raw text returned by the LLM.
   * @param params.citations     Citations linked to retrieved chunks.
   * @param params.confidence    Confidence assessment.
   * @param params.context       The original agent context.
   * @param params.toolCalls     Results of any tool invocations.
   * @param params.modelUsed     Model slug selected by the user.
   * @param params.actualModel   Model slug that actually served the request.
   * @param params.tokensInput   Number of prompt tokens consumed.
   * @param params.tokensOutput  Number of completion tokens produced.
   * @param params.latencyMs     End-to-end wall-clock time.
   */
  buildResponse(params: {
    llmOutput: string;
    citations: Citation[];
    confidence: ConfidenceScore;
    context: AgentContext;
    toolCalls: ToolCallResult[];
    modelUsed?: string;
    actualModel?: string;
    tokensInput?: number;
    tokensOutput?: number;
    latencyMs?: number;
  }): AgentResponse {
    const {
      llmOutput,
      citations,
      confidence,
      context,
      toolCalls,
      modelUsed = context.selectedModel,
      actualModel = context.selectedModel,
      tokensInput = 0,
      tokensOutput = 0,
      latencyMs = 0,
    } = params;

    // --- Format content with citation markers ---
    const content = this.insertCitationMarkers(llmOutput, citations);

    // --- Add next-step suggestions when appropriate ---
    const metadata: Record<string, unknown> = {};
    const suggestions = this.generateSuggestions(content, citations, toolCalls, context);
    if (suggestions.length > 0) {
      metadata.suggestedFollowUps = suggestions;
    }

    // --- Flag whether the response was truncated ---
    if (tokensOutput >= MAX_RESPONSE_TOKENS) {
      metadata.truncated = true;
    }

    // --- Mark the boundary between inference and fact ---
    metadata.hasFactualContent = citations.length > 0;
    metadata.inferredOnly = citations.length === 0;

    return {
      content,
      citations,
      toolCalls,
      confidence,
      modelUsed,
      actualModel,
      tokensUsed: { input: tokensInput, output: tokensOutput },
      latencyMs,
      metadata,
    };
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /**
   * Inject inline citation markers (e.g. `[1]`, `[2]`) into the LLM text
   * when citation source names appear in the content.
   */
  private insertCitationMarkers(
    text: string,
    citations: Citation[],
  ): string {
    if (citations.length === 0) return text;

    let annotated = text;

    for (let i = 0; i < citations.length; i++) {
      const cite = citations[i];
      const marker = `[${i + 1}]`;

      // If the LLM already inserted the marker, skip
      if (annotated.includes(marker)) continue;

      // Attempt to place the marker after the first sentence that
      // references the citation's source name or section title.
      const needle = cite.sectionTitle ?? cite.sourceName;
      const idx = annotated.toLowerCase().indexOf(needle.toLowerCase());
      if (idx !== -1) {
        // Find the end of the sentence containing the reference
        const sentenceEnd = this.findSentenceEnd(annotated, idx);
        annotated =
          annotated.slice(0, sentenceEnd) +
          marker +
          annotated.slice(sentenceEnd);
      }
    }

    return annotated;
  }

  /** Find the character position immediately after the current sentence. */
  private findSentenceEnd(text: string, from: number): number {
    const sentenceEnders = [".", "!", "?", "\n"];
    for (let i = from; i < text.length; i++) {
      if (sentenceEnders.includes(text[i])) {
        return i + 1;
      }
    }
    return text.length;
  }

  /**
   * Generate follow-up suggestions based on what happened in the response.
   */
  private generateSuggestions(
    _content: string,
    citations: Citation[],
    toolCalls: ToolCallResult[],
    context: AgentContext,
  ): string[] {
    const suggestions: string[] = [];

    // If we retrieved from some but not all sources, suggest expanding
    const queriedSources = new Set(
      toolCalls
        .filter((tc) => tc.status === "completed")
        .map((tc) => tc.toolName.replace("search_", "").replace("query_", "")),
    );
    const unqueried = context.availableSources.filter(
      (s) => !queriedSources.has(s),
    );
    if (unqueried.length > 0) {
      suggestions.push(
        `Search additional sources: ${unqueried.join(", ")}`,
      );
    }

    // If we have citations, suggest deeper dive
    if (citations.length > 0) {
      suggestions.push("Ask for a more detailed analysis of these sources");
    }

    // If tool calls failed, suggest retrying
    const failed = toolCalls.filter((tc) => tc.status === "failed");
    if (failed.length > 0) {
      suggestions.push(
        `Retry failed operations: ${failed.map((f) => f.toolName).join(", ")}`,
      );
    }

    return suggestions;
  }
}
