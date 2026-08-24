import { useState } from 'react';
import { useStore } from '../store/useStore';

export function OnboardingScreen() {
  const createProfile = useStore((s) => s.createProfile);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await createProfile(username);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? 'Something went wrong.');
  };

  return (
    <div className="app-shell">
      <div className="center-empty" style={{ height: '100%', gap: 18 }}>
        <div style={{ fontSize: 48 }}>🏙️✉️</div>
        <h1 style={{ margin: 0 }}>Welcome to Postmark City</h1>
        <p className="muted" style={{ maxWidth: 280, margin: 0 }}>
          Pick a username and we'll assign you a permanent digital address somewhere in the city.
        </p>
        <input
          className="text-input"
          style={{ maxWidth: 260, textAlign: 'center' }}
          placeholder="Choose a username"
          value={username}
          autoFocus
          onChange={(e) => setUsername(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
        {error && <p style={{ color: 'var(--danger)', margin: 0, fontSize: 13.5 }}>{error}</p>}
        <button className="btn btn-primary" style={{ minWidth: 200 }} disabled={submitting || !username.trim()} onClick={handleSubmit}>
          {submitting ? 'Moving in…' : 'Move In'}
        </button>
      </div>
    </div>
  );
}
