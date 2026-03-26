// ---------------------------------------------------------------------------
// @thinkora/agent-core — Rule-based planner
// ---------------------------------------------------------------------------

import type { AgentContext, AgentPlan, PlanStep } from "./types";
import type { SkillRegistry } from "./skill-registry";

// ---------------------------------------------------------------------------
// Keyword / pattern helpers
// ---------------------------------------------------------------------------

/** Simple keyword sets used by the rule engine. */
const NOTION_KEYWORDS = [
  "notion", "page", "wiki", "knowledge base", "workspace doc",
];
const DATABASE_KEYWORDS = [
  "database", "sql", "table", "query", "supabase", "rows", "records",
];
const FILE_KEYWORDS = [
  "file", "upload", "document", "pdf", "csv", "xlsx", "spreadsheet",
];
const SPREADSHEET_KEYWORDS = [
  "csv", "xlsx", "spreadsheet", "columns", "rows", "data table",
];
const REPORT_KEYWORDS = [
  "report", "summary", "executive summary", "analysis report",
];
const COMPARE_KEYWORDS = [
  "compare", "versus", "vs", "difference", "contrast",
];
const MODEL_KEYWORDS = [
  "model", "which model", "best model", "recommend model",
  "compare models", "model for",
];

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

/**
 * Deterministic, rule-based planner.
 *
 * Examines the user query and the available sources / skills to produce an
 * ordered {@link AgentPlan}.  This is intentionally **not** LLM-based so that
 * planning itself incurs zero latency and zero cost.
 */
export class Planner {
  private readonly skillRegistry: SkillRegistry;

  constructor(params: { skillRegistry: SkillRegistry }) {
    this.skillRegistry = params.skillRegistry;
  }

  /** Build an execution plan for the given context. */
  createPlan(context: AgentContext): AgentPlan {
    const steps: PlanStep[] = [];
    const reasons: string[] = [];
    const query = context.messageContent;
    const sources = new Set(context.availableSources);

    // ----- 1. Retrieval planning skill (breaks query into sub-queries) -----
    if (this.skillRegistry.has("retrieval-planner")) {
      steps.push({
        type: "analyze",
        skillId: "retrieval-planner",
        params: { query, availableSources: context.availableSources },
      });
      reasons.push("Running retrieval planner to decompose the query");
    }

    // ----- 2. Source retrieval ------------------------------------------
    if (sources.has("files") && containsAny(query, FILE_KEYWORDS)) {
      steps.push({ type: "retrieve", source: "files", query });
      reasons.push("Searching uploaded files");
    }

    if (sources.has("notion") && containsAny(query, NOTION_KEYWORDS)) {
      steps.push({ type: "retrieve", source: "notion", query });
      reasons.push("Searching Notion workspace");
    }

    if (sources.has("supabase") && containsAny(query, DATABASE_KEYWORDS)) {
      steps.push({ type: "retrieve", source: "supabase", query });
      reasons.push("Querying Supabase database");
    }

    // If no specific source matched but sources are available, search all
    if (
      steps.filter((s) => s.type === "retrieve").length === 0 &&
      sources.size > 0
    ) {
      for (const src of sources) {
        steps.push({ type: "retrieve", source: src, query });
      }
      reasons.push("No specific source matched — searching all available sources");
    }

    // ----- 3. Specialist analysis skills --------------------------------
    if (containsAny(query, SPREADSHEET_KEYWORDS) && this.skillRegistry.has("spreadsheet-analyst")) {
      steps.push({
        type: "analyze",
        skillId: "spreadsheet-analyst",
        params: { query },
      });
      reasons.push("Invoking spreadsheet analysis skill");
    }

    if (containsAny(query, NOTION_KEYWORDS) && this.skillRegistry.has("notion-analyst")) {
      steps.push({
        type: "analyze",
        skillId: "notion-analyst",
        params: { query },
      });
      reasons.push("Invoking Notion analyst skill");
    }

    if (containsAny(query, DATABASE_KEYWORDS) && this.skillRegistry.has("supabase-analyst")) {
      steps.push({
        type: "analyze",
        skillId: "supabase-analyst",
        params: { query },
      });
      reasons.push("Invoking Supabase analyst skill");
    }

    if (containsAny(query, FILE_KEYWORDS) && this.skillRegistry.has("file-analyst")) {
      steps.push({
        type: "analyze",
        skillId: "file-analyst",
        params: { query },
      });
      reasons.push("Invoking file analyst skill");
    }

    if (containsAny(query, MODEL_KEYWORDS) && this.skillRegistry.has("model-analyst")) {
      steps.push({
        type: "analyze",
        skillId: "model-analyst",
        params: { query },
      });
      reasons.push("Invoking model analyst skill");
    }

    // ----- 4. Cross-source synthesis ------------------------------------
    const retrievalCount = steps.filter((s) => s.type === "retrieve").length;
    if (retrievalCount > 1 && this.skillRegistry.has("research-synthesis")) {
      steps.push({
        type: "analyze",
        skillId: "research-synthesis",
        params: { query },
      });
      reasons.push("Synthesizing results from multiple sources");
    }

    // ----- 5. Report generation -----------------------------------------
    if (containsAny(query, REPORT_KEYWORDS) && this.skillRegistry.has("report-generator")) {
      steps.push({
        type: "analyze",
        skillId: "report-generator",
        params: {
          query,
          mode: containsAny(query, COMPARE_KEYWORDS)
            ? "comparison"
            : containsAny(query, ["executive"])
              ? "executive_summary"
              : "detailed_analysis",
        },
      });
      reasons.push("Generating structured report");
    }

    // ----- 6. Citation building -----------------------------------------
    if (this.skillRegistry.has("citation-builder")) {
      steps.push({
        type: "analyze",
        skillId: "citation-builder",
        params: { query },
      });
      reasons.push("Building citations from retrieved sources");
    }

    // ----- 7. Memory management -----------------------------------------
    if (this.skillRegistry.has("memory-manager")) {
      steps.push({
        type: "analyze",
        skillId: "memory-manager",
        params: { query, sessionMemory: context.sessionMemory },
      });
      reasons.push("Consulting session memory");
    }

    // ----- 8. Final LLM response ----------------------------------------
    steps.push({ type: "respond" });
    reasons.push("Generating final LLM response");

    return {
      steps,
      reasoning: reasons.join(". ") + ".",
    };
  }
}
