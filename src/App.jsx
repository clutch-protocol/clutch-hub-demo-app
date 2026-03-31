import React, { useEffect, useMemo, useState } from 'react';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import GeneralView from './components/GeneralView';
import RoleEntry, { persistRole } from './components/RoleEntry';
import BalanceDisplay from './components/BalanceDisplay';
import { truncAddr } from './utils/address';
import './App.css';

const ROLE_STORAGE_KEY = 'clutch_demo_role';

function App() {
  const initialStoredRole = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return stored === 'passenger' || stored === 'driver' ? stored : null;
  }, []);

  // mode: wallet mode ('passenger' | 'driver') selected via entry
  const [mode, setMode] = useState(initialStoredRole);
  // activeTab: current visible panel ('passenger' | 'driver' | 'general' | 'explorer')
  const [activeTab, setActiveTab] = useState(initialStoredRole || null);
  const themeStorageKey = 'clutch_demo_theme';

  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passengerViewTab, setPassengerViewTab] = useState(null);
  const [driverViewTab, setDriverViewTab] = useState(null);

  const initialTheme = useMemo(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = window.localStorage.getItem(themeStorageKey);
    if (stored === 'light' || stored === 'dark') return stored;
    // Respect OS preference as default
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
    return prefersDark ? 'dark' : 'light';
  }, []);

  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleSignOut = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(ROLE_STORAGE_KEY);
        window.localStorage.removeItem('clutch_passenger_publicKey');
        window.localStorage.removeItem('clutch_passenger_privateKey');
        window.localStorage.removeItem('clutch_driver_publicKey');
        window.localStorage.removeItem('clutch_driver_privateKey');
      }
    } catch {
      // ignore storage errors; we still reset local state
    }
    setMode(null);
    setActiveTab(null);
    setUserProfile({ publicKey: '', privateKey: '' });
  };

  const handleEntryRoleSelect = (nextRole) => {
    setMode(nextRole);
    setActiveTab(nextRole);
    // Clear current profile so the wallet bar uses the newly selected mode.
    setUserProfile({ publicKey: '', privateKey: '' });
  };

  // Persist the chosen mode only after a wallet is actually selected (publicKey exists).
  useEffect(() => {
    if (mode && userProfile.publicKey) {
      persistRole(mode);
    }
  }, [mode, userProfile.publicKey]);

  // When the wallet becomes available, ensure the primary tab is set.
  useEffect(() => {
    if (mode && userProfile.publicKey && !activeTab) {
      setActiveTab(mode);
    }
  }, [mode, userProfile.publicKey, activeTab]);

  // Prevent switching to the opposite role view after role selection.
  useEffect(() => {
    if (!mode || !activeTab) return;
    if ((mode === 'passenger' && activeTab === 'driver') || (mode === 'driver' && activeTab === 'passenger')) {
      setActiveTab(mode);
    }
  }, [mode, activeTab]);

  const shouldShowEntry = !mode || !userProfile.publicKey;

  if (shouldShowEntry) {
    return (
      <div className="app app--entry">
        <main className="app-main app-main--entry">
          <RoleEntry
            selectedRole={mode}
            onSelectRole={handleEntryRoleSelect}
            userProfile={userProfile}
            onProfileUpdate={setUserProfile}
            refreshTrigger={walletRefresh}
            onFaucetSuccess={() => setWalletRefresh((c) => c + 1)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <img src="/clutch-logo.svg" alt="Clutch" className="app-logo-icon" width={32} height={32} />
          <span className="app-logo-text">Clutch Stage</span>
        </div>
        <div className="app-header-right">
          <button
            type="button"
            className="hamburger-btn"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            <span />
            <span />
            <span />
          </button>
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark/light mode"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </header>
      <main className="app-main">
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-passenger"
          aria-labelledby="role-tab-passenger"
          hidden={activeTab !== 'passenger'}
          style={{
            display: activeTab === 'passenger' ? 'block' : 'none',
            animationDelay: '0.05s',
          }}
        >
          <PassengerView
            userProfile={userProfile}
            onProfileUpdate={setUserProfile}
            refreshTrigger={walletRefresh}
            onFaucetSuccess={() => setWalletRefresh((c) => c + 1)}
            externalTab={passengerViewTab}
          />
        </div>
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-driver"
          aria-labelledby="role-tab-driver"
          hidden={activeTab !== 'driver'}
          style={{
            display: activeTab === 'driver' ? 'block' : 'none',
            animationDelay: '0.05s',
          }}
        >
          <DriverView
            userProfile={userProfile}
            onProfileUpdate={setUserProfile}
            refreshTrigger={walletRefresh}
            onFaucetSuccess={() => setWalletRefresh((c) => c + 1)}
            externalTab={driverViewTab}
          />
        </div>
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-general"
          aria-labelledby="role-tab-general"
          hidden={activeTab !== 'general'}
          style={{ display: activeTab === 'general' ? 'block' : 'none', animationDelay: '0.05s' }}
        >
          <GeneralView />
        </div>
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-explorer"
          aria-labelledby="role-tab-explorer"
          hidden={activeTab !== 'explorer'}
          style={{ display: activeTab === 'explorer' ? 'block' : 'none', animationDelay: '0.05s' }}
        >
          <NetworkView />
        </div>
      </main>
      {menuOpen && (
        <div className="app-menu-overlay" onClick={() => setMenuOpen(false)}>
          <aside className="app-menu" onClick={(e) => e.stopPropagation()}>
            <div className="app-menu-top-row">
              <span className="app-menu-title">Menu</span>
              <button
                type="button"
                className="app-menu-close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className="card app-menu-card">
              <div className="app-menu-section-header">
                <span className="app-menu-section-label">Profile</span>
              </div>
              <div className="app-menu-profile">
                <div>
                  <div className="app-menu-profile-role-label">Role</div>
                  <div className="app-menu-profile-role-value">
                    <span style={{ textTransform: 'capitalize' }}>{mode}</span>
                  </div>
                </div>
                <div className="app-menu-profile-wallet">
                  <div className="app-menu-profile-role-label">Wallet</div>
                  {userProfile.publicKey ? (
                    <div className="app-menu-profile-wallet-row">
                      <span className="wallet-address" title={userProfile.publicKey}>
                        {truncAddr(userProfile.publicKey)}
                      </span>
                      <BalanceDisplay
                        publicKey={userProfile.publicKey}
                        onFaucetSuccess={() => setWalletRefresh((c) => c + 1)}
                      />
                    </div>
                  ) : (
                    <span className="app-menu-profile-wallet-empty">Not connected</span>
                  )}
                </div>
              </div>
              <div className="app-menu-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>

            <div className="card app-menu-card">
              <div className="app-menu-section-header">
                <span className="app-menu-section-label">Navigation</span>
              </div>
              <nav className="app-menu-nav">
                {mode === 'passenger' ? (
                  <button
                    type="button"
                    className={`app-menu-nav-item ${activeTab === 'passenger' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('passenger');
                      setMenuOpen(false);
                    }}
                  >
                    <span className="app-menu-nav-title">Passenger view</span>
                    <span className="app-menu-nav-subtitle">Request rides and track your trips</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className={`app-menu-nav-item ${activeTab === 'driver' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('driver');
                      setMenuOpen(false);
                    }}
                  >
                    <span className="app-menu-nav-title">Driver view</span>
                    <span className="app-menu-nav-subtitle">See available rides and active trips</span>
                  </button>
                )}
                <button
                  type="button"
                  className="app-menu-nav-item"
                  onClick={() => {
                    if (mode === 'driver') {
                      setDriverViewTab('recent');
                      setActiveTab('driver');
                    } else {
                      setPassengerViewTab('recent');
                      setActiveTab('passenger');
                    }
                    setMenuOpen(false);
                  }}
                >
                  <span className="app-menu-nav-title">Recent rides</span>
                  <span className="app-menu-nav-subtitle">View your completed and cancelled trips</span>
                </button>
                <button
                  type="button"
                  className={`app-menu-nav-item ${activeTab === 'general' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('general');
                    setMenuOpen(false);
                  }}
                >
                  <span className="app-menu-nav-title">About</span>
                  <span className="app-menu-nav-subtitle">API endpoints, nodes, GitHub</span>
                </button>
                <button
                  type="button"
                  className={`app-menu-nav-item ${activeTab === 'explorer' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab('explorer');
                    setMenuOpen(false);
                  }}
                >
                  <span className="app-menu-nav-title">Network explorer</span>
                  <span className="app-menu-nav-subtitle">Live hub status and metrics</span>
                </button>
              </nav>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
