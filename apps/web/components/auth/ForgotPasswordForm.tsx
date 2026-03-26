'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthCard from './AuthCard';
import { useAuth } from '@thinkora/auth';

/**
 * Forgot-password form wrapped in AuthCard. Accepts an email address and
 * triggers a password-reset email via `resetPassword()` from the auth hook.
 * Switches to a "check your email" success state after submission.
 */
export default function ForgotPasswordForm() {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await resetPassword(email);
      if (authError) {
        setError(authError);
      } else {
        setSent(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthCard>
        <div style={{ textAlign: 'center', animation: 'scaleIn 0.4s ease' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--color-primary-bg)',
              border: '1px solid var(--color-primary-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg
              width="28"
              height="28"
              fill="none"
              viewBox="0 0 24 24"
              stroke="var(--color-primary)"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 style={{ marginBottom: 12 }}>Check your email</h1>
          <p
            style={{
              color: 'var(--color-text-tertiary)',
              fontSize: 14,
              lineHeight: 1.6,
              marginBottom: 28,
            }}
          >
            We sent a password reset link to{' '}
            <span style={{ color: 'var(--color-text)', fontWeight: 500 }}>
              {email}
            </span>
            . Please check your inbox and follow the instructions.
          </p>
          <Link
            href="/login"
            className="auth-link"
            style={{ fontSize: 14 }}
          >
            Back to sign in
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1>Forgot password</h1>
      <p className="subtitle">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      {error && (
        <div
          style={{
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            fontSize: 13,
            marginBottom: 18,
            animation: 'scaleIn 0.25s ease',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="form-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ marginTop: 6 }}
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>
      </form>

      <div className="auth-footer">
        <Link href="/login" className="auth-link">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
