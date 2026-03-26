"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════════════════════
   Interactive 3D Robot + Halide Parallax + Minimal Grid Lines Hero
   ═══════════════════════════════════════════════════════════════════ */

export default function MinimalHero() {
  const particleRef = useRef<HTMLCanvasElement | null>(null);
  const robotRef = useRef<HTMLDivElement>(null);
  const layersRef = useRef<HTMLDivElement[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [eyeTarget, setEyeTarget] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  /* ─── Particle Canvas ─── */
  useEffect(() => {
    const canvas = particleRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setSize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    setSize();

    type P = { x: number; y: number; speed: number; opacity: number; fadeDelay: number; fadeStart: number; fadingOut: boolean };
    let particles: P[] = [];
    let raf = 0;

    const count = () => Math.floor((canvas.width * canvas.height) / 9000);
    const make = (): P => {
      const fadeDelay = Math.random() * 600 + 100;
      return { x: Math.random() * canvas.width, y: Math.random() * canvas.height, speed: Math.random() / 5 + 0.08, opacity: 0.5, fadeDelay, fadeStart: Date.now() + fadeDelay, fadingOut: false };
    };
    const reset = (p: P) => { p.x = Math.random() * canvas.width; p.y = Math.random() * canvas.height; p.speed = Math.random() / 5 + 0.08; p.opacity = 0.5; p.fadeDelay = Math.random() * 600 + 100; p.fadeStart = Date.now() + p.fadeDelay; p.fadingOut = false; };
    const init = () => { particles = []; for (let i = 0; i < count(); i++) particles.push(make()); };
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        if (p.y < 0) reset(p);
        if (!p.fadingOut && Date.now() > p.fadeStart) p.fadingOut = true;
        if (p.fadingOut) { p.opacity -= 0.008; if (p.opacity <= 0) reset(p); }
        ctx.fillStyle = `rgba(250, 250, 250, ${p.opacity})`;
        ctx.fillRect(p.x, p.y, 0.5, Math.random() * 1.5 + 0.5);
      });
      raf = requestAnimationFrame(draw);
    };
    const onResize = () => { setSize(); init(); };
    window.addEventListener("resize", onResize);
    init();
    raf = requestAnimationFrame(draw);
    return () => { window.removeEventListener("resize", onResize); cancelAnimationFrame(raf); };
  }, []);

  /* ─── 3D Robot Parallax + Eye Tracking ─── */
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const x = (window.innerWidth / 2 - e.clientX) / 25;
    const y = (window.innerHeight / 2 - e.clientY) / 25;
    setMousePos({ x, y });

    // Eye tracking — normalized -1 to 1
    const ex = (e.clientX / window.innerWidth - 0.5) * 2;
    const ey = (e.clientY / window.innerHeight - 0.5) * 2;
    setEyeTarget({ x: ex * 6, y: ey * 4 });

    // Rotate 3D robot container
    const robot = robotRef.current;
    if (robot) {
      robot.style.transform = `rotateX(${12 + y * 0.8}deg) rotateY(${x * 0.6}deg) rotateZ(${x * 0.15}deg)`;
    }

    // Parallax layers
    layersRef.current.forEach((layer, index) => {
      if (!layer) return;
      const depth = (index + 1) * 20;
      const moveX = x * (index + 1) * 0.3;
      const moveY = y * (index + 1) * 0.3;
      layer.style.transform = `translateZ(${depth}px) translate(${moveX}px, ${moveY}px)`;
    });
  }, []);

  useEffect(() => {
    // Entrance animation
    const robot = robotRef.current;
    if (robot) {
      robot.style.opacity = '0';
      robot.style.transform = 'rotateX(60deg) rotateY(0deg) scale(0.7)';
      setTimeout(() => {
        robot.style.transition = 'all 2s cubic-bezier(0.16, 1, 0.3, 1)';
        robot.style.opacity = '1';
        robot.style.transform = 'rotateX(12deg) rotateY(0deg) scale(1)';
      }, 400);
    }
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  return (
    <section className="hero-root">
      <style>{`
@import url('https://fonts.cdnfonts.com/css/hubot-sans');

.hero-root, .hero-root * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

.hero-root {
  position: fixed; inset: 0; width: 100vw; height: 100vh; overflow: hidden;
  --bg: #0a0a0a; --fg: #fafafa; --muted: #a1a1aa; --border: #27272a; --accent: #ff3c00;
  background: var(--bg); color: var(--fg);
  font-family: 'Hubot Sans', ui-sans-serif, system-ui, -apple-system, sans-serif;
}

/* ─── Header ─── */
.h-bar {
  position: absolute; top: 0; left: 0; right: 0; z-index: 30;
  padding: 20px 28px; display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.h-brand { font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); text-decoration: none; font-weight: 600; }
.h-links { display: flex; align-items: center; gap: 18px; }
.h-link { font-size: 13px; color: #52525b; text-decoration: none; transition: color 0.2s; }
.h-link:hover { color: var(--fg); }
.h-btn { height: 34px; padding: 0 16px; border-radius: 8px; font-size: 13px; font-weight: 500; text-decoration: none; display: inline-flex; align-items: center; transition: all 0.2s; }
.h-btn-ghost { background: transparent; color: var(--muted); border: 1px solid var(--border); }
.h-btn-ghost:hover { background: #18181b; color: var(--fg); }
.h-btn-solid { background: var(--fg); color: var(--bg); border: none; font-weight: 600; }
.h-btn-solid:hover { opacity: 0.85; }

/* ─── Grid Lines (animated) ─── */
.grid-lines { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
.hl, .vl { position: absolute; background: var(--border); opacity: 0; will-change: transform, opacity; }
.hl { height: 1px; left: 0; right: 0; transform: scaleX(0); transform-origin: 50% 50%; animation: dx 900ms cubic-bezier(.22,.61,.36,1) forwards; }
.vl { width: 1px; top: 0; bottom: 0; transform: scaleY(0); transform-origin: 50% 0%; animation: dy 1000ms cubic-bezier(.22,.61,.36,1) forwards; }
.hl:nth-child(1){ top: 22%; animation-delay: 150ms; }
.hl:nth-child(2){ top: 50%; animation-delay: 300ms; }
.hl:nth-child(3){ top: 78%; animation-delay: 450ms; }
.vl:nth-child(4){ left: 22%; animation-delay: 550ms; }
.vl:nth-child(5){ left: 50%; animation-delay: 700ms; }
.vl:nth-child(6){ left: 78%; animation-delay: 850ms; }
.hl::after, .vl::after {
  content:""; position:absolute; inset:0;
  background: linear-gradient(90deg, transparent, rgba(250,250,250,.2), transparent);
  opacity:0; animation: shm 1000ms ease-out forwards;
}
.hl:nth-child(1)::after{ animation-delay: 150ms; }
.hl:nth-child(2)::after{ animation-delay: 300ms; }
.hl:nth-child(3)::after{ animation-delay: 450ms; }
.vl:nth-child(4)::after{ animation-delay: 550ms; }
.vl:nth-child(5)::after{ animation-delay: 700ms; }
.vl:nth-child(6)::after{ animation-delay: 850ms; }
@keyframes dx { 0%{transform:scaleX(0);opacity:0} 60%{opacity:.8} 100%{transform:scaleX(1);opacity:.6} }
@keyframes dy { 0%{transform:scaleY(0);opacity:0} 60%{opacity:.8} 100%{transform:scaleY(1);opacity:.6} }
@keyframes shm { 0%{opacity:0} 30%{opacity:.25} 100%{opacity:0} }

/* ─── Particles ─── */
.ptc { position: absolute; inset: 0; pointer-events: none; mix-blend-mode: screen; opacity: .5; z-index: 2; }

/* ─── Grain ─── */
.grain { position: absolute; inset: 0; pointer-events: none; z-index: 99; opacity: 0.08; }

/* ─── 3D Viewport ─── */
.vp {
  position: absolute; inset: 0; z-index: 3;
  perspective: 1800px; display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.robot-rig {
  position: relative; width: 340px; height: 400px;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

/* ─── Robot Body (CSS 3D) ─── */
.r-head {
  position: absolute; left: 50%; top: 0; transform: translateX(-50%) translateZ(40px);
  width: 160px; height: 140px; border-radius: 24px 24px 16px 16px;
  background: linear-gradient(180deg, #1a1a1a 0%, #111 100%);
  border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04);
  display: flex; align-items: center; justify-content: center; gap: 28px;
  transition: box-shadow 0.4s;
}
.r-head.glow { box-shadow: 0 20px 80px rgba(255,60,0,0.15), 0 0 40px rgba(255,60,0,0.08), inset 0 1px 0 rgba(255,255,255,0.04); }

.r-eye {
  width: 32px; height: 32px; border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #333 0%, #1a1a1a 100%);
  border: 1px solid rgba(255,255,255,0.05);
  position: relative; overflow: hidden;
  transition: all 0.3s;
}
.r-eye.active { border-color: rgba(255,60,0,0.3); }
.r-pupil {
  width: 12px; height: 12px; border-radius: 50%;
  background: radial-gradient(circle, #ff3c00 0%, #cc2200 70%);
  box-shadow: 0 0 12px rgba(255,60,0,0.6), 0 0 4px rgba(255,60,0,0.9);
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  transition: transform 0.15s ease-out, width 0.3s, height 0.3s;
}
.r-pupil.dilated { width: 16px; height: 16px; }

.r-visor {
  position: absolute; left: 50%; top: 20px; transform: translateX(-50%) translateZ(50px);
  width: 120px; height: 4px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,60,0,0.4), transparent);
  opacity: 0.6;
}

.r-antenna {
  position: absolute; left: 50%; top: -20px; transform: translateX(-50%) translateZ(60px);
  width: 2px; height: 20px; background: #333;
}
.r-antenna-tip {
  position: absolute; left: 50%; top: -28px; transform: translateX(-50%) translateZ(65px);
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--accent); box-shadow: 0 0 12px rgba(255,60,0,0.7);
  animation: blink 3s ease-in-out infinite;
}
@keyframes blink { 0%,80%,100%{opacity:1} 90%{opacity:0.3} }

.r-neck {
  position: absolute; left: 50%; top: 135px; transform: translateX(-50%) translateZ(30px);
  width: 40px; height: 20px; background: #151515; border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.03);
}

.r-torso {
  position: absolute; left: 50%; top: 155px; transform: translateX(-50%) translateZ(20px);
  width: 200px; height: 160px; border-radius: 16px;
  background: linear-gradient(180deg, #141414 0%, #0d0d0d 100%);
  border: 1px solid rgba(255,255,255,0.05);
  box-shadow: 0 30px 80px rgba(0,0,0,0.5);
}

.r-chest-light {
  position: absolute; left: 50%; top: 185px; transform: translateX(-50%) translateZ(30px);
  width: 24px; height: 24px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,60,0,0.15) 0%, transparent 70%);
  border: 1px solid rgba(255,60,0,0.2);
  animation: pulse-light 4s ease-in-out infinite;
}
@keyframes pulse-light { 0%,100%{box-shadow: 0 0 20px rgba(255,60,0,0.1)} 50%{box-shadow: 0 0 40px rgba(255,60,0,0.3)} }

.r-arm {
  position: absolute; top: 170px; width: 30px; height: 100px;
  background: linear-gradient(180deg, #151515, #0e0e0e);
  border: 1px solid rgba(255,255,255,0.04); border-radius: 8px;
  transition: transform 0.5s ease;
}
.r-arm-l { left: calc(50% - 130px); transform: translateZ(15px) rotate(5deg); }
.r-arm-r { left: calc(50% + 100px); transform: translateZ(15px) rotate(-5deg); }
.r-arm-l.wave { transform: translateZ(15px) rotate(-15deg) translateY(-10px); }
.r-arm-r.wave { transform: translateZ(15px) rotate(15deg) translateY(-10px); }

/* ─── Contour rings ─── */
.contour-rings {
  position: absolute; inset: -50%; width: 200%; height: 200%;
  background-image: repeating-radial-gradient(circle at 50% 50%, transparent 0, transparent 50px, rgba(255,255,255,0.025) 51px, transparent 52px);
  transform: translateZ(-10px);
  pointer-events: none; opacity: 0.7;
}

/* ─── Platform ─── */
.r-platform {
  position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%) translateZ(0px) rotateX(70deg);
  width: 260px; height: 120px;
  background: radial-gradient(ellipse at center, rgba(255,60,0,0.06) 0%, transparent 70%);
  border: 1px solid rgba(255,255,255,0.03); border-radius: 50%;
}

/* ─── Hero Text ─── */
.hero-center {
  position: absolute; inset: 0; z-index: 20;
  display: grid; place-items: center; text-align: center;
  pointer-events: none;
}
.hero-center > div { pointer-events: auto; }
.hero-kicker {
  font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 14px;
}
.hero-title {
  font-weight: 600; font-size: clamp(32px, 8vw, 80px);
  line-height: 0.92; margin: 0; color: var(--fg);
  mix-blend-mode: difference;
}
.hero-sub {
  margin-top: 16px; font-size: clamp(14px, 2vw, 17px);
  color: var(--muted); max-width: 480px; line-height: 1.6;
}
.hero-ctas {
  display: flex; gap: 12px; justify-content: center; margin-top: 28px;
  pointer-events: auto;
}

/* ─── HUD corners ─── */
.hud { position: absolute; z-index: 25; pointer-events: none; }
.hud-tl { top: 68px; left: 28px; font-family: monospace; font-size: 11px; color: #333; line-height: 1.8; }
.hud-tr { top: 68px; right: 28px; font-family: monospace; font-size: 11px; color: var(--accent); text-align: right; line-height: 1.8; }
.hud-bl { bottom: 28px; left: 28px; font-family: monospace; font-size: 11px; color: #333; }
.hud-br { bottom: 28px; right: 28px; pointer-events: auto; }

/* ─── Scroll Indicator ─── */
.scroll-line {
  position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); z-index: 25;
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  color: #333; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase;
}
.scroll-bar {
  width: 1px; height: 40px;
  background: linear-gradient(to bottom, #333, transparent);
  animation: sflow 2.5s ease-in-out infinite;
}
@keyframes sflow {
  0%,100% { transform: scaleY(0); transform-origin: top; }
  50% { transform: scaleY(1); transform-origin: top; }
  51% { transform-origin: bottom; }
}
      `}</style>

      {/* Grain overlay */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" /><feColorMatrix type="saturate" values="0" /></filter>
      </svg>
      <div className="grain" style={{ filter: 'url(#grain)' }} />

      {/* Grid lines */}
      <div className="grid-lines">
        <div className="hl" /><div className="hl" /><div className="hl" />
        <div className="vl" /><div className="vl" /><div className="vl" />
      </div>

      {/* Particles */}
      <canvas ref={particleRef} className="ptc" />

      {/* Header */}
      <header className="h-bar">
        <Link className="h-brand" href="/">THINKORA</Link>
        <div className="h-links">
          <Link className="h-link" href="/chat">Chat</Link>
          <Link className="h-link" href="/dashboard">Dashboard</Link>
          <Link className="h-link" href="/files">Files</Link>
          <Link className="h-link" href="/connectors">Connectors</Link>
          <Link className="h-btn h-btn-ghost" href="/login">Sign In</Link>
          <Link className="h-btn h-btn-solid" href="/signup">Get Started</Link>
        </div>
      </header>

      {/* HUD corners */}
      <div className="hud hud-tl">
        <div>SYS.STATUS: ONLINE</div>
        <div>AGENT.CORE: v0.1.0</div>
        <div>SKILLS: 11 LOADED</div>
      </div>
      <div className="hud hud-tr">
        <div>MODELS: 200+ ACTIVE</div>
        <div>RAG: SEMANTIC + HYBRID</div>
        <div>MCP: NOTION / SUPABASE</div>
      </div>
      <div className="hud hud-bl">
        <span>[ AI COMMAND CENTER ]</span>
      </div>
      <div className="hud hud-br">
        <Link href="/chat" style={{
          background: '#e0e0e0', color: '#0a0a0a', padding: '10px 24px',
          textDecoration: 'none', fontWeight: 700, fontSize: 12,
          fontFamily: 'monospace', letterSpacing: '0.06em',
          clipPath: 'polygon(0 0, 100% 0, 100% 70%, 85% 100%, 0 100%)',
          transition: '0.3s', display: 'inline-block',
        }}>
          EXPLORE DEPTH
        </Link>
      </div>

      {/* 3D Robot */}
      <div className="vp">
        <div className="robot-rig" ref={robotRef}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Contour rings background */}
          <div className="contour-rings" ref={(el) => { if (el) layersRef.current[0] = el; }} />

          {/* Antenna */}
          <div className="r-antenna" ref={(el) => { if (el) layersRef.current[1] = el; }} />
          <div className="r-antenna-tip" />

          {/* Head */}
          <div className={`r-head ${isHovering ? 'glow' : ''}`} ref={(el) => { if (el) layersRef.current[2] = el; }}>
            {/* Left eye */}
            <div className={`r-eye ${isHovering ? 'active' : ''}`}>
              <div
                className={`r-pupil ${isHovering ? 'dilated' : ''}`}
                style={{ transform: `translate(calc(-50% + ${eyeTarget.x}px), calc(-50% + ${eyeTarget.y}px))` }}
              />
            </div>
            {/* Right eye */}
            <div className={`r-eye ${isHovering ? 'active' : ''}`}>
              <div
                className={`r-pupil ${isHovering ? 'dilated' : ''}`}
                style={{ transform: `translate(calc(-50% + ${eyeTarget.x}px), calc(-50% + ${eyeTarget.y}px))` }}
              />
            </div>
          </div>

          {/* Visor strip */}
          <div className="r-visor" />

          {/* Neck */}
          <div className="r-neck" />

          {/* Torso */}
          <div className="r-torso" ref={(el) => { if (el) layersRef.current[3] = el; }} />
          <div className="r-chest-light" />

          {/* Arms */}
          <div className={`r-arm r-arm-l ${isHovering ? 'wave' : ''}`} />
          <div className={`r-arm r-arm-r ${isHovering ? 'wave' : ''}`} />

          {/* Platform glow */}
          <div className="r-platform" />
        </div>
      </div>

      {/* Hero Text (over everything via mix-blend-mode) */}
      <main className="hero-center">
        <div>
          <div className="hero-kicker">AI Command Center</div>
          <h1 className="hero-title">Think deeper.<br/>Ship smarter.</h1>
          <p className="hero-sub">
            Unified AI assistant with RAG, intelligent model routing across
            200+ LLMs, and seamless Notion &amp; Supabase MCP integrations.
          </p>
          <div className="hero-ctas">
            <Link className="h-btn h-btn-solid" href="/signup" style={{ height: 40, padding: '0 22px', fontSize: 14, borderRadius: 10 }}>
              Start Building
            </Link>
            <Link className="h-btn h-btn-ghost" href="/chat" style={{ height: 40, padding: '0 22px', fontSize: 14, borderRadius: 10 }}>
              Try Demo
            </Link>
          </div>
        </div>
      </main>

      {/* Scroll indicator */}
      <div className="scroll-line">
        <span>Scroll</span>
        <div className="scroll-bar" />
      </div>
    </section>
  );
}
