// ---------------------------------------------------------------------------
// Notion -> RetrievalDocument mapper
// ---------------------------------------------------------------------------

import type { NotionPage, NotionBlock, NotionDatabase } from "./types";

/**
 * Normalized document format consumed by the retrieval / RAG pipeline.
 * Source-agnostic so files, Notion pages, and Supabase rows share the
 * same shape downstream.
 */
export interface RetrievalDocument {
  id: string;
  source: "notion";
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  lastModified: string;
}

/** Maps a Notion page with its blocks into a RetrievalDocument. */
export function mapPageToDocument(
  page: NotionPage,
  blocks: NotionBlock[],
): RetrievalDocument {
  const content = blocksToMarkdown(blocks);

  return {
    id: `notion:page:${page.id}`,
    source: "notion",
    title: page.title,
    content,
    metadata: {
      notionId: page.id,
      url: page.url,
      parentType: page.parentType,
      parentId: page.parentId,
      archived: page.archived,
      icon: page.icon,
      cover: page.cover,
      createdTime: page.createdTime,
      propertyKeys: Object.keys(page.properties),
    },
    lastModified: page.lastEditedTime,
  };
}

/** Maps a Notion database (with entries) into an array of RetrievalDocuments. */
export function mapDatabaseToDocuments(
  database: NotionDatabase,
): RetrievalDocument[] {
  const documents: RetrievalDocument[] = [];

  // The database itself as a document
  const propertyDescriptions = Object.entries(database.properties)
    .map(([key, prop]) => `- ${key} (${prop.type})`)
    .join("\n");

  documents.push({
    id: `notion:database:${database.id}`,
    source: "notion",
    title: database.title,
    content: `Database: ${database.title}\n\nProperties:\n${propertyDescriptions}`,
    metadata: {
      notionId: database.id,
      url: database.url,
      objectType: "database",
      parentType: database.parentType,
      parentId: database.parentId,
      archived: database.archived,
      propertyCount: Object.keys(database.properties).length,
      entryCount: database.entries.length,
      createdTime: database.createdTime,
    },
    lastModified: database.lastEditedTime,
  });

  // Each entry as a separate document
  for (const entry of database.entries) {
    const content = formatDatabaseEntry(entry, database);
    documents.push({
      id: `notion:dbentry:${entry.id}`,
      source: "notion",
      title: `${database.title} - ${entry.title}`,
      content,
      metadata: {
        notionId: entry.id,
        url: entry.url,
        objectType: "database_entry",
        databaseId: database.id,
        databaseTitle: database.title,
        archived: entry.archived,
        createdTime: entry.createdTime,
      },
      lastModified: entry.lastEditedTime,
    });
  }

  return documents;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Converts an array of Notion blocks into Markdown text. */
function blocksToMarkdown(blocks: NotionBlock[], depth: number = 0): string {
  const lines: string[] = [];
  const indent = "  ".repeat(depth);
  let numberedIndex = 1;

  for (const block of blocks) {
    const line = blockToMarkdown(block, indent, numberedIndex);
    if (line !== null) {
      lines.push(line);
    }

    if (block.type === "numbered_list_item") {
      numberedIndex++;
    } else {
      numberedIndex = 1;
    }

    if (block.children.length > 0) {
      lines.push(blocksToMarkdown(block.children, depth + 1));
    }
  }

  return lines.join("\n");
}

/** Converts a single Notion block into a Markdown line. */
function blockToMarkdown(
  block: NotionBlock,
  indent: string,
  numberedIndex: number,
): string | null {
  const content = block.content;

  switch (block.type) {
    case "paragraph":
      return `${indent}${content}`;

    case "heading_1":
      return `${indent}# ${content}`;

    case "heading_2":
      return `${indent}## ${content}`;

    case "heading_3":
      return `${indent}### ${content}`;

    case "bulleted_list_item":
      return `${indent}- ${content}`;

    case "numbered_list_item":
      return `${indent}${numberedIndex}. ${content}`;

    case "to_do": {
      const checked =
        (block.metadata as Record<string, unknown>).checked === true;
      return `${indent}- [${checked ? "x" : " "}] ${content}`;
    }

    case "toggle":
      return `${indent}<details><summary>${content}</summary></details>`;

    case "quote":
      return `${indent}> ${content}`;

    case "callout":
      return `${indent}> **Note:** ${content}`;

    case "code":
      return `${indent}${content}`;

    case "equation":
      return `${indent}$$${content}$$`;

    case "divider":
      return `${indent}---`;

    case "image":
    case "file":
    case "pdf":
      return `${indent}![${block.type}](${content})`;

    case "bookmark":
    case "link_preview":
    case "embed":
      return `${indent}[${block.type}](${content})`;

    case "table_of_contents":
    case "breadcrumb":
      return null;

    case "child_page":
    case "child_database":
      return `${indent}[${block.type}: ${content || block.id}]`;

    default:
      return content ? `${indent}${content}` : null;
  }
}

/** Formats a database entry's properties as readable text. */
function formatDatabaseEntry(
  entry: NotionPage,
  database: NotionDatabase,
): string {
  const lines: string[] = [`# ${entry.title}`, ""];

  for (const [key, value] of Object.entries(entry.properties)) {
    const propSchema = database.properties[key];
    const type = propSchema?.type ?? "unknown";
    const formatted = formatPropertyValue(type, value as Record<string, unknown>);
    if (formatted) {
      lines.push(`**${key}:** ${formatted}`);
    }
  }

  return lines.join("\n");
}

/** Best-effort formatting of a Notion property value. */
function formatPropertyValue(
  type: string,
  value: Record<string, unknown>,
): string {
  const typed = value[type];

  switch (type) {
    case "title":
    case "rich_text": {
      const arr = typed as Array<{ plain_text: string }> | undefined;
      return arr?.map((t) => t.plain_text).join("") ?? "";
    }

    case "number":
      return typed != null ? String(typed) : "";

    case "select": {
      const sel = typed as { name: string } | null;
      return sel?.name ?? "";
    }

    case "multi_select": {
      const items = typed as Array<{ name: string }> | undefined;
      return items?.map((i) => i.name).join(", ") ?? "";
    }

    case "date": {
      const d = typed as { start: string; end?: string } | null;
      if (!d) return "";
      return d.end ? `${d.start} - ${d.end}` : d.start;
    }

    case "checkbox":
      return typed ? "Yes" : "No";

    case "url":
    case "email":
    case "phone_number":
      return (typed as string) ?? "";

    case "formula": {
      const f = typed as Record<string, unknown> | undefined;
      if (!f) return "";
      return String(f[f.type as string] ?? "");
    }

    case "relation": {
      const rels = typed as Array<{ id: string }> | undefined;
      return rels?.map((r) => r.id).join(", ") ?? "";
    }

    case "rollup": {
      const r = typed as Record<string, unknown> | undefined;
      if (!r) return "";
      return String(r[r.type as string] ?? "");
    }

    case "people": {
      const people = typed as Array<{ name?: string; id: string }> | undefined;
      return people?.map((p) => p.name ?? p.id).join(", ") ?? "";
    }

    case "files": {
      const files = typed as Array<{ name: string }> | undefined;
      return files?.map((f) => f.name).join(", ") ?? "";
    }

    case "created_time":
    case "last_edited_time":
      return (typed as string) ?? "";

    default:
      return typed != null ? JSON.stringify(typed) : "";
  }
}
