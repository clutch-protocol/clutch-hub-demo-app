import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';

const NetworkView = () => {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL.replace(/\/$/, '')}/health`);
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError(err.message || 'Failed to reach API');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <div className="card">
        <h3 className="card-title">Network status</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          View the Clutch blockchain network state. No wallet required.
        </p>

        {loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Checking…</div>
        )}
        {error && (
          <div className="status-banner error">{error}</div>
        )}
        {health && !loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: health.status === 'healthy' ? 'var(--success)' : 'var(--error)',
                }}
              />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Hub API: {health.status || 'unknown'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Service: {health.service || 'clutch-hub-api'}
            </div>
            {health.timestamp && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Last check: {new Date(health.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Platform overview</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Node</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Blockchain core with Aura consensus. Validates and broadcasts transactions.
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Hub API</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Bridge between apps and the node. GraphQL and REST endpoints.
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch SDK</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Client-side transaction signing and encoding for ride requests and more.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NetworkView;
