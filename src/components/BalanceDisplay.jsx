import React, { useState, useEffect, useCallback } from 'react';
import { useClutchSdk } from '../hooks/useClutchSdk';

const BalanceDisplay = ({ publicKey, onFaucetSuccess }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [faucetMessage, setFaucetMessage] = useState(null);

  const sdk = useClutchSdk(publicKey || undefined, '0x0');

  useEffect(() => {
    if (!publicKey) return undefined;

    setLoading(true);
    const dispose = sdk.subscribeAccountBalance({ publicKey }, {
      onData: (value) => {
        setBalance(value);
        setLoading(false);
      },
      onError: (err) => {
        console.error('Balance subscription error:', err);
        setLoading(false);
      },
    });

    return () => dispose();
  }, [publicKey, sdk]);

  const handleFaucet = useCallback(async () => {
    if (!publicKey) return;
    setFaucetMessage(null);
    setFaucetLoading(true);
    try {
      const res = await sdk.requestFaucet(publicKey);
      if (res.ok) {
        setFaucetMessage(`+${res.amount_clt} CLT`);
        onFaucetSuccess?.();
      } else {
        setFaucetMessage(res.error || 'Faucet failed');
      }
    } catch (err) {
      setFaucetMessage(err?.message || 'Faucet failed');
    } finally {
      setFaucetLoading(false);
    }
  }, [publicKey, onFaucetSuccess, sdk]);

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
