// ---------------------------------------------------------------------------
// @thinkora/worker — Summary generation job
// ---------------------------------------------------------------------------

import type { SupabaseClient } from "@supabase/supabase-js";
import { OpenRouterClient, type ChatCompletionRequest } from "@thinkora/connectors";
import { createJobRunner } from "../lib/job-runner.js";
import {
  updateJobStatus,
  updateFileStatus,
  JobStatus,
} from "../lib/job-status.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GenerateSummaryData {
  fileId: string;
  jobId?: string;
  userId: string;
  /** Model to use for summarization. Falls back to a default. */
  model?: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_SUMMARY_MODEL = "anthropic/claude-sonnet-4";
const MAX_CONTENT_LENGTH = 100_000; // chars to pass to the model

const SUMMARY_SYSTEM_PROMPT = `You are an expert document summarizer. Produce a concise, well-structured summary that captures:
1. The document's main topic and purpose
2. Key findings, arguments, or data points
3. Notable conclusions or recommendations

Format the summary in markdown with appropriate headings. Keep it under 500 words.`;

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------

/**
 * Creates the summary generation job processor.
 *
 * Pipeline:
 * 1. Fetch the file's full text from parsed_artifacts
 * 2. Call an LLM to generate a summary
 * 3. Store the summary as a parsed artifact of type "summary"
 */
export function createGenerateSummaryJob(db: SupabaseClient | null) {
  return createJobRunner(
    "generate-summary",
    async (data: Record<string, unknown>) => {
      const input = data as unknown as GenerateSummaryData;

      if (!db) {
        console.log(
          `[generate-summary] (demo) Would generate summary for file ${input.fileId}`
        );
        return { status: "demo", fileId: input.fileId };
      }

      // ── 1. Fetch the file's full text ────────────────────────────
      if (input.jobId) {
        await updateJobStatus(db, input.jobId, JobStatus.Running, {
          stage: "fetching_content",
          progress: 10,
        });
      }

      const { data: artifacts, error: artifactError } = await db
        .from("parsed_artifacts")
        .select("content")
        .eq("file_id", input.fileId)
        .eq("artifact_type", "full_text")
        .limit(1)
        .single();

      if (artifactError || !artifacts?.content) {
        const errorMsg = artifactError?.message ?? "No parsed content found";
        if (input.jobId) {
          await updateJobStatus(db, input.jobId, JobStatus.Failed, {
            stage: "fetching_content",
            error: errorMsg,
          });
        }
        throw Object.assign(new Error(errorMsg), { code: "FILE_NOT_FOUND" });
      }

      const content = (artifacts.content as string).slice(
        0,
        MAX_CONTENT_LENGTH
      );

      // ── 2. Call LLM for summary ──────────────────────────────────
      if (input.jobId) {
        await updateJobStatus(db, input.jobId, JobStatus.Running, {
          stage: "generating",
          progress: 30,
        });
      }

      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        console.log(
          "[generate-summary] No OPENROUTER_API_KEY set, generating placeholder summary"
        );

        // Fallback: create a simple extractive summary
        const summary = createExtractSummary(content);

        await persistSummary(db, input.fileId, summary);

        if (input.jobId) {
          await updateJobStatus(db, input.jobId, JobStatus.Completed, {
            stage: "completed",
            progress: 100,
          });
        }

        return { fileId: input.fileId, summaryLength: summary.length, mode: "extractive" };
      }

      const client = new OpenRouterClient({
        apiKey,
        baseUrl: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
      });

      const model = input.model ?? DEFAULT_SUMMARY_MODEL;

      const request: ChatCompletionRequest = {
        model,
        messages: [
          { role: "system", content: SUMMARY_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Please summarize the following document:\n\n${content}`,
          },
        ],
        max_tokens: 1024,
      };

      const response = await client.chat(request);
      const summary =
        response.choices?.[0]?.message?.content ?? "Summary generation failed.";

      // ── 3. Persist summary as artifact ───────────────────────────
      if (input.jobId) {
        await updateJobStatus(db, input.jobId, JobStatus.Running, {
          stage: "storing",
          progress: 80,
        });
      }

      await persistSummary(db, input.fileId, summary);

      if (input.jobId) {
        await updateJobStatus(db, input.jobId, JobStatus.Completed, {
          stage: "completed",
          progress: 100,
          metadata: {
            model,
            summaryLength: summary.length,
            tokensUsed: response.usage
              ? response.usage.prompt_tokens + response.usage.completion_tokens
              : 0,
          },
        });
      }

      return {
        fileId: input.fileId,
        summaryLength: summary.length,
        model,
      };
    }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function persistSummary(
  db: SupabaseClient,
  fileId: string,
  summary: string
): Promise<void> {
  // Delete any existing summary artifact
  await db
    .from("parsed_artifacts")
    .delete()
    .eq("file_id", fileId)
    .eq("artifact_type", "summary");

  // Insert the new summary
  await db.from("parsed_artifacts").insert({
    file_id: fileId,
    artifact_type: "summary",
    content: summary,
    metadata: { generatedAt: new Date().toISOString() },
  });
}

/**
 * Creates a simple extractive summary by taking the first few sentences
 * when no API key is available.
 */
function createExtractSummary(text: string): string {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const topSentences = sentences.slice(0, 5);
  return `## Summary\n\n${topSentences.join(". ")}.\n\n*This is an extractive summary generated without an AI model.*`;
}
