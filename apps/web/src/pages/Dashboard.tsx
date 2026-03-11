import { useEffect, useState } from 'react';
import { User, Proof } from '../types';
import { apiGet, apiPost } from '../api/client';
import {
  ActionIndexSnapshot,
  EMPTY_ACTION_INDEX,
  fetchActionIndex,
  topEntries,
} from './action-index.ts';
import './Dashboard.css';

interface Props {
  adminKey: string;
  onLogout: () => void;
}

export default function Dashboard({ adminKey, onLogout }: Props) {
  const [tab, setTab] = useState<'users' | 'proofs'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [verificationFilter, setVerificationFilter] = useState('all');
  const [actionIndex, setActionIndex] = useState<ActionIndexSnapshot>(EMPTY_ACTION_INDEX);
  const [actionIndexError, setActionIndexError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getVerificationState = (user: User): 'verified' | 'unverified' => {
    return user.verified_basic ? 'verified' : 'unverified';
  };

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ users: User[] }>('/admin/users', adminKey);
      setUsers(data.users);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadProofs = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGet<{ proofs: Proof[] }>('/admin/proofs', adminKey);
      setProofs(data.proofs);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'users') loadUsers();
    else loadProofs();
  }, [tab]);

  useEffect(() => {
    let cancelled = false;

    const loadActionIndex = async () => {
      try {
        const snapshot = await fetchActionIndex(adminKey);
        if (!cancelled) {
          setActionIndex(snapshot);
          setActionIndexError('');
        }
      } catch {
        if (!cancelled) {
          setActionIndexError('Unable to load trust-fabric index');
        }
      }
    };

    loadActionIndex();
    const interval = window.setInterval(loadActionIndex, 10000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [adminKey]);

  const revokeProof = async (tokenId: string) => {
    const reason = prompt('Revoke reason:');
    if (!reason) return;
    try {
      await apiPost('/admin/proofs/invalidate', { token_id: tokenId, reason }, adminKey);
      loadProofs();
    } catch (e) {
      alert(`Failed to revoke: ${String(e)}`);
    }
  };

  const filteredProofs =
    statusFilter === 'all' ? proofs : proofs.filter((p) => p.status === statusFilter);

  const filteredUsers =
    verificationFilter === 'all'
      ? users
      : users.filter((u) => getVerificationState(u) === verificationFilter);

  const topIntents = topEntries(actionIndex.byIntent);
  const topFailureReasons = topEntries(actionIndex.byFailureReason);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-brand">
          <span className="dash-logo">⬡</span>
          <span className="dash-title">I Am Human – Admin</span>
        </div>
        <button className="btn-ghost" onClick={onLogout}>
          Logout
        </button>
      </header>

      <div className="dash-tabs">
        <button
          className={`tab-btn ${tab === 'users' ? 'active' : ''}`}
          onClick={() => setTab('users')}
        >
          Users
        </button>
        <button
          className={`tab-btn ${tab === 'proofs' ? 'active' : ''}`}
          onClick={() => setTab('proofs')}
        >
          Proofs
        </button>
      </div>

      <section className="index-card" aria-label="Trust fabric action index">
        <div className="index-card-header">
          <h2 className="index-title">Trust Fabric Index</h2>
          {actionIndexError && <span className="index-error">{actionIndexError}</span>}
        </div>

        <div className="index-metrics-grid">
          <div className="index-metric">
            <span className="index-label">Total Received</span>
            <strong className="index-value">{actionIndex.totals.received}</strong>
          </div>
          <div className="index-metric">
            <span className="index-label">Total Passed</span>
            <strong className="index-value">{actionIndex.totals.passed}</strong>
          </div>
          <div className="index-metric">
            <span className="index-label">Total Failed</span>
            <strong className="index-value">{actionIndex.totals.failed}</strong>
          </div>
          <div className="index-metric">
            <span className="index-label">Polarity +</span>
            <strong className="index-value">{actionIndex.totals.polarityPositive}</strong>
          </div>
          <div className="index-metric">
            <span className="index-label">Polarity -</span>
            <strong className="index-value">{actionIndex.totals.polarityNegative}</strong>
          </div>
        </div>

        <div className="index-lists">
          <div className="index-list-block">
            <h3 className="index-subtitle">Top Intents</h3>
            {topIntents.length === 0 ? (
              <p className="index-empty">No intent activity yet</p>
            ) : (
              <ul className="index-list">
                {topIntents.map(([intent, count]) => (
                  <li key={intent}>
                    <span className="index-item-label">{intent}</span>
                    <span className="index-item-value">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="index-list-block">
            <h3 className="index-subtitle">Top Failure Reasons</h3>
            {topFailureReasons.length === 0 ? (
              <p className="index-empty">No failures recorded</p>
            ) : (
              <ul className="index-list">
                {topFailureReasons.map(([reason, count]) => (
                  <li key={reason}>
                    <span className="index-item-label">{reason}</span>
                    <span className="index-item-value">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {error && <div className="dash-error">{error}</div>}
      {loading && <div className="dash-loading">Loading…</div>}

      {tab === 'users' && !loading && (
        <>
          <div className="filter-bar">
            <label className="filter-label">Verification:</label>
            <select
              className="filter-select"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
          <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const verificationState = getVerificationState(u);
                const verificationLabel = verificationState === 'verified' ? 'Verified' : 'Unverified';

                return (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.status}`}>{u.status}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${verificationState}`}>{verificationLabel}</span>
                  </td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
                );
              })}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-cell">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </>
      )}

      {tab === 'proofs' && !loading && (
        <>
          <div className="filter-bar">
            <label className="filter-label">Filter:</label>
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User Email</th>
                  <th>Token ID</th>
                  <th>Status</th>
                  <th>Issued</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredProofs.map((p) => (
                  <tr key={p.id}>
                    <td>{p.user_email}</td>
                    <td className="mono">{p.token_id.slice(0, 8)}…</td>
                    <td>
                      <span className={`badge badge-${p.status}`}>{p.status}</span>
                    </td>
                    <td>{new Date(p.issued_at).toLocaleString()}</td>
                    <td>{new Date(p.expires_at).toLocaleString()}</td>
                    <td>
                      {p.status === 'active' && (
                        <button
                          className="btn-danger-sm"
                          onClick={() => revokeProof(p.token_id)}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredProofs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty-cell">No proofs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
