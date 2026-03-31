import React from 'react';
import { WalletBar } from './layout';

const ROLE_STORAGE_KEY = 'clutch_demo_role';

export function persistRole(roleId) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ROLE_STORAGE_KEY, roleId);
    }
  } catch {
    // ignore storage failures; role will just not persist
  }
}

const RoleEntry = ({
  selectedRole,
  onSelectRole,
  userProfile,
  onProfileUpdate,
  refreshTrigger,
  onFaucetSuccess,
}) => {
  return (
    <div className="role-entry">
      <div className="role-entry-header">
        <img src="/clutch-logo.svg" alt="Clutch" className="role-entry-logo" width={40} height={40} />
        <h1 className="role-entry-title">Select your role</h1>
        <p className="role-entry-subtitle">
          Choose how you want to use Clutch. You can switch later from Settings.
        </p>
      </div>

      {!selectedRole ? (
        <div className="role-entry-buttons" aria-label="Select your role">
          <button
            type="button"
            className="role-entry-button role-entry-button--driver"
            onClick={() => onSelectRole('driver')}
          >
            <span className="role-entry-emoji" aria-hidden="true">
              🚗
            </span>
            <div className="role-entry-text">
              <span className="role-entry-label">Driver</span>
              <span className="role-entry-hint">Accept rides and track earnings.</span>
            </div>
          </button>

          <button
            type="button"
            className="role-entry-button role-entry-button--passenger"
            onClick={() => onSelectRole('passenger')}
          >
            <span className="role-entry-emoji" aria-hidden="true">
              🧍
            </span>
            <div className="role-entry-text">
              <span className="role-entry-label">Passenger</span>
              <span className="role-entry-hint">Request rides and pay instantly.</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="role-entry-wallet">
          <WalletBar
            role={selectedRole}
            userProfile={userProfile}
            onProfileUpdate={onProfileUpdate}
            refreshTrigger={refreshTrigger}
            onFaucetSuccess={onFaucetSuccess}
          />
        </div>
      )}
    </div>
  );
};

export default RoleEntry;

