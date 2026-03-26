// ---------------------------------------------------------------------------
// @thinkora/agent-skills — Report Generator Skill
// ---------------------------------------------------------------------------

import type {
  AgentContext,
  SkillDefinition,
  SkillHandler,
} from "@thinkora/agent-core";

// ---------------------------------------------------------------------------
// Skill definition
// ---------------------------------------------------------------------------

export const ReportGeneratorDefinition: SkillDefinition = {
  id: "report-generator",
  name: "Report Generator",
  description:
    "Generates structured reports in multiple modes: executive summary, " +
    "detailed analysis, and comparison. Formats output with headings, " +
    "bullet points, and tables.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "User question or report request" },
      mode: {
        type: "string",
        enum: ["executive_summary", "detailed_analysis", "comparison"],
        description: "Report generation mode",
      },
      retrievedChunks: {
        type: "array",
        description: "Retrieved data to base the report on",
      },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      mode: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: {
            heading: { type: "string" },
            content: { type: "string" },
            bulletPoints: { type: "array", items: { type: "string" } },
            table: {
              type: "object",
              nullable: true,
              properties: {
                headers: { type: "array", items: { type: "string" } },
                rows: { type: "array", items: { type: "array" } },
              },
            },
          },
        },
      },
      generatedAt: { type: "string" },
      sourceCount: { type: "number" },
    },
  },
  toolDependencies: [],
  failureModes: [
    "Report may be incomplete if source data is sparse",
    "Formatting may not render properly in all clients",
    "Comparison mode requires at least two distinct entities to compare",
  ],
  observabilityMetadata: {
    category: "generation",
    costTier: "none",
    typicalLatencyMs: 30,
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RetrievedChunk {
  text: string;
  source: string;
  sourceId: string;
  sourceName: string;
  relevanceScore: number;
  sectionTitle?: string;
}

type ReportMode = "executive_summary" | "detailed_analysis" | "comparison";

interface ReportSection {
  heading: string;
  content: string;
  bulletPoints: string[];
  table: { headers: string[]; rows: string[][] } | null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const ReportGeneratorHandler: SkillHandler = async (
  input: unknown,
  _context: AgentContext,
): Promise<unknown> => {
  const {
    query,
    mode = "detailed_analysis",
    retrievedChunks = [],
  } = input as {
    query: string;
    mode?: ReportMode;
    retrievedChunks?: RetrievedChunk[];
  };

  const title = generateTitle(query, mode);

  let sections: ReportSection[];
  switch (mode) {
    case "executive_summary":
      sections = buildExecutiveSummary(query, retrievedChunks);
      break;
    case "comparison":
      sections = buildComparison(query, retrievedChunks);
      break;
    case "detailed_analysis":
    default:
      sections = buildDetailedAnalysis(query, retrievedChunks);
      break;
  }

  return {
    title,
    mode,
    sections,
    generatedAt: new Date().toISOString(),
    sourceCount: new Set(retrievedChunks.map((c) => c.sourceName)).size,
  };
};

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function buildExecutiveSummary(
  query: string,
  chunks: RetrievedChunk[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Overview
  sections.push({
    heading: "Overview",
    content: `This executive summary addresses: "${truncate(query, 120)}".`,
    bulletPoints: chunks
      .slice(0, 5)
      .map((c) => truncate(c.text, 150)),
    table: null,
  });

  // Key Findings
  const bySource = groupBySource(chunks);
  const findingBullets: string[] = [];
  for (const [sourceName, sourceChunks] of bySource) {
    const topChunk = sourceChunks[0];
    findingBullets.push(
      `**${sourceName}**: ${truncate(topChunk.text, 120)}`,
    );
  }

  sections.push({
    heading: "Key Findings",
    content: "",
    bulletPoints: findingBullets,
    table: null,
  });

  // Recommendations
  sections.push({
    heading: "Recommendations",
    content: "Based on the above findings, consider the following next steps:",
    bulletPoints: [
      "Review the cited sources for full context",
      "Validate key claims with primary data",
      "Identify action items arising from this analysis",
    ],
    table: null,
  });

  return sections;
}

function buildDetailedAnalysis(
  query: string,
  chunks: RetrievedChunk[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  // Introduction
  sections.push({
    heading: "Introduction",
    content:
      `Detailed analysis for: "${truncate(query, 120)}".\n\n` +
      `This report draws on ${chunks.length} data chunk(s) from ` +
      `${new Set(chunks.map((c) => c.sourceName)).size} source(s).`,
    bulletPoints: [],
    table: null,
  });

  // Source-by-source analysis
  const bySource = groupBySource(chunks);
  for (const [sourceName, sourceChunks] of bySource) {
    const bullets = sourceChunks.map(
      (c) =>
        `${c.sectionTitle ? `[${c.sectionTitle}] ` : ""}${truncate(c.text, 200)}`,
    );

    sections.push({
      heading: `Analysis: ${sourceName}`,
      content: `${sourceChunks.length} relevant section(s) found.`,
      bulletPoints: bullets,
      table: null,
    });
  }

  // Source overview table
  const tableRows = Array.from(bySource.entries()).map(
    ([name, sourceChunks]) => [
      name,
      String(sourceChunks.length),
      String(
        Math.round(
          (sourceChunks.reduce((s, c) => s + c.relevanceScore, 0) /
            sourceChunks.length) *
            100,
        ) / 100,
      ),
    ],
  );

  sections.push({
    heading: "Source Summary",
    content: "",
    bulletPoints: [],
    table: {
      headers: ["Source", "Chunks", "Avg Relevance"],
      rows: tableRows,
    },
  });

  // Conclusion
  sections.push({
    heading: "Conclusion",
    content:
      "The analysis above provides a structured review of all available data. " +
      "Further investigation may be needed for areas not covered by the current sources.",
    bulletPoints: [],
    table: null,
  });

  return sections;
}

function buildComparison(
  query: string,
  chunks: RetrievedChunk[],
): ReportSection[] {
  const sections: ReportSection[] = [];

  const bySource = groupBySource(chunks);
  const sourceNames = Array.from(bySource.keys());

  sections.push({
    heading: "Comparison Overview",
    content:
      `Comparing ${sourceNames.length} source(s) for: "${truncate(query, 100)}".\n` +
      `Sources: ${sourceNames.join(", ")}.`,
    bulletPoints: [],
    table: null,
  });

  // Side-by-side summary
  if (sourceNames.length >= 2) {
    const comparisonRows: string[][] = [];
    const maxChunks = Math.max(
      ...Array.from(bySource.values()).map((c) => c.length),
    );

    for (let i = 0; i < Math.min(maxChunks, 5); i++) {
      const row = sourceNames.map((name) => {
        const sourceChunks = bySource.get(name)!;
        return i < sourceChunks.length
          ? truncate(sourceChunks[i].text, 100)
          : "-";
      });
      comparisonRows.push(row);
    }

    sections.push({
      heading: "Side-by-Side Comparison",
      content: "",
      bulletPoints: [],
      table: {
        headers: sourceNames,
        rows: comparisonRows,
      },
    });
  }

  // Similarities and differences
  const similarities: string[] = [];
  const differences: string[] = [];

  if (sourceNames.length >= 2) {
    similarities.push(
      `All sources address the topic: "${truncate(query, 60)}"`,
    );
    differences.push(
      `Sources cover different aspects of the topic`,
    );
    differences.push(
      `Depth of coverage varies across sources`,
    );
  }

  sections.push({
    heading: "Similarities",
    content: "",
    bulletPoints: similarities.length > 0 ? similarities : ["Not enough data to identify similarities"],
    table: null,
  });

  sections.push({
    heading: "Differences",
    content: "",
    bulletPoints: differences.length > 0 ? differences : ["Not enough data to identify differences"],
    table: null,
  });

  return sections;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateTitle(query: string, mode: ReportMode): string {
  const modeLabels: Record<ReportMode, string> = {
    executive_summary: "Executive Summary",
    detailed_analysis: "Detailed Analysis",
    comparison: "Comparison Report",
  };
  return `${modeLabels[mode]}: ${truncate(query, 80)}`;
}

function groupBySource(
  chunks: RetrievedChunk[],
): Map<string, RetrievedChunk[]> {
  const grouped = new Map<string, RetrievedChunk[]>();
  for (const chunk of chunks) {
    const key = chunk.sourceName;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(chunk);
  }
  // Sort each group by relevance descending
  for (const chunks of grouped.values()) {
    chunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
  return grouped;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
