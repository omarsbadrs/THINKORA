'use client';

import React, { useState, type FormEvent } from 'react';

/* ------------------------------------------------------------------ */
/*  Settings page                                                     */
/* ------------------------------------------------------------------ */
export default function SettingsPage() {
  const [profile, setProfile] = useState({
    name: 'Jane Doe',
    email: 'jane@thinkora.dev',
  });
  const [apiKey, setApiKey] = useState('sk-••••••••••••••••••••');
  const [modelPref, setModelPref] = useState('gpt-4o');
  const [notifications, setNotifications] = useState({
    email: true,
    slack: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sectionStyle: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--color-border-card)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    marginBottom: 20,
  };

  const sectionTitle: React.CSSProperties = {
    fontSize: 15,
    fontWeight: 600,
    color: 'var(--color-text)',
    marginBottom: 16,
  };

  return (
    <div className="page-scroll" style={{ width: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 24,
          }}
        >
          Settings
        </h1>

        <form onSubmit={handleSave}>
          {/* ---- Profile ---- */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Profile</h2>

            <div className="form-group">
              <label>Display Name</label>
              <input
                className="form-input"
                value={profile.name}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                className="form-input"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
          </section>

          {/* ---- API Keys ---- */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>API Keys</h2>

            <div className="form-group">
              <label>OpenRouter API Key</label>
              <input
                className="form-input"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
          </section>

          {/* ---- Model Preferences ---- */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Model Preferences</h2>

            <div className="form-group">
              <label>Default Model</label>
              <select
                className="form-input"
                value={modelPref}
                onChange={(e) => setModelPref(e.target.value)}
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-sonnet-4-20250514">Claude Sonnet</option>
                <option value="gemini-pro">Gemini Pro</option>
                <option value="llama-3-70b">LLaMA 3 70B</option>
              </select>
            </div>
          </section>

          {/* ---- Notifications ---- */}
          <section style={sectionStyle}>
            <h2 style={sectionTitle}>Notifications</h2>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: 'var(--color-text-secondary)',
                marginBottom: 12,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) =>
                  setNotifications((n) => ({ ...n, email: e.target.checked }))
                }
              />
              Email notifications
            </label>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={notifications.slack}
                onChange={(e) =>
                  setNotifications((n) => ({ ...n, slack: e.target.checked }))
                }
              />
              Slack notifications
            </label>
          </section>

          {/* ---- Save ---- */}
          <button type="submit" className="btn-primary">
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
