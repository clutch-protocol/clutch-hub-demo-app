import React from 'react';
import UserProfile from '../UserProfile';
import BalanceDisplay from '../BalanceDisplay';

const WalletBar = ({ role, userProfile, onProfileUpdate, refreshTrigger }) => (
  <div className="wallet-bar">
    <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
      <UserProfile role={role} onProfileUpdate={onProfileUpdate} />
      {userProfile?.publicKey && (
        <BalanceDisplay publicKey={userProfile.publicKey} refreshTrigger={refreshTrigger} />
      )}
    </div>
  </div>
);

export default WalletBar;
