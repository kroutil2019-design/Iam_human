import { useEffect, useState } from 'react';
import { User, Proof } from '../types';
import { apiGet, apiPost } from '../api/client';
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

      {error && <div className="dash-error">{error}</div>}
      {loading && <div className="dash-loading">Loading…</div>}

      {tab === 'users' && !loading && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Verified</th>
                <th>Selfie</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge badge-${u.status}`}>{u.status}</span>
                  </td>
                  <td>{u.verified_basic ? '✓' : '—'}</td>
                  <td>{u.selfie_uploaded ? '✓' : '—'}</td>
                  <td>{new Date(u.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-cell">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
