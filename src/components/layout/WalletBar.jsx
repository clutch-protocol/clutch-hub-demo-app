import React from 'react';
import UserProfile from '../UserProfile';
import BalanceDisplay from '../BalanceDisplay';

const WalletBar = ({ role, userProfile, onProfileUpdate, refreshTrigger }) => (
  <div className="wallet-bar">
    <UserProfile role={role} onProfileUpdate={onProfileUpdate} />
    {userProfile?.publicKey && (
      <div className="wallet-bar-balance">
        <BalanceDisplay publicKey={userProfile.publicKey} refreshTrigger={refreshTrigger} />
      </div>
    )}
  </div>
);

export default WalletBar;
