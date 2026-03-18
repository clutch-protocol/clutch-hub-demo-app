import React, { useState, useEffect, useCallback } from 'react';

const TransactionHistory = ({ userPublicKey, refreshTrigger }) => {
  const [transactions, setTransactions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!userPublicKey) {
      setTransactions([]);
      return;
    }
    const stored = localStorage.getItem(`clutch_tx_${userPublicKey}`);
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch {
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }
  }, [userPublicKey, refreshTrigger]);

  const addTransaction = useCallback((transaction) => {
    setTransactions((prev) => {
      const updated = [transaction, ...prev];
      if (userPublicKey) {
        localStorage.setItem(`clutch_tx_${userPublicKey}`, JSON.stringify(updated.slice(0, 10)));
      }
      return updated;
    });
  }, [userPublicKey]);

  if (!userPublicKey || transactions.length === 0) return null;

  return (
    <div className="card">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <h3 className="card-title" style={{ margin: 0 }}>Transaction History</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          {isExpanded ? '▲' : '▼'}
        </span>
      </div>
      {isExpanded && (
        <div style={{ marginTop: '1rem' }}>
          {transactions.map((tx, index) => (
            <div
              key={index}
              style={{
                padding: '1rem',
                marginBottom: index < transactions.length - 1 ? '0.75rem' : 0,
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {tx.type || 'Ride Request'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {tx.pickup && <div><strong>Pickup:</strong> ({tx.pickup.lat.toFixed(4)}, {tx.pickup.lng.toFixed(4)})</div>}
                {tx.dropoff && <div><strong>Dropoff:</strong> ({tx.dropoff.lat.toFixed(4)}, {tx.dropoff.lng.toFixed(4)})</div>}
                {tx.rideRequestTxHash && <div><strong>Request:</strong> {tx.rideRequestTxHash.substring(0, 10)}…</div>}
                <div><strong>Fare:</strong> {tx.fare} CLT</div>
                <div>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    color: tx.status === 'success' ? 'var(--success)' : tx.status === 'failed' ? 'var(--error)' : 'var(--warning)',
                  }}>
                    {tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

TransactionHistory.addTransaction = (userPublicKey, transaction) => {
  let transactions = [];
  const stored = localStorage.getItem(`clutch_tx_${userPublicKey}`);
  if (stored) {
    try {
      transactions = JSON.parse(stored);
    } catch {}
  }
  const updated = [transaction, ...transactions];
  localStorage.setItem(`clutch_tx_${userPublicKey}`, JSON.stringify(updated.slice(0, 10)));
  return updated;
};

export default TransactionHistory;
