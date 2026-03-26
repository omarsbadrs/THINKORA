'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Particles } from '@/components/ui/particles';

/* ─── Google SVG ─── */
const GoogleIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.479 14.265v-3.279h11.049c.108.571.164 1.247.164 1.979 0 2.46-.672 5.502-2.84 7.669C18.744 22.829 16.051 24 12.483 24 5.869 24 .308 18.613.308 12S5.869 0 12.483 0c3.659 0 6.265 1.436 8.223 3.307L18.392 5.62c-1.404-1.317-3.307-2.341-5.913-2.341C7.65 3.279 3.873 7.171 3.873 12s3.777 8.721 8.606 8.721c3.132 0 4.916-1.258 6.059-2.401.927-.927 1.537-2.251 1.777-4.059l-7.836.004z" />
  </svg>
);

/* ─── GitHub SVG ─── */
const GitHubIcon = (props: React.ComponentProps<'svg'>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23a11.5 11.5 0 0 1 3 0c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!name || !email || !password || !confirmPassword) { setError('Please fill in all fields.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      // TODO: integrate with Supabase auth
      console.log('Signup:', { name, email, password });
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap');
        .auth-root { background: #0a0a0a; color: #e0e0e0; min-height: 100vh; display: flex; align-items: center; justify-content: center; font-family: monospace; position: relative; overflow: hidden; }
        .auth-back { position: fixed; top: 24px; left: 24px; display: flex; align-items: center; gap: 8px; color: rgba(224,224,224,0.4); text-decoration: none; font-family: monospace; font-size: 12px; letter-spacing: 0.08em; transition: color 0.2s; z-index: 20; }
        .auth-back:hover { color: #e0e0e0; }
        .auth-card { position: relative; z-index: 10; width: 100%; max-width: 380px; padding: 0 20px; }
        .auth-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
        .auth-logo-mark { width: 30px; height: 30px; background: linear-gradient(135deg, #ff3c00, #c2631a); clip-path: polygon(0 0,100% 0,100% 70%,85% 100%,0 100%); display: flex; align-items: center; justify-content: center; font-family: 'Syncopate', sans-serif; font-weight: 700; font-size: 13px; color: #fff; }
        .auth-logo-name { font-family: 'Syncopate', sans-serif; font-weight: 700; font-size: 16px; letter-spacing: 0.1em; color: #e0e0e0; }
        .auth-heading { font-family: 'Syncopate', sans-serif; font-size: clamp(22px, 5vw, 30px); font-weight: 700; letter-spacing: -0.02em; line-height: 0.9; color: #e0e0e0; margin-bottom: 8px; }
        .auth-sub { font-family: monospace; font-size: 12px; color: rgba(224,224,224,0.35); letter-spacing: 0.04em; margin-bottom: 32px; }
        .auth-oauth-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 13px 20px; background: rgba(255,255,255,0.04); border: 1px solid rgba(224,224,224,0.12); color: rgba(224,224,224,0.8); font-family: monospace; font-size: 12px; letter-spacing: 0.06em; cursor: pointer; transition: all 0.2s; margin-bottom: 10px; }
        .auth-oauth-btn:hover { background: rgba(255,255,255,0.08); border-color: rgba(224,224,224,0.25); color: #e0e0e0; }
        .auth-divider { display: flex; align-items: center; gap: 12px; margin: 24px 0; }
        .auth-divider-line { flex: 1; height: 1px; background: rgba(224,224,224,0.08); }
        .auth-divider-text { font-family: monospace; font-size: 10px; color: rgba(224,224,224,0.2); letter-spacing: 0.1em; }
        .auth-label { display: block; font-family: monospace; font-size: 10px; letter-spacing: 0.1em; color: rgba(224,224,224,0.3); text-transform: uppercase; margin-bottom: 8px; }
        .auth-input { width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(224,224,224,0.1); color: #e0e0e0; font-family: monospace; font-size: 13px; padding: 12px 14px; outline: none; transition: border-color 0.2s; box-sizing: border-box; }
        .auth-input::placeholder { color: rgba(224,224,224,0.2); }
        .auth-input:focus { border-color: rgba(255,60,0,0.5); }
        .auth-field { margin-bottom: 16px; }
        .auth-submit { width: 100%; padding: 14px 20px; background: #ff3c00; color: #fff; font-family: 'Syncopate', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.1em; border: none; clip-path: polygon(0 0,100% 0,100% 70%,95% 100%,0 100%); cursor: pointer; transition: background 0.2s, transform 0.15s; margin-top: 4px; }
        .auth-submit:hover:not(:disabled) { background: #e03500; transform: translateY(-2px); }
        .auth-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .auth-footer { margin-top: 24px; font-family: monospace; font-size: 11px; color: rgba(224,224,224,0.25); letter-spacing: 0.04em; }
        .auth-footer a { color: rgba(224,224,224,0.5); text-decoration: none; transition: color 0.2s; }
        .auth-footer a:hover { color: #ff3c00; }
        .auth-error { padding: 10px 14px; background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171; font-family: monospace; font-size: 12px; margin-bottom: 20px; letter-spacing: 0.03em; }
        .auth-legal { margin-top: 28px; font-family: monospace; font-size: 10px; color: rgba(224,224,224,0.18); letter-spacing: 0.03em; line-height: 1.7; }
        .auth-legal a { color: rgba(224,224,224,0.3); text-decoration: underline; text-underline-offset: 3px; }
        .auth-legal a:hover { color: rgba(255,60,0,0.7); }
      `}</style>

      <div className="auth-root">
        {/* Particles */}
        <Particles
          color="#666666"
          quantity={100}
          ease={22}
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Atmospheric glows */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
          <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,60,0,0.07) 0%, transparent 70%)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,60,0,0.04) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        </div>

        {/* Grain overlay */}
        <svg style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', opacity: 0.08, pointerEvents: 'none', zIndex: 2 }}>
          <filter id="auth-grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#auth-grain)" />
        </svg>

        {/* Back link */}
        <Link href="/" className="auth-back" style={{ zIndex: 20 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
          THINKORA
        </Link>

        {/* Card */}
        <div className="auth-card" style={{ zIndex: 10 }}>
          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-mark">T</div>
            <span className="auth-logo-name">THINKORA</span>
          </div>

          {/* Heading */}
          <h1 className="auth-heading">GET<br />STARTED</h1>
          <p className="auth-sub">[ AI COMMAND CENTER // JOIN NOW ]</p>

          {/* OAuth */}
          <button type="button" className="auth-oauth-btn">
            <GoogleIcon width={14} height={14} />
            CONTINUE WITH GOOGLE
          </button>
          <button type="button" className="auth-oauth-btn">
            <GitHubIcon width={14} height={14} />
            CONTINUE WITH GITHUB
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-text">OR</span>
            <div className="auth-divider-line" />
          </div>

          {/* Error */}
          {error && <div className="auth-error">{error}</div>}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label" htmlFor="name">Full Name</label>
              <input id="name" type="text" className="auth-input" placeholder="Jane Doe"
                value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input id="email" type="email" className="auth-input" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input id="password" type="password" className="auth-input" placeholder="At least 8 characters"
                value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
              <input id="confirmPassword" type="password" className="auth-input" placeholder="Re-enter your password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT →'}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account?{' '}
            <Link href="/login">SIGN IN</Link>
          </div>

          <p className="auth-legal">
            By continuing you agree to our{' '}
            <a href="#">Terms of Service</a>{' '}
            and{' '}
            <a href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </>
  );
}
