/**
 * Client-side model utilities for display, filtering, and analysis.
 */

export interface ModelInfo {
  slug: string;
  displayName: string;
  description: string;
  providerFamily: string;
  contextLength: number;
  inputCostPerM: number;
  outputCostPerM: number;
  inputModalities: string[];
  outputModalities: string[];
  supportedParameters: string[];
  isModerated: boolean;
  maxCompletionTokens: number | null;
  tags: string[];
}

export type RoutingMode =
  | 'auto'
  | 'fast'
  | 'balanced'
  | 'best-quality'
  | 'reasoning'
  | 'coding'
  | 'vision'
  | 'file-analysis'
  | 'data-analysis';

export interface RoutingModeConfig {
  id: RoutingMode;
  label: string;
  description: string;
  icon: string;
  tags: string[];
}

export const ROUTING_MODES: RoutingModeConfig[] = [
  { id: 'auto', label: 'Auto', description: 'Let Thinkora choose the best model', icon: '✨', tags: [] },
  { id: 'fast', label: 'Fast', description: 'Low latency, quick responses', icon: '⚡', tags: ['fast', 'cheap'] },
  { id: 'balanced', label: 'Balanced', description: 'Balance of speed and quality', icon: '⚖️', tags: ['best-for-chat'] },
  { id: 'best-quality', label: 'Best Quality', description: 'Highest quality output', icon: '👑', tags: ['premium'] },
  { id: 'reasoning', label: 'Reasoning', description: 'Complex reasoning and analysis', icon: '🧠', tags: ['reasoning'] },
  { id: 'coding', label: 'Coding', description: 'Code generation and review', icon: '💻', tags: ['coding'] },
  { id: 'vision', label: 'Vision', description: 'Image understanding', icon: '👁️', tags: ['vision'] },
  { id: 'file-analysis', label: 'File Analysis', description: 'Long document processing', icon: '📄', tags: ['long-context', 'best-for-rag'] },
  { id: 'data-analysis', label: 'Data Analysis', description: 'Structured data and spreadsheets', icon: '📊', tags: ['structured-output', 'tool-capable'] },
];

export interface ModelFilter {
  search?: string;
  tags?: string[];
  maxInputCost?: number;
  maxOutputCost?: number;
  minContextLength?: number;
  inputModalities?: string[];
  toolSupport?: boolean;
  structuredOutputSupport?: boolean;
  reasoningSupport?: boolean;
  zdrCompatible?: boolean;
  freeOnly?: boolean;
  activeOnly?: boolean;
}

export function filterModels(models: ModelInfo[], filter: ModelFilter): ModelInfo[] {
  return models.filter(m => {
    if (filter.search) {
      const q = filter.search.toLowerCase();
      if (!m.displayName.toLowerCase().includes(q) &&
          !m.slug.toLowerCase().includes(q) &&
          !m.providerFamily.toLowerCase().includes(q)) return false;
    }
    if (filter.tags?.length) {
      if (!filter.tags.some(t => m.tags.includes(t))) return false;
    }
    if (filter.maxInputCost != null && m.inputCostPerM > filter.maxInputCost) return false;
    if (filter.maxOutputCost != null && m.outputCostPerM > filter.maxOutputCost) return false;
    if (filter.minContextLength != null && m.contextLength < filter.minContextLength) return false;
    if (filter.toolSupport && !m.supportedParameters.includes('tools')) return false;
    if (filter.structuredOutputSupport && !m.supportedParameters.includes('response_format')) return false;
    if (filter.reasoningSupport && !m.tags.includes('reasoning')) return false;
    if (filter.freeOnly && !m.tags.includes('free')) return false;
    return true;
  });
}

export function sortModels(models: ModelInfo[], by: 'name' | 'cost' | 'context' | 'provider'): ModelInfo[] {
  return [...models].sort((a, b) => {
    switch (by) {
      case 'name': return a.displayName.localeCompare(b.displayName);
      case 'cost': return a.inputCostPerM - b.inputCostPerM;
      case 'context': return b.contextLength - a.contextLength;
      case 'provider': return a.providerFamily.localeCompare(b.providerFamily);
    }
  });
}

export function formatCost(costPerM: number): string {
  if (costPerM === 0) return 'Free';
  if (costPerM < 0.01) return `$${costPerM.toFixed(4)}/M`;
  if (costPerM < 1) return `$${costPerM.toFixed(2)}/M`;
  return `$${costPerM.toFixed(1)}/M`;
}

export function formatContextLength(length: number): string {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(1)}M`;
  if (length >= 1_000) return `${(length / 1_000).toFixed(0)}K`;
  return length.toString();
}

export function getModelSuitability(model: ModelInfo, task: RoutingMode): number {
  let score = 50;
  const mode = ROUTING_MODES.find(m => m.id === task);
  if (!mode) return score;

  for (const tag of mode.tags) {
    if (model.tags.includes(tag)) score += 20;
  }

  if (task === 'fast' && model.inputCostPerM < 1) score += 15;
  if (task === 'best-quality' && model.tags.includes('premium')) score += 25;
  if (task === 'file-analysis' && model.contextLength >= 100_000) score += 20;
  if (task === 'data-analysis' && model.supportedParameters.includes('tools')) score += 15;

  return Math.min(100, score);
}
