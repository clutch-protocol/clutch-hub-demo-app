import React, { useState, useEffect } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

const BalanceDisplay = ({ publicKey, refreshTrigger = 0 }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        setError(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const sdk = new ClutchHubSdk(API_URL, publicKey);
        const accountBalance = await sdk.getAccountBalance(publicKey);
        setBalance(accountBalance);
      } catch (err) {
        console.error('Error fetching balance:', err);
        setError(err.message || 'Failed to fetch balance');
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, [publicKey, refreshTrigger]);

  if (!publicKey) return null;

  return (
    <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
      <h3 className="card-title">Balance</h3>
      {loading && (
        <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Loading…</div>
      )}
      {error && (
        <div style={{ color: 'var(--error)', fontSize: '0.95rem' }}>{error}</div>
      )}
      {balance !== null && !loading && !error && (
        <div>
          <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            {typeof balance === 'object' ? balance.toString() : balance}
            <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>CLT</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', wordBreak: 'break-all' }}>
            {publicKey}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDisplay;
