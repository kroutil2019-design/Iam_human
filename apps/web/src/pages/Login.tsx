import { useState } from 'react';
import './Login.css';

interface Props {
  onLogin: (key: string) => void;
}

export default function Login({ onLogin }: Props) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/admin/users', {
        headers: { 'x-admin-key': key },
      });
      if (res.status === 403) {
        setError('Invalid admin key');
      } else {
        onLogin(key);
      }
    } catch {
      setError('Connection error – is the API running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">⬡</div>
        <h1 className="login-title">I Am Human</h1>
        <p className="login-sub">Admin Console</p>
        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="password"
            className="login-input"
            placeholder="Admin API key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            required
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Authenticating…' : 'Enter Console'}
          </button>
        </form>
      </div>
    </div>
  );
}
