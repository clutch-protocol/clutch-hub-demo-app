import React, { useState, useEffect, useCallback } from 'react';

function truncHash(hash) {
  if (!hash || hash.length < 14) return hash || '';
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

const TransactionHistory = ({ userPublicKey, refreshTrigger, contentOnly = false }) => {
  const [transactions, setTransactions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!userPublicKey) { setTransactions([]); return; }
    const stored = localStorage.getItem(`clutch_tx_${userPublicKey}`);
    if (stored) {
      try { setTransactions(JSON.parse(stored)); } catch { setTransactions([]); }
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

  if (!userPublicKey) return null;

  if (transactions.length === 0) {
    return (
      <p style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
        No transactions yet.
      </p>
    );
  }

  const timeline = (
    <div className="timeline">
      {transactions.map((tx, index) => (
        <div key={index} className="timeline-entry">
          <span className={`timeline-dot ${tx.status === 'success' ? 'timeline-dot--success' : tx.status === 'failed' ? 'timeline-dot--failed' : ''}`} />
          <div className="timeline-header">
            <span className="timeline-type">{tx.type || 'Transaction'}</span>
            <span className="timeline-time">{timeAgo(tx.timestamp)}</span>
          </div>
          <div className="timeline-details">
            {tx.fare != null && <span>{tx.fare} CLT</span>}
            {tx.txHash && <span> &middot; {truncHash(tx.txHash)}</span>}
            {tx.status && (
              <span style={{ color: tx.status === 'success' ? 'var(--success)' : tx.status === 'failed' ? 'var(--error)' : 'var(--warning)', marginLeft: '0.35rem', fontWeight: 500 }}>
                {tx.status}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  if (contentOnly) return timeline;

  return (
    <div className="card">
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
      >
        <h3 className="card-title" style={{ margin: 0 }}>Transaction History</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{isExpanded ? '▲' : '▼'}</span>
      </div>
      {isExpanded && <div style={{ marginTop: '1rem' }}>{timeline}</div>}
    </div>
  );
};

TransactionHistory.addTransaction = (userPublicKey, transaction) => {
  let transactions = [];
  const stored = localStorage.getItem(`clutch_tx_${userPublicKey}`);
  if (stored) {
    try { transactions = JSON.parse(stored); } catch {}
  }
  const updated = [transaction, ...transactions];
  localStorage.setItem(`clutch_tx_${userPublicKey}`, JSON.stringify(updated.slice(0, 10)));
  return updated;
};

export default TransactionHistory;
