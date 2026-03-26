'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import ModelDetailPanel from './ModelDetailPanel';

/* ------------------------------------------------------------------ */
/*  Demo data                                                          */
/* ------------------------------------------------------------------ */

export interface CatalogModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number; // in K
  inputPrice: number;    // per 1M tokens
  outputPrice: number;   // per 1M tokens
  tags: string[];
  description: string;
  features: string[];
  strengths: string[];
  weaknesses: string[];
  idealUseCases: string[];
  avgLatency: number;
  avgCost: number;
  errorRate: number;
  benchmarkScores: { name: string; score: number }[];
}

const CATALOG: CatalogModel[] = [
  {
    id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextLength: 128,
    inputPrice: 2.50, outputPrice: 10.00, tags: ['chat', 'vision', 'tools', 'reasoning'],
    description: 'Flagship multimodal model with strong reasoning and tool use capabilities.',
    features: ['Function calling', 'Vision', 'Structured output', 'JSON mode'],
    strengths: ['Broad knowledge', 'Strong reasoning', 'Fast for its tier'],
    weaknesses: ['Higher cost', 'Occasional hallucination on niche topics'],
    idealUseCases: ['Complex analysis', 'Multi-step reasoning', 'Code generation'],
    avgLatency: 480, avgCost: 0.013, errorRate: 0.5,
    benchmarkScores: [{ name: 'MMLU', score: 88 }, { name: 'HumanEval', score: 91 }, { name: 'GSM8K', score: 95 }],
  },
  {
    id: 'claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextLength: 200,
    inputPrice: 3.00, outputPrice: 15.00, tags: ['chat', 'reasoning', 'coding', 'tools'],
    description: 'High-capability model excelling at nuanced reasoning and long-context tasks.',
    features: ['Tool use', 'Structured output', 'Extended context', 'Reasoning'],
    strengths: ['Best-in-class reasoning', 'Long context window', 'Low hallucination'],
    weaknesses: ['Slightly higher latency', 'Premium pricing'],
    idealUseCases: ['Complex reasoning', 'Long document analysis', 'Coding'],
    avgLatency: 520, avgCost: 0.011, errorRate: 0.3,
    benchmarkScores: [{ name: 'MMLU', score: 90 }, { name: 'HumanEval', score: 93 }, { name: 'GSM8K', score: 96 }],
  },
  {
    id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', contextLength: 128,
    inputPrice: 1.25, outputPrice: 5.00, tags: ['chat', 'vision', 'multimodal'],
    description: 'Versatile multimodal model with strong vision and grounding capabilities.',
    features: ['Vision', 'Grounding', 'Code execution', 'Function calling'],
    strengths: ['Good multimodal', 'Competitive pricing', 'Fast'],
    weaknesses: ['Reasoning slightly behind top tier', 'Smaller ecosystem'],
    idealUseCases: ['Image analysis', 'General chat', 'Multimodal tasks'],
    avgLatency: 310, avgCost: 0.006, errorRate: 0.9,
    benchmarkScores: [{ name: 'MMLU', score: 84 }, { name: 'HumanEval', score: 82 }, { name: 'GSM8K', score: 88 }],
  },
  {
    id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', contextLength: 128,
    inputPrice: 0.15, outputPrice: 0.60, tags: ['chat', 'fast', 'tools'],
    description: 'Cost-efficient model for simpler tasks with good tool use support.',
    features: ['Function calling', 'Structured output', 'JSON mode'],
    strengths: ['Very fast', 'Extremely low cost', 'Good for simple tasks'],
    weaknesses: ['Limited reasoning depth', 'Shorter answers on complex topics'],
    idealUseCases: ['Simple Q&A', 'Classification', 'Extraction', 'High-volume tasks'],
    avgLatency: 180, avgCost: 0.0005, errorRate: 0.4,
    benchmarkScores: [{ name: 'MMLU', score: 78 }, { name: 'HumanEval', score: 75 }, { name: 'GSM8K', score: 82 }],
  },
  {
    id: 'llama-3.1-70b', name: 'Llama 3.1 70B', provider: 'Meta', contextLength: 128,
    inputPrice: 0.60, outputPrice: 0.80, tags: ['chat', 'coding', 'open-source'],
    description: 'High-quality open-source model competitive with proprietary alternatives.',
    features: ['Tool use', 'Structured output', 'Fine-tunable'],
    strengths: ['Open source', 'Very cost-effective', 'Good coding ability'],
    weaknesses: ['Less consistent on complex reasoning', 'No vision'],
    idealUseCases: ['Cost-sensitive deployments', 'Code generation', 'Chat'],
    avgLatency: 260, avgCost: 0.001, errorRate: 1.2,
    benchmarkScores: [{ name: 'MMLU', score: 79 }, { name: 'HumanEval', score: 81 }, { name: 'GSM8K', score: 84 }],
  },
  {
    id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', contextLength: 200,
    inputPrice: 0.25, outputPrice: 1.25, tags: ['chat', 'fast', 'tools'],
    description: 'Fastest Claude model optimized for speed and cost efficiency.',
    features: ['Tool use', 'Extended context', 'Structured output'],
    strengths: ['Extremely fast', 'Great for simple tasks', 'Long context'],
    weaknesses: ['Limited reasoning on complex problems', 'Less creative'],
    idealUseCases: ['Real-time chat', 'Simple extraction', 'Classification'],
    avgLatency: 140, avgCost: 0.0006, errorRate: 0.2,
    benchmarkScores: [{ name: 'MMLU', score: 75 }, { name: 'HumanEval', score: 72 }, { name: 'GSM8K', score: 78 }],
  },
  {
    id: 'mixtral-8x7b', name: 'Mixtral 8x7B', provider: 'Mistral', contextLength: 32,
    inputPrice: 0.24, outputPrice: 0.24, tags: ['chat', 'open-source', 'fast'],
    description: 'Efficient mixture-of-experts model with excellent cost/performance ratio.',
    features: ['Function calling', 'Fine-tunable'],
    strengths: ['Very fast', 'Low cost', 'Good at structured tasks'],
    weaknesses: ['Smaller context', 'Less capable on complex reasoning'],
    idealUseCases: ['Bulk processing', 'Simple tasks', 'Budget applications'],
    avgLatency: 220, avgCost: 0.0003, errorRate: 1.8,
    benchmarkScores: [{ name: 'MMLU', score: 71 }, { name: 'HumanEval', score: 68 }, { name: 'GSM8K', score: 74 }],
  },
  {
    id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', contextLength: 128,
    inputPrice: 0.14, outputPrice: 0.28, tags: ['chat', 'coding', 'reasoning', 'open-source'],
    description: 'State-of-the-art open model with strong coding and reasoning capabilities.',
    features: ['Tool use', 'Structured output', 'Reasoning'],
    strengths: ['Exceptional coding', 'Strong math', 'Very competitive pricing'],
    weaknesses: ['Newer, less battle-tested', 'Occasional formatting issues'],
    idealUseCases: ['Code generation', 'Mathematical reasoning', 'Analysis'],
    avgLatency: 380, avgCost: 0.0006, errorRate: 2.1,
    benchmarkScores: [{ name: 'MMLU', score: 82 }, { name: 'HumanEval', score: 89 }, { name: 'GSM8K', score: 91 }],
  },
];

const ALL_TAGS = Array.from(new Set(CATALOG.flatMap((m) => m.tags))).sort();

const SORT_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'context', label: 'Context Length' },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]['value'];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ModelCatalogExplorer() {
  const [searchText, setSearchText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>('name');
  const [selectedModel, setSelectedModel] = useState<CatalogModel | null>(null);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  let filtered = CATALOG.filter((m) => {
    if (
      searchText &&
      !m.name.toLowerCase().includes(searchText.toLowerCase()) &&
      !m.provider.toLowerCase().includes(searchText.toLowerCase())
    ) {
      return false;
    }
    if (
      selectedTags.length > 0 &&
      !selectedTags.every((t) => m.tags.includes(t))
    ) {
      return false;
    }
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'price-asc': return a.inputPrice - b.inputPrice;
      case 'price-desc': return b.inputPrice - a.inputPrice;
      case 'context': return b.contextLength - a.contextLength;
      default: return a.name.localeCompare(b.name);
    }
  });

  return (
    <div style={{ padding: 20 }}>
      <div className="dash-card">
        <div className="dash-card-title" style={{ marginBottom: 16 }}>
          Model Catalog
        </div>

        {/* Search */}
        <div className="sb-search" style={{ margin: '0 0 14px 0' }}>
          <Search size={14} />
          <input
            placeholder="Search models or providers..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Tag filter pills + Sort */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            marginBottom: 20,
          }}
        >
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ALL_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-pill)',
                    border: `1px solid ${active ? 'var(--color-primary-border)' : 'var(--color-border)'}`,
                    background: active ? 'var(--color-primary-bg)' : 'transparent',
                    color: active ? 'var(--color-primary)' : 'var(--color-text-tertiary)',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'var(--font)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={{
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--color-border)',
              background: 'var(--bg-elevated)',
              color: 'var(--color-text)',
              fontSize: 12,
              fontFamily: 'var(--font)',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 12,
          }}
        >
          {filtered.map((model) => (
            <div
              key={model.id}
              onClick={() => setSelectedModel(model)}
              style={{
                padding: 16,
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-card)',
                background: 'var(--bg-elevated)',
                cursor: 'pointer',
                transition: 'all 0.2s var(--ease-out)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  'var(--color-primary-border)';
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  '0 4px 16px rgba(0,0,0,0.2)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  'var(--color-border-card)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--color-text)',
                  }}
                >
                  {model.name}
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 500,
                  }}
                >
                  {model.provider}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  marginBottom: 10,
                }}
              >
                <span>{model.contextLength}K ctx</span>
                <span>${model.inputPrice}/1M in</span>
              </div>

              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {model.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--color-fill-secondary)',
                      color: 'var(--color-text-tertiary)',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: 40,
                textAlign: 'center',
                color: 'var(--color-text-tertiary)',
                fontSize: 13,
              }}
            >
              No models match your search criteria.
            </div>
          )}
        </div>
      </div>

      {/* Model detail panel */}
      {selectedModel && (
        <ModelDetailPanel
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
        />
      )}
    </div>
  );
}
