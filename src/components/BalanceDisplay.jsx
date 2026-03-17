import React, { useState, useEffect } from 'react';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

const BalanceDisplay = ({ publicKey }) => {
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
  }, [publicKey]);

  if (!publicKey) {
    return null;
  }

  return (
    <div style={{
      padding: '1rem',
      backgroundColor: '#e7f3ff',
      borderRadius: '8px',
      marginBottom: '1rem',
      borderLeft: '4px solid #0066cc',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#0066cc' }}>
        Account Balance
      </h3>

      {loading && (
        <div style={{ color: '#666', fontSize: '0.95rem' }}>
          <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>⏳</span>
          Loading balance...
        </div>
      )}

      {error && (
        <div style={{ color: '#d32f2f', fontSize: '0.95rem' }}>
          <span style={{ display: 'inline-block', marginRight: '0.5rem' }}>⚠️</span>
          {error}
        </div>
      )}

      {balance !== null && !loading && !error && (
        <div>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 'bold', color: '#333' }}>Balance:</span>
            <span style={{ 
              marginLeft: '0.5rem',
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#0066cc'
            }}>
              {typeof balance === 'object' ? balance.toString() : balance}
            </span>
            <span style={{ marginLeft: '0.25rem', color: '#666' }}>CLT</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            <span style={{ fontWeight: '500' }}>Address:</span>
            <span style={{ marginLeft: '0.5rem', wordBreak: 'break-all' }}>
              {publicKey.substring(0, 10)}...{publicKey.substring(publicKey.length - 10)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceDisplay;
