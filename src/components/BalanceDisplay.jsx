import React, { useState, useEffect, useCallback } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

const BalanceDisplay = ({ publicKey, refreshTrigger = 0, onFaucetSuccess }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState(null);

  const fetchBalance = useCallback(async (silent = false) => {
    if (!publicKey) {
      setBalance(null);
      return;
    }
    try {
      if (!silent) setLoading(true);
      const sdk = new ClutchHubSdk(API_URL, publicKey);
      const accountBalance = await sdk.getAccountBalance(publicKey);
      setBalance(accountBalance);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setBalance(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalance();
  }, [publicKey, refreshTrigger, fetchBalance]);

  const handleFaucet = useCallback(async () => {
    if (!publicKey) return;
    setFaucetMessage(null);
    setFaucetLoading(true);
    try {
      const sdk = new ClutchHubSdk(API_URL, publicKey);
      const res = await sdk.requestFaucet(publicKey);
      if (res.ok) {
        setFaucetMessage(`+${res.amount_clt} CLT`);
        onFaucetSuccess?.();
        // Refetch balance immediately and retry (tx may take a few seconds to mine)
        fetchBalance(true);
        setTimeout(() => fetchBalance(true), 2000);
        setTimeout(() => fetchBalance(true), 5000);
      } else {
        setFaucetMessage(res.error || 'Faucet failed');
      }
    } catch (err) {
      setFaucetMessage(err?.message || 'Faucet failed');
    } finally {
      setFaucetLoading(false);
    }
  }, [publicKey, onFaucetSuccess, fetchBalance]);

  if (!publicKey) return null;

  if (loading) {
    return (
      <div className="wallet-balance" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>...</div>
    );
  }

  if (balance === null) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <div style={{ textAlign: 'right' }}>
        <span className="wallet-balance">
          {typeof balance === 'object' ? balance.toString() : balance}
        </span>
        <span className="wallet-balance-unit">CLT</span>
      </div>
      <button
        type="button"
        onClick={handleFaucet}
        disabled={faucetLoading}
        className="btn-secondary"
        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', minWidth: 'auto' }}
        title="Request test CLT from faucet"
      >
        {faucetLoading ? '...' : 'Faucet'}
      </button>
      {faucetMessage && (
        <span
          style={{
            fontSize: '0.75rem',
            color: faucetMessage.startsWith('+') ? 'var(--success, #22c55e)' : 'var(--error, #ef4444)',
          }}
        >
          {faucetMessage}
        </span>
      )}
    </div>
  );
};

export default BalanceDisplay;
