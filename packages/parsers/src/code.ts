/**
 * Code parser.
 * Extracts code content, detects language from extension,
 * and identifies functions/classes as sections using regex patterns.
 */

import { BaseParser, ParseResult, Section } from "./base";

interface LanguagePatterns {
  functions: RegExp;
  classes: RegExp;
  comments: RegExp;
}

const LANGUAGE_MAP: Record<string, string> = {
  ".js": "javascript",
  ".jsx": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".py": "python",
  ".rb": "ruby",
  ".java": "java",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".go": "go",
  ".rs": "rust",
  ".swift": "swift",
  ".kt": "kotlin",
  ".scala": "scala",
  ".php": "php",
  ".sh": "shell",
  ".bash": "shell",
  ".zsh": "shell",
  ".ps1": "powershell",
  ".sql": "sql",
  ".r": "r",
  ".lua": "lua",
  ".perl": "perl",
  ".pl": "perl",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".toml": "toml",
  ".ini": "ini",
  ".cfg": "ini",
  ".conf": "config",
  ".env": "env",
  ".vue": "vue",
  ".svelte": "svelte",
};

const PATTERNS: Record<string, LanguagePatterns> = {
  javascript: {
    functions:
      /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(\w+)\s*:\s*(?:async\s+)?function)/gm,
    classes: /(?:export\s+)?class\s+(\w+)/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  typescript: {
    functions:
      /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*(?::\s*\S+\s*)?=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>|(\w+)\s*\([^)]*\)\s*(?::\s*\S+\s*)?{)/gm,
    classes:
      /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)|(?:export\s+)?interface\s+(\w+)|(?:export\s+)?type\s+(\w+)\s*=/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  python: {
    functions: /(?:async\s+)?def\s+(\w+)/gm,
    classes: /class\s+(\w+)/gm,
    comments: /#.*$|"""[\s\S]*?"""|'''[\s\S]*?'''/gm,
  },
  java: {
    functions:
      /(?:public|private|protected|static|\s)+[\w<>\[\],\s]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{/gm,
    classes: /(?:public\s+|private\s+|protected\s+)?(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  go: {
    functions: /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/gm,
    classes: /type\s+(\w+)\s+struct/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  rust: {
    functions: /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/gm,
    classes: /(?:pub\s+)?(?:struct|enum|trait|impl)\s+(\w+)/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  ruby: {
    functions: /def\s+(?:self\.)?(\w+[?!]?)/gm,
    classes: /(?:class|module)\s+(\w+)/gm,
    comments: /#.*$|=begin[\s\S]*?=end/gm,
  },
  csharp: {
    functions:
      /(?:public|private|protected|internal|static|async|\s)+[\w<>\[\],\s]+\s+(\w+)\s*\([^)]*\)\s*\{/gm,
    classes:
      /(?:public\s+|private\s+|internal\s+)?(?:abstract\s+|static\s+)?(?:class|interface|struct|enum)\s+(\w+)/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  php: {
    functions: /(?:public|private|protected|static|\s)*function\s+(\w+)/gm,
    classes: /(?:abstract\s+)?class\s+(\w+)|interface\s+(\w+)|trait\s+(\w+)/gm,
    comments: /\/\/.*$|#.*$|\/\*[\s\S]*?\*\//gm,
  },
  swift: {
    functions: /(?:public\s+|private\s+|internal\s+)?func\s+(\w+)/gm,
    classes:
      /(?:public\s+|private\s+|internal\s+)?(?:class|struct|enum|protocol)\s+(\w+)/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
  kotlin: {
    functions: /(?:fun|suspend\s+fun)\s+(\w+)/gm,
    classes: /(?:data\s+)?(?:class|interface|object|enum\s+class)\s+(\w+)/gm,
    comments: /\/\/.*$|\/\*[\s\S]*?\*\//gm,
  },
};

// Default patterns for unknown languages
const DEFAULT_PATTERNS: LanguagePatterns = {
  functions: /function\s+(\w+)|def\s+(\w+)|fn\s+(\w+)|func\s+(\w+)/gm,
  classes: /class\s+(\w+)|struct\s+(\w+)|interface\s+(\w+)/gm,
  comments: /\/\/.*$|#.*$|\/\*[\s\S]*?\*\//gm,
};

export class CodeParser extends BaseParser {
  constructor() {
    super("CodeParser");
  }

  async parse(buffer: Buffer, fileName: string): Promise<ParseResult> {
    const result = this.createEmptyResult();

    try {
      const text = buffer.toString("utf-8");
      result.rawText = text;

      // Detect language from file extension
      const ext = this.getExtension(fileName);
      const language = LANGUAGE_MAP[ext] ?? "unknown";
      const patterns = PATTERNS[language] ?? DEFAULT_PATTERNS;

      // Extract functions
      const functions = this.extractMatches(text, patterns.functions);
      // Extract classes/types
      const classes = this.extractMatches(text, patterns.classes);

      // Build sections
      const sections: Section[] = [];

      // Add classes as level-1 sections
      for (const className of classes) {
        sections.push({
          title: `class ${className}`,
          content: this.extractBlockContent(text, className),
          level: 1,
        });
      }

      // Add functions as level-2 sections
      for (const funcName of functions) {
        sections.push({
          title: `function ${funcName}`,
          content: this.extractBlockContent(text, funcName),
          level: 2,
        });
      }

      // If no classes or functions found, split by blank lines
      if (sections.length === 0) {
        const blocks = text.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
        sections.push(
          ...blocks.map((block, index) => ({
            title: `Block ${index + 1}`,
            content: block.trim(),
            level: 1,
          }))
        );
      }

      result.sections = sections;

      // Count lines and comments
      const lines = text.split("\n");
      const commentRegex = new RegExp(patterns.comments.source, patterns.comments.flags);
      const commentMatches = text.match(commentRegex);

      result.metadata = {
        format: "code",
        language,
        extension: ext,
        lineCount: lines.length,
        characterCount: text.length,
        functionCount: functions.length,
        classCount: classes.length,
        commentCount: commentMatches ? commentMatches.length : 0,
        functions,
        classes,
      };

      result.parserConfidence = language !== "unknown" ? 0.85 : 0.6;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw this.createError(`Failed to parse code file: ${message}`, fileName);
    }

    return result;
  }

  private getExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf(".");
    return lastDot !== -1 ? fileName.slice(lastDot).toLowerCase() : "";
  }

  private extractMatches(text: string, regex: RegExp): string[] {
    const names: string[] = [];
    // Reset regex lastIndex
    const re = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
      // Find the first non-undefined capture group
      for (let i = 1; i < match.length; i++) {
        if (match[i]) {
          names.push(match[i]);
          break;
        }
      }
    }

    return [...new Set(names)]; // Deduplicate
  }

  /**
   * Extracts a short preview of the block where the identifier is defined.
   */
  private extractBlockContent(text: string, identifier: string): string {
    const lines = text.split("\n");
    const lineIndex = lines.findIndex((line) => line.includes(identifier));

    if (lineIndex === -1) return "";

    // Grab up to 10 lines starting from the definition
    const preview = lines
      .slice(lineIndex, Math.min(lineIndex + 10, lines.length))
      .join("\n");

    return preview.trim();
  }
}
