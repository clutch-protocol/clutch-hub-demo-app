import React from 'react';
import UserProfile from '../UserProfile';
import BalanceDisplay from '../BalanceDisplay';

const WalletBar = ({ role, userProfile, onProfileUpdate, refreshTrigger, onFaucetSuccess }) => (
  <div className="wallet-bar">
    <div className="card">
      <UserProfile role={role} onProfileUpdate={onProfileUpdate} />
      {userProfile?.publicKey && (
        <BalanceDisplay
          publicKey={userProfile.publicKey}
          refreshTrigger={refreshTrigger}
          onFaucetSuccess={onFaucetSuccess}
        />
      )}
    </div>
  </div>
);

export default WalletBar;
