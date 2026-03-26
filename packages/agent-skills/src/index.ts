// ---------------------------------------------------------------------------
// @thinkora/agent-skills — barrel export & registration
// ---------------------------------------------------------------------------

import type { SkillRegistry } from "@thinkora/agent-core";

// Skill definitions & handlers
import {
  RetrievalPlannerDefinition,
  RetrievalPlannerHandler,
} from "./retrieval-planner.skill";

import {
  NotionAnalystDefinition,
  NotionAnalystHandler,
} from "./notion-analyst.skill";

import {
  SupabaseAnalystDefinition,
  SupabaseAnalystHandler,
} from "./supabase-analyst.skill";

import {
  FileAnalystDefinition,
  FileAnalystHandler,
} from "./file-analyst.skill";

import {
  SpreadsheetAnalystDefinition,
  SpreadsheetAnalystHandler,
} from "./spreadsheet-analyst.skill";

import {
  ResearchSynthesisDefinition,
  ResearchSynthesisHandler,
} from "./research-synthesis.skill";

import {
  ReportGeneratorDefinition,
  ReportGeneratorHandler,
} from "./report-generator.skill";

import {
  CitationBuilderDefinition,
  CitationBuilderHandler,
} from "./citation-builder.skill";

import {
  MemoryManagerDefinition,
  MemoryManagerHandler,
} from "./memory-manager.skill";

import {
  AdminDiagnosticsDefinition,
  AdminDiagnosticsHandler,
} from "./admin-diagnostics.skill";

import {
  ModelAnalystDefinition,
  ModelAnalystHandler,
} from "./model-analyst.skill";

// ---------------------------------------------------------------------------
// Bulk registration
// ---------------------------------------------------------------------------

/**
 * Register all built-in skills with the given registry.
 *
 * Call this once at application startup after constructing the
 * {@link SkillRegistry} instance.
 */
export function registerAllSkills(registry: SkillRegistry): void {
  registry.register(RetrievalPlannerDefinition, RetrievalPlannerHandler);
  registry.register(NotionAnalystDefinition, NotionAnalystHandler);
  registry.register(SupabaseAnalystDefinition, SupabaseAnalystHandler);
  registry.register(FileAnalystDefinition, FileAnalystHandler);
  registry.register(SpreadsheetAnalystDefinition, SpreadsheetAnalystHandler);
  registry.register(ResearchSynthesisDefinition, ResearchSynthesisHandler);
  registry.register(ReportGeneratorDefinition, ReportGeneratorHandler);
  registry.register(CitationBuilderDefinition, CitationBuilderHandler);
  registry.register(MemoryManagerDefinition, MemoryManagerHandler);
  registry.register(AdminDiagnosticsDefinition, AdminDiagnosticsHandler);
  registry.register(ModelAnalystDefinition, ModelAnalystHandler);
}

// ---------------------------------------------------------------------------
// Re-exports
// ---------------------------------------------------------------------------

// Retrieval Planner
export { RetrievalPlannerDefinition, RetrievalPlannerHandler } from "./retrieval-planner.skill";

// Notion Analyst
export { NotionAnalystDefinition, NotionAnalystHandler } from "./notion-analyst.skill";

// Supabase Analyst
export { SupabaseAnalystDefinition, SupabaseAnalystHandler } from "./supabase-analyst.skill";

// File Analyst
export { FileAnalystDefinition, FileAnalystHandler } from "./file-analyst.skill";

// Spreadsheet Analyst
export { SpreadsheetAnalystDefinition, SpreadsheetAnalystHandler } from "./spreadsheet-analyst.skill";

// Research Synthesis
export { ResearchSynthesisDefinition, ResearchSynthesisHandler } from "./research-synthesis.skill";

// Report Generator
export { ReportGeneratorDefinition, ReportGeneratorHandler } from "./report-generator.skill";

// Citation Builder
export { CitationBuilderDefinition, CitationBuilderHandler } from "./citation-builder.skill";

// Memory Manager
export { MemoryManagerDefinition, MemoryManagerHandler } from "./memory-manager.skill";

// Admin Diagnostics
export { AdminDiagnosticsDefinition, AdminDiagnosticsHandler } from "./admin-diagnostics.skill";

// Model Analyst
export { ModelAnalystDefinition, ModelAnalystHandler } from "./model-analyst.skill";
