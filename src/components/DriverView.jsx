import React, { useState, useCallback } from 'react';
import UserProfile from './UserProfile';
import BalanceDisplay from './BalanceDisplay';
import TransactionHistory from './TransactionHistory';

const DriverView = () => {
  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [isOnline, setIsOnline] = useState(false);
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);

  return (
    <div>
      <UserProfile onProfileUpdate={handleProfileUpdate} />
      <BalanceDisplay publicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} />

      <div className="card">
        <h3 className="card-title">Driver status</h3>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
            {isOnline ? 'You are online and accepting rides' : 'You are offline'}
          </span>
          <button
            type="button"
            className={isOnline ? 'btn-danger' : 'btn-primary'}
            onClick={() => setIsOnline(!isOnline)}
          >
            {isOnline ? 'Go offline' : 'Go online'}
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {isOnline
            ? 'Ride requests will appear here when passengers submit them.'
            : 'Connect your wallet and go online to start accepting rides.'}
        </p>
      </div>

      <div className="card">
        <h3 className="card-title">Available rides</h3>
        {userProfile.publicKey && isOnline ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No ride requests yet. When passengers request rides, they will appear here for you to accept.
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Connect your wallet and go online to see available rides.
          </div>
        )}
      </div>

      <TransactionHistory userPublicKey={userProfile.publicKey} />
    </div>
  );
};

export default DriverView;
