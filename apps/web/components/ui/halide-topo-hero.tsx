'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';

/* ═══ Deterministic random ═══ */
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

/* ═══ AI Model Network — named nodes with categories ═══ */
interface AINode {
  id: string;
  label: string;
  shortLabel: string;
  category: 'provider' | 'capability' | 'connector' | 'core';
  x: number;
  y: number;
  r: number;
  col: number; // visual column 0-4
}

interface AIEdge {
  from: string;
  to: string;
}

function buildAINetwork(w: number, h: number): { nodes: AINode[]; edges: AIEdge[] } {
  const pad = { x: w * 0.08, y: h * 0.12 };
  const colX = (col: number) => pad.x + (col / 4) * (w - pad.x * 2);
  const rng = seededRandom(99);
  const jitter = (v: number, spread: number) => v + (rng() - 0.5) * spread;

  // Column 0: Input connectors
  // Column 1: Data processing
  // Column 2: Thinkora core
  // Column 3: Model providers
  // Column 4: Output capabilities

  const nodes: AINode[] = [
    // Col 0 — Connectors (left edge)
    { id: 'notion',     label: 'Notion MCP',      shortLabel: 'N',    category: 'connector', x: jitter(colX(0), 20), y: jitter(h * 0.2, 15),  r: 14, col: 0 },
    { id: 'supabase',   label: 'Supabase',         shortLabel: 'S',    category: 'connector', x: jitter(colX(0), 20), y: jitter(h * 0.45, 15), r: 14, col: 0 },
    { id: 'files',      label: 'File Upload',      shortLabel: 'F',    category: 'connector', x: jitter(colX(0), 20), y: jitter(h * 0.7, 15),  r: 12, col: 0 },
    { id: 'memory',     label: 'Memory',           shortLabel: 'M',    category: 'connector', x: jitter(colX(0), 20), y: jitter(h * 0.88, 15), r: 10, col: 0 },

    // Col 1 — Processing
    { id: 'parser',     label: 'Parser',           shortLabel: 'P',    category: 'capability', x: jitter(colX(1), 18), y: jitter(h * 0.18, 12), r: 10, col: 1 },
    { id: 'chunker',    label: 'Chunker',          shortLabel: 'C',    category: 'capability', x: jitter(colX(1), 18), y: jitter(h * 0.38, 12), r: 10, col: 1 },
    { id: 'embeddings', label: 'Embeddings',       shortLabel: 'E',    category: 'capability', x: jitter(colX(1), 18), y: jitter(h * 0.58, 12), r: 11, col: 1 },
    { id: 'retrieval',  label: 'RAG Retrieval',    shortLabel: 'R',    category: 'capability', x: jitter(colX(1), 18), y: jitter(h * 0.78, 12), r: 12, col: 1 },

    // Col 2 — Thinkora core (center)
    { id: 'orchestrator', label: 'Orchestrator',   shortLabel: 'T',    category: 'core',      x: colX(2),              y: h * 0.35,             r: 22, col: 2 },
    { id: 'router',       label: 'Model Router',   shortLabel: 'RT',   category: 'core',      x: jitter(colX(2), 12),  y: h * 0.62,             r: 16, col: 2 },
    { id: 'skills',       label: 'Agent Skills',   shortLabel: 'SK',   category: 'core',      x: jitter(colX(2), 15),  y: h * 0.85,             r: 13, col: 2 },

    // Col 3 — AI Providers
    { id: 'claude',     label: 'Claude',           shortLabel: 'CL',   category: 'provider',  x: jitter(colX(3), 18),  y: jitter(h * 0.12, 10), r: 15, col: 3 },
    { id: 'gpt',        label: 'GPT-4o',           shortLabel: 'G4',   category: 'provider',  x: jitter(colX(3), 18),  y: jitter(h * 0.30, 10), r: 15, col: 3 },
    { id: 'gemini',     label: 'Gemini',           shortLabel: 'GE',   category: 'provider',  x: jitter(colX(3), 18),  y: jitter(h * 0.48, 10), r: 14, col: 3 },
    { id: 'llama',      label: 'Llama 4',          shortLabel: 'LL',   category: 'provider',  x: jitter(colX(3), 18),  y: jitter(h * 0.65, 10), r: 13, col: 3 },
    { id: 'deepseek',   label: 'DeepSeek',         shortLabel: 'DS',   category: 'provider',  x: jitter(colX(3), 18),  y: jitter(h * 0.82, 10), r: 12, col: 3 },
    { id: 'mistral',    label: 'Mistral',          shortLabel: 'MI',   category: 'provider',  x: jitter(colX(3), 20),  y: jitter(h * 0.95, 10), r: 11, col: 3 },

    // Col 4 — Output capabilities (right edge)
    { id: 'citations',  label: 'Citations',        shortLabel: 'CI',   category: 'capability', x: jitter(colX(4), 15), y: jitter(h * 0.2, 12),  r: 11, col: 4 },
    { id: 'streaming',  label: 'Streaming',        shortLabel: 'ST',   category: 'capability', x: jitter(colX(4), 15), y: jitter(h * 0.42, 12), r: 11, col: 4 },
    { id: 'analysis',   label: 'Analysis',         shortLabel: 'AN',   category: 'capability', x: jitter(colX(4), 15), y: jitter(h * 0.62, 12), r: 11, col: 4 },
    { id: 'dashboard',  label: 'Dashboard',        shortLabel: 'DB',   category: 'capability', x: jitter(colX(4), 15), y: jitter(h * 0.82, 12), r: 11, col: 4 },
  ];

  const edges: AIEdge[] = [
    // Connectors → Processing
    { from: 'notion', to: 'parser' }, { from: 'notion', to: 'chunker' },
    { from: 'supabase', to: 'parser' }, { from: 'supabase', to: 'retrieval' },
    { from: 'files', to: 'parser' }, { from: 'files', to: 'chunker' },
    { from: 'memory', to: 'retrieval' },
    // Processing → Core
    { from: 'parser', to: 'chunker' }, { from: 'chunker', to: 'embeddings' },
    { from: 'embeddings', to: 'retrieval' }, { from: 'retrieval', to: 'orchestrator' },
    { from: 'parser', to: 'orchestrator' },
    // Core internal
    { from: 'orchestrator', to: 'router' }, { from: 'orchestrator', to: 'skills' },
    { from: 'router', to: 'skills' },
    // Core → Providers
    { from: 'router', to: 'claude' }, { from: 'router', to: 'gpt' },
    { from: 'router', to: 'gemini' }, { from: 'router', to: 'llama' },
    { from: 'router', to: 'deepseek' }, { from: 'router', to: 'mistral' },
    { from: 'orchestrator', to: 'claude' }, { from: 'orchestrator', to: 'gpt' },
    // Providers → Output
    { from: 'claude', to: 'citations' }, { from: 'claude', to: 'streaming' },
    { from: 'gpt', to: 'streaming' }, { from: 'gpt', to: 'analysis' },
    { from: 'gemini', to: 'analysis' }, { from: 'gemini', to: 'citations' },
    { from: 'llama', to: 'streaming' }, { from: 'deepseek', to: 'analysis' },
    { from: 'mistral', to: 'streaming' },
    // Core → Output
    { from: 'skills', to: 'citations' }, { from: 'skills', to: 'analysis' },
    { from: 'orchestrator', to: 'dashboard' }, { from: 'router', to: 'dashboard' },
  ];

  return { nodes, edges };
}

/* ═══ Circuit paths ═══ */
function generateCircuitPaths(seed: number, count: number, w: number, h: number) {
  const rng = seededRandom(seed);
  const paths: string[] = [];
  for (let i = 0; i < count; i++) {
    let x = rng() * w, y = rng() * h;
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    const segs = 3 + Math.floor(rng() * 4);
    for (let s = 0; s < segs; s++) {
      if (rng() > 0.5) { x += (rng() - 0.3) * 100; d += ` H${Math.max(0, Math.min(w, x)).toFixed(1)}`; }
      else { y += (rng() - 0.3) * 70; d += ` V${Math.max(0, Math.min(h, y)).toFixed(1)}`; }
    }
    paths.push(d);
  }
  return paths;
}

/* ═══ Hex grid ═══ */
function generateHexGrid(w: number, h: number, spacing: number) {
  const pts: { x: number; y: number }[] = [];
  for (let r = 0; r < Math.ceil(h / (spacing * 0.866)); r++)
    for (let c = 0; c < Math.ceil(w / spacing); c++) {
      const x = c * spacing + (r % 2 === 1 ? spacing / 2 : 0), y = r * spacing * 0.866;
      if (x <= w && y <= h) pts.push({ x, y });
    }
  return pts;
}

/* ═══ Category colors ═══ */
const CAT_COLORS: Record<string, { fill: string; stroke: string; text: string; glow: string }> = {
  provider:   { fill: 'rgba(255,60,0,0.15)',   stroke: 'rgba(255,60,0,0.5)',   text: '#ff6030', glow: 'rgba(255,60,0,0.3)' },
  capability: { fill: 'rgba(100,180,255,0.1)', stroke: 'rgba(100,180,255,0.3)', text: '#78b4ff', glow: 'rgba(100,180,255,0.2)' },
  connector:  { fill: 'rgba(80,220,160,0.1)',  stroke: 'rgba(80,220,160,0.3)',  text: '#5ce0a0', glow: 'rgba(80,220,160,0.2)' },
  core:       { fill: 'rgba(255,200,60,0.12)', stroke: 'rgba(255,200,60,0.5)',  text: '#ffd050', glow: 'rgba(255,200,60,0.3)' },
};

/* ═══════════════════════════════════════════════════════════════════ */

const HalideLanding: React.FC = () => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement[]>([]);
  const [copied, setCopied] = useState(false);
  const [time, setTime] = useState(0);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  useEffect(() => {
    let raf: number;
    const tick = () => { setTime(t => t + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const W = 800, H = 500;
  const network = useMemo(() => buildAINetwork(W, H), []);
  const circuits = useMemo(() => generateCircuitPaths(77, 14, W, H), []);
  const hexGrid = useMemo(() => generateHexGrid(W, H, 40), []);

  const nodeMap = useMemo(() => {
    const m = new Map<string, AINode>();
    network.nodes.forEach(n => m.set(n.id, n));
    return m;
  }, [network]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleMouseMove = (e: MouseEvent) => {
      const x = (window.innerWidth / 2 - e.pageX) / 25;
      const y = (window.innerHeight / 2 - e.pageY) / 25;
      canvas.style.transform = `rotateX(${55 + y / 2}deg) rotateZ(${-25 + x / 2}deg)`;
      layersRef.current.forEach((layer, index) => {
        if (!layer) return;
        const depth = (index + 1) * 18;
        layer.style.transform = `translateZ(${depth}px) translate(${x * (index + 1) * 0.25}px, ${y * (index + 1) * 0.25}px)`;
      });
    };
    canvas.style.opacity = '0';
    canvas.style.transform = 'rotateX(90deg) rotateZ(0deg) scale(0.8)';
    const timeout = setTimeout(() => {
      canvas.style.transition = 'all 2.5s cubic-bezier(0.16, 1, 0.3, 1)';
      canvas.style.opacity = '1';
      canvas.style.transform = 'rotateX(55deg) rotateZ(-25deg) scale(1)';
    }, 300);
    window.addEventListener('mousemove', handleMouseMove);
    return () => { window.removeEventListener('mousemove', handleMouseMove); clearTimeout(timeout); };
  }, []);

  const handleCopy = () => {
    navigator.clipboard?.writeText('git clone https://github.com/omarsbadrs/THINKORA.git && cd thinkora && pnpm install && pnpm dev');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pulse = (time % 120) / 120;

  // Determine which edges are "active" (data flowing)
  const activeEdgeIndices = useMemo(() => {
    const set = new Set<number>();
    const wave = Math.floor(pulse * network.edges.length);
    for (let i = 0; i < 6; i++) set.add((wave + i) % network.edges.length);
    return set;
  }, [pulse, network.edges.length]);

  // Which nodes are connected to hovered node
  const hoveredConnections = useMemo(() => {
    if (!hoveredNode) return new Set<string>();
    const s = new Set<string>();
    s.add(hoveredNode);
    network.edges.forEach(e => {
      if (e.from === hoveredNode) s.add(e.to);
      if (e.to === hoveredNode) s.add(e.from);
    });
    return s;
  }, [hoveredNode, network.edges]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap');
        :root { --bg: #0a0a0a; --silver: #e0e0e0; --accent: #ff3c00; --grain-opacity: 0.12; }
        .halide-body { background-color: var(--bg); color: var(--silver); font-family: 'Syncopate', sans-serif; overflow: hidden; height: 100vh; width: 100vw; margin: 0; display: flex; align-items: center; justify-content: center; }
        .halide-grain { position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: var(--grain-opacity); }
        .viewport { perspective: 2000px; width: 100vw; height: 100vh; display: flex; align-items: center; justify-content: center; overflow: hidden; }
        .canvas-3d { position: relative; width: 800px; height: 500px; transform-style: preserve-3d; transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
        .layer { position: absolute; inset: 0; border: 1px solid rgba(224,224,224,0.06); transition: transform 0.5s ease; overflow: hidden; }
        .layer-base { background: radial-gradient(ellipse at 50% 50%, rgba(20,20,25,1) 0%, rgba(10,10,10,1) 100%); }
        .layer-circuits { background: transparent; }
        .layer-neural { background: transparent; pointer-events: auto; cursor: default; }
        .contours { position: absolute; width: 200%; height: 200%; top: -50%; left: -50%; background-image: repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 40px, rgba(255,60,0,0.03) 41px, transparent 42px); transform: translateZ(120px); pointer-events: none; }
        .core-glow { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%) translateZ(80px); width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(255,200,60,0.1) 0%, rgba(255,60,0,0.04) 40%, transparent 70%); filter: blur(20px); pointer-events: none; animation: corePulse 4s ease-in-out infinite; }
        @keyframes corePulse { 0%,100%{opacity:0.6;transform:translate(-50%,-50%) translateZ(80px) scale(1)} 50%{opacity:1;transform:translate(-50%,-50%) translateZ(80px) scale(1.15)} }
        .interface-grid { position: fixed; inset: 0; padding: 3rem 3.5rem; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto 1fr auto; z-index: 10; pointer-events: none; }
        .hero-title { grid-column: 1 / -1; align-self: center; font-size: clamp(3rem, 10vw, 10rem); line-height: 0.85; letter-spacing: -0.04em; mix-blend-mode: difference; }
        .cta-button { pointer-events: auto; background: var(--silver); color: var(--bg); padding: 0.85rem 1.8rem; text-decoration: none; font-weight: 700; font-family: 'Syncopate', sans-serif; font-size: 0.65rem; letter-spacing: 0.08em; clip-path: polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%); transition: 0.3s; display: inline-block; }
        .cta-button:hover { background: var(--accent); color: #fff; transform: translateY(-5px); }
        .cta-outline { pointer-events: auto; background: transparent; color: var(--silver); padding: 0.7rem 1.5rem; text-decoration: none; font-weight: 700; font-family: 'Syncopate', sans-serif; font-size: 0.55rem; letter-spacing: 0.08em; border: 1px solid rgba(224,224,224,0.2); transition: 0.3s; display: inline-flex; align-items: center; gap: 0.5rem; }
        .cta-outline:hover { border-color: var(--accent); color: var(--accent); }
        .nav-row { display: flex; align-items: center; justify-content: space-between; grid-column: 1 / -1; }
        .nav-links { display: flex; align-items: center; gap: 1.5rem; pointer-events: auto; }
        .nav-link { font-family: monospace; font-size: 0.7rem; color: rgba(224,224,224,0.4); text-decoration: none; letter-spacing: 0.04em; transition: color 0.2s; }
        .nav-link:hover { color: var(--silver); }
        .nav-icon { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(224,224,224,0.12); border-radius: 6px; color: rgba(224,224,224,0.4); transition: all 0.2s; pointer-events: auto; }
        .nav-icon:hover { border-color: var(--accent); color: var(--accent); }
        .clone-bar { pointer-events: auto; display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; font-family: monospace; font-size: 0.7rem; color: rgba(224,224,224,0.5); cursor: pointer; transition: border-color 0.2s; }
        .clone-bar:hover { border-color: rgba(255,255,255,0.15); }
        .badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.3rem 0.65rem; font-family: monospace; font-size: 0.6rem; letter-spacing: 0.04em; border: 1px solid rgba(224,224,224,0.08); color: rgba(224,224,224,0.35); pointer-events: auto; transition: all 0.2s; text-decoration: none; }
        .badge:hover { border-color: var(--accent); color: var(--accent); }
        .stat-grid { display: flex; gap: 1.5rem; pointer-events: auto; }
        .stat-item { text-align: center; }
        .stat-value { font-family: 'Syncopate', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--silver); line-height: 1; }
        .stat-label { font-family: monospace; font-size: 0.55rem; color: rgba(224,224,224,0.3); margin-top: 0.25rem; letter-spacing: 0.06em; text-transform: uppercase; }
        .scroll-hint { position: absolute; bottom: 2rem; left: 50%; width: 1px; height: 60px; background: linear-gradient(to bottom, var(--silver), transparent); animation: flow 2s infinite ease-in-out; }
        @keyframes flow { 0%,100%{transform:scaleY(0);transform-origin:top} 50%{transform:scaleY(1);transform-origin:top} 51%{transform-origin:bottom} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.8s ease forwards; }
        .fade-up-d1 { animation-delay: 0.3s; opacity: 0; }
        .fade-up-d2 { animation-delay: 0.6s; opacity: 0; }
        .fade-up-d3 { animation-delay: 0.9s; opacity: 0; }
        @keyframes dataFlow { 0%{stroke-dashoffset:20} 100%{stroke-dashoffset:0} }
        @keyframes nodeAppear { from{r:0;opacity:0} to{opacity:1} }

        /* Tooltip */
        .node-tooltip {
          position: fixed; z-index: 200; pointer-events: none;
          padding: 6px 12px; border-radius: 4px;
          background: rgba(10,10,10,0.92); border: 1px solid rgba(255,255,255,0.1);
          font-family: monospace; font-size: 11px; color: #e0e0e0;
          white-space: nowrap; backdrop-filter: blur(8px);
          transform: translate(-50%, -120%);
        }
      `}</style>

      <div className="halide-body">
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" /><feColorMatrix type="saturate" values="0" /></filter>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </svg>
        <div className="halide-grain" style={{ filter: 'url(#grain)' }} />

        {/* ═══ Interface Grid ═══ */}
        <div className="interface-grid">
          <div className="nav-row fade-up">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              <Link href="/" style={{ fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.1em', color: 'var(--silver)', textDecoration: 'none', pointerEvents: 'auto' }}>THINKORA</Link>
              <div className="nav-links" style={{ marginLeft: '0.5rem' }}>
                <Link className="nav-link" href="/chat">CHAT</Link>
                <Link className="nav-link" href="/dashboard">DASHBOARD</Link>
                <Link className="nav-link" href="/files">FILES</Link>
                <Link className="nav-link" href="/connectors">CONNECTORS</Link>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a href="https://github.com/omarsbadrs/THINKORA" target="_blank" rel="noopener noreferrer" className="nav-icon" title="GitHub"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg></a>
              <a href="/docs" className="nav-icon" title="Docs"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></a>
              <Link href="/login" className="nav-link" style={{ marginLeft: '0.25rem' }}>SIGN IN</Link>
              <Link href="/signup" className="cta-outline">GET STARTED</Link>
            </div>
          </div>
          <h1 className="hero-title fade-up fade-up-d1">THINK<br />DEEPER</h1>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div className="fade-up fade-up-d2">
              <div style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'rgba(224,224,224,0.35)', marginBottom: '1rem', lineHeight: 1.8 }}>
                <p style={{ color: 'var(--accent)', fontWeight: 700 }}>[ AI COMMAND CENTER ]</p>
                <p>RAG pipeline with 15+ file parsers</p>
                <p>Intelligent model routing via OpenRouter</p>
                <p>Notion MCP &amp; Supabase MCP integrations</p>
              </div>
              <div className="clone-bar" onClick={handleCopy} title="Click to copy">
                <span style={{ color: 'rgba(224,224,224,0.2)' }}>$</span>
                <span style={{ color: 'rgba(224,224,224,0.6)' }}>git clone</span>
                <span style={{ color: 'var(--accent)' }}>omarsbadrs/THINKORA</span>
                <span style={{ color: 'rgba(224,224,224,0.3)' }}>&amp;&amp; pnpm dev</span>
                <span style={{ marginLeft: 'auto', display: 'flex' }}>
                  {copied ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <a href="https://github.com/omarsbadrs/THINKORA" target="_blank" rel="noopener noreferrer" className="badge"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 016 0C17 6.6 18 7 18 7c.6 1.7.3 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3"/></svg>STAR ON GITHUB</a>
                <span className="badge">v0.1.0</span><span className="badge">MIT</span>
              </div>
            </div>
            <div className="fade-up fade-up-d3" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1.5rem' }}>
              <div className="stat-grid">
                <div className="stat-item"><div className="stat-value">200+</div><div className="stat-label">LLM Models</div></div>
                <div className="stat-item"><div className="stat-value">15+</div><div className="stat-label">File Parsers</div></div>
                <div className="stat-item"><div className="stat-value">11</div><div className="stat-label">Agent Skills</div></div>
                <div className="stat-item"><div className="stat-value">9</div><div className="stat-label">Route Modes</div></div>
              </div>
              <div style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--accent)', fontSize: '0.65rem', lineHeight: 1.8 }}>
                <div>OPENROUTER // MODEL GATEWAY</div><div>SUPABASE // AUTH + DB + STORAGE</div><div>NOTION MCP // KNOWLEDGE SYNC</div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Link href="/chat" className="cta-button">LAUNCH APP</Link>
                <a href="https://github.com/omarsbadrs/THINKORA" target="_blank" rel="noopener noreferrer" className="cta-outline" style={{ textDecoration: 'none' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>VIEW SOURCE</a>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 3D Parallax Canvas — AI Network ═══ */}
        <div className="viewport">
          <div className="canvas-3d" ref={canvasRef}>

            {/* Layer 1: Hex substrate */}
            <div className="layer layer-base" ref={(el) => { if (el) layersRef.current[0] = el; }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
                {hexGrid.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="1" fill="rgba(255,255,255,0.03)" />)}
                {Array.from({ length: 20 }, (_, i) => <line key={`h${i}`} x1="0" y1={i * 25} x2={W} y2={i * 25} stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />)}
                {Array.from({ length: 32 }, (_, i) => <line key={`v${i}`} x1={i * 25} y1="0" x2={i * 25} y2={H} stroke="rgba(255,255,255,0.015)" strokeWidth="0.5" />)}
                {/* Column labels */}
                {['CONNECTORS', 'PROCESSING', 'CORE', 'PROVIDERS', 'OUTPUT'].map((label, i) => (
                  <text key={label} x={W * 0.08 + (i / 4) * (W * 0.84)} y={H - 8} textAnchor="middle" fill="rgba(255,255,255,0.06)" fontSize="7" fontFamily="monospace" letterSpacing="0.15em">{label}</text>
                ))}
              </svg>
            </div>

            {/* Layer 2: Circuit traces */}
            <div className="layer layer-circuits" ref={(el) => { if (el) layersRef.current[1] = el; }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
                {circuits.map((d, i) => (
                  <path key={i} d={d} fill="none"
                    stroke={i % 4 === 0 ? 'rgba(255,60,0,0.08)' : 'rgba(255,255,255,0.03)'}
                    strokeWidth={i % 4 === 0 ? 1 : 0.5}
                    strokeDasharray={i % 4 === 0 ? '4 8' : 'none'}
                    style={i % 4 === 0 ? { animation: 'dataFlow 3s linear infinite', animationDelay: `${i * 0.4}s` } : undefined} />
                ))}
              </svg>
            </div>

            {/* Layer 3: AI Network with named nodes */}
            <div className="layer layer-neural" ref={(el) => { if (el) layersRef.current[2] = el; }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: '100%' }}>
                <defs>
                  {Object.entries(CAT_COLORS).map(([cat, c]) => (
                    <radialGradient key={cat} id={`glow-${cat}`}><stop offset="0%" stopColor={c.glow} /><stop offset="100%" stopColor="transparent" /></radialGradient>
                  ))}
                </defs>

                {/* Edges */}
                {network.edges.map((e, i) => {
                  const from = nodeMap.get(e.from);
                  const to = nodeMap.get(e.to);
                  if (!from || !to) return null;
                  const isActive = activeEdgeIndices.has(i);
                  const isHighlighted = hoveredNode && hoveredConnections.has(e.from) && hoveredConnections.has(e.to);
                  const fromColor = CAT_COLORS[from.category];
                  return (
                    <line key={`e${i}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                      stroke={isHighlighted ? fromColor.stroke : isActive ? 'rgba(255,60,0,0.25)' : 'rgba(255,255,255,0.04)'}
                      strokeWidth={isHighlighted ? 2 : isActive ? 1.2 : 0.5}
                      strokeDasharray={isActive && !isHighlighted ? '3 5' : 'none'}
                      style={isActive ? { animation: 'dataFlow 1.5s linear infinite' } : undefined}
                    />
                  );
                })}

                {/* Nodes */}
                {network.nodes.map((n) => {
                  const c = CAT_COLORS[n.category];
                  const isHovered = hoveredNode === n.id;
                  const isConnected = hoveredConnections.has(n.id);
                  const isActive = isHovered || isConnected;
                  const scale = isHovered ? 1.3 : isConnected ? 1.1 : 1;
                  const r = n.r * scale;

                  return (
                    <g key={n.id}
                      onMouseEnter={() => setHoveredNode(n.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Outer glow */}
                      {isActive && <circle cx={n.x} cy={n.y} r={r * 2.5} fill={`url(#glow-${n.category})`} />}

                      {/* Ring */}
                      <circle cx={n.x} cy={n.y} r={r + 4}
                        fill="none" stroke={isActive ? c.stroke : 'rgba(255,255,255,0.04)'}
                        strokeWidth={isHovered ? 1.5 : 0.5}
                        strokeDasharray={n.category === 'core' ? 'none' : '2 3'} />

                      {/* Node body */}
                      <circle cx={n.x} cy={n.y} r={r}
                        fill={isActive ? c.fill : 'rgba(255,255,255,0.03)'}
                        stroke={isActive ? c.stroke : 'rgba(255,255,255,0.08)'}
                        strokeWidth={isHovered ? 2 : 1} />

                      {/* Short label inside */}
                      <text x={n.x} y={n.y + (n.r > 14 ? 1 : 0.5)}
                        textAnchor="middle" dominantBaseline="central"
                        fill={isActive ? c.text : 'rgba(255,255,255,0.25)'}
                        fontSize={n.r > 16 ? 8 : n.r > 12 ? 7 : 6}
                        fontFamily="monospace" fontWeight="700"
                        letterSpacing="0.05em">
                        {n.shortLabel}
                      </text>

                      {/* Full label below node */}
                      <text x={n.x} y={n.y + r + 12}
                        textAnchor="middle" fill={isActive ? c.text : 'rgba(255,255,255,0.12)'}
                        fontSize="6" fontFamily="monospace" letterSpacing="0.06em">
                        {n.label.toUpperCase()}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            <div className="core-glow" />
            <div className="contours" />
          </div>
        </div>

        <div className="scroll-hint" />
      </div>
    </>
  );
};

export default HalideLanding;
