import React, { useState, useEffect } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

const BalanceDisplay = ({ publicKey, refreshTrigger = 0 }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) {
        setBalance(null);
        return;
      }
      try {
        setLoading(true);
        const sdk = new ClutchHubSdk(API_URL, publicKey);
        const accountBalance = await sdk.getAccountBalance(publicKey);
        setBalance(accountBalance);
      } catch (err) {
        console.error('Error fetching balance:', err);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };
    fetchBalance();
  }, [publicKey, refreshTrigger]);

  if (!publicKey) return null;

  if (loading) {
    return (
      <div className="wallet-balance" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>...</div>
    );
  }

  if (balance === null) return null;

  return (
    <div style={{ textAlign: 'right' }}>
      <span className="wallet-balance">
        {typeof balance === 'object' ? balance.toString() : balance}
      </span>
      <span className="wallet-balance-unit">CLT</span>
    </div>
  );
};

export default BalanceDisplay;
