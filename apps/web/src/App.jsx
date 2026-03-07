import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  return res.json();
}

export default function App() {
  const [token, setToken] = useState(null);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [step, setStep] = useState('phone');
  const [message, setMessage] = useState('');
  const [proof, setProof] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);

  const requestOtp = async () => {
    const data = await apiPost('/auth/request-otp', { phone });
    setMessage(data.message || data.error);
    if (!data.error) setStep('otp');
  };

  const verifyOtp = async () => {
    const data = await apiPost('/auth/verify-otp', { phone, otp });
    if (data.token) {
      setToken(data.token);
      setStep('dashboard');
      setMessage('Authenticated successfully');
    } else {
      setMessage(data.error || 'Authentication failed');
    }
  };

  const issueProof = async () => {
    const data = await apiPost('/proofs/human', {}, token);
    if (data.token) {
      setProof(data);
      setMessage('Human Proof Token issued');
    } else {
      setMessage(data.error || 'Failed to issue proof');
    }
  };

  const getCurrentProof = async () => {
    const data = await apiGet('/proofs/current', token);
    if (data.token) {
      setProof(data);
      setMessage('Current proof loaded');
    } else {
      setMessage(data.error || 'No active proof');
    }
  };

  const verifyProof = async () => {
    const data = await apiPost('/proofs/verify', { token: verifyToken });
    setVerifyResult(data);
  };

  const logout = () => {
    setToken(null);
    setStep('phone');
    setPhone('');
    setOtp('');
    setProof(null);
    setVerifyResult(null);
    setMessage('');
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>I Am Human</h1>
      <p style={styles.subtitle}>Admin Console</p>

      {message && <div style={styles.message}>{message}</div>}

      {step === 'phone' && (
        <div style={styles.card}>
          <h2>Sign In</h2>
          <input
            style={styles.input}
            type="tel"
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <button style={styles.button} onClick={requestOtp}>
            Request OTP
          </button>
        </div>
      )}

      {step === 'otp' && (
        <div style={styles.card}>
          <h2>Enter OTP</h2>
          <p style={styles.hint}>Check your phone (or server logs in development)</p>
          <input
            style={styles.input}
            type="text"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
          />
          <button style={styles.button} onClick={verifyOtp}>
            Verify OTP
          </button>
        </div>
      )}

      {step === 'dashboard' && (
        <div>
          <div style={styles.card}>
            <h2>Human Proof Tokens</h2>
            <div style={styles.buttonRow}>
              <button style={styles.button} onClick={issueProof}>
                Issue Proof Token
              </button>
              <button style={{ ...styles.button, ...styles.secondary }} onClick={getCurrentProof}>
                Get Current Proof
              </button>
            </div>
            {proof && (
              <div style={styles.proofBox}>
                <strong>Token:</strong>
                <code style={styles.code}>{proof.token}</code>
                <div>Issued: {new Date(proof.issued_at).toLocaleString()}</div>
                {proof.expires_at && (
                  <div>Expires: {new Date(proof.expires_at).toLocaleString()}</div>
                )}
              </div>
            )}
          </div>

          <div style={styles.card}>
            <h2>Verify a Token</h2>
            <input
              style={styles.input}
              type="text"
              placeholder="Paste token here"
              value={verifyToken}
              onChange={(e) => setVerifyToken(e.target.value)}
            />
            <button style={styles.button} onClick={verifyProof}>
              Verify
            </button>
            {verifyResult && (
              <div style={{ ...styles.proofBox, background: verifyResult.valid ? '#d4edda' : '#f8d7da' }}>
                <strong>{verifyResult.valid ? '✅ Valid' : '❌ Invalid'}</strong>
                {verifyResult.reason && <div>Reason: {verifyResult.reason}</div>}
                {verifyResult.issuedAt && (
                  <div>Issued: {new Date(verifyResult.issuedAt).toLocaleString()}</div>
                )}
              </div>
            )}
          </div>

          <button style={{ ...styles.button, ...styles.danger }} onClick={logout}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '0 auto',
    padding: '2rem',
    fontFamily: 'system-ui, sans-serif',
  },
  title: {
    fontSize: '2rem',
    margin: 0,
    color: '#1a1a2e',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
    marginBottom: '2rem',
  },
  card: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '0.6rem 0.8rem',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: 4,
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  button: {
    background: '#1a1a2e',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '0.6rem 1.2rem',
    fontSize: '1rem',
    cursor: 'pointer',
    marginRight: 8,
  },
  secondary: {
    background: '#6c757d',
  },
  danger: {
    background: '#dc3545',
  },
  buttonRow: {
    display: 'flex',
    marginBottom: '1rem',
  },
  message: {
    background: '#e8f4fd',
    border: '1px solid #bee5eb',
    borderRadius: 4,
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
    color: '#0c5460',
  },
  hint: {
    color: '#888',
    fontSize: '0.9rem',
    marginTop: -8,
    marginBottom: 8,
  },
  proofBox: {
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: 4,
    padding: '0.75rem',
    marginTop: '1rem',
    fontSize: '0.9rem',
  },
  code: {
    display: 'block',
    wordBreak: 'break-all',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    margin: '4px 0',
    color: '#495057',
  },
};
