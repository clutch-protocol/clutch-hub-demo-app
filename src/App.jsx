import React, { useEffect, useMemo, useState } from 'react';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import GeneralView from './components/GeneralView';
import TransactionHistoryPage from './components/TransactionHistoryPage';
import ExplorerTabs from './components/ExplorerTabs';
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
  // activeTab: current visible panel ('passenger' | 'driver' | 'hub')
  const [activeTab, setActiveTab] = useState(initialStoredRole || null);
  /** Sub-view when activeTab === 'hub' */
  const [hubSubTab, setHubSubTab] = useState('about');
  const themeStorageKey = 'clutch_demo_theme';

  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [walletRefresh, setWalletRefresh] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [passengerViewTab, setPassengerViewTab] = useState(null);
  const [driverViewTab, setDriverViewTab] = useState(null);
  const [walletCopied, setWalletCopied] = useState(false);

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

  const handleCopyWalletAddress = async () => {
    if (!userProfile.publicKey) return;
    try {
      await navigator.clipboard.writeText(userProfile.publicKey);
      setWalletCopied(true);
      setTimeout(() => setWalletCopied(false), 1200);
    } catch {
      // ignore clipboard errors
    }
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
  const isPassengerRecentActive = activeTab === 'passenger' && passengerViewTab === 'recent';
  const isDriverRecentActive = activeTab === 'driver' && driverViewTab === 'recent';
  const isRecentRidesActive = isPassengerRecentActive || isDriverRecentActive;

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
      <div className="app-layout">
        <aside className="app-sidebar" aria-label="App navigation">
          <div className="card app-menu-card app-sidebar-profile-card">
            <div className="app-menu-section-header">
              <span className="app-menu-section-label">Profile</span>
            </div>
            <div className="app-menu-profile-card">
              <div className="app-menu-profile-head">
                <div className="app-menu-profile-avatar" aria-hidden>
                  {mode === 'driver' ? 'D' : 'P'}
                </div>
                <div>
                  <div className="app-menu-profile-role-label">Role</div>
                  <div className="app-menu-profile-role-value">
                    <span style={{ textTransform: 'capitalize' }}>{mode}</span>
                  </div>
                </div>
              </div>
              <div className="app-menu-profile-wallet">
                <div className="app-menu-profile-role-label">Wallet</div>
                {userProfile.publicKey ? (
                  <div className="app-menu-profile-wallet-row">
                    <button
                      type="button"
                      className="app-menu-wallet-address"
                      title={userProfile.publicKey}
                      onClick={handleCopyWalletAddress}
                    >
                      {walletCopied ? 'Copied!' : truncAddr(userProfile.publicKey)}
                    </button>
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
                className="btn-secondary app-menu-signout-btn"
                onClick={() => {
                  handleSignOut();
                }}
              >
                Sign out
              </button>
            </div>
          </div>

          <nav className="app-menu-nav" aria-label="Primary navigation">
            <button
              type="button"
              className={`app-menu-nav-item ${activeTab === mode && !isRecentRidesActive ? 'active' : ''}`}
              onClick={() => {
                if (mode === 'driver') {
                  setDriverViewTab('rides');
                  setActiveTab('driver');
                } else {
                  setPassengerViewTab('rides');
                  setActiveTab('passenger');
                }
              }}
            >
              <span className="app-menu-nav-title">{mode === 'driver' ? 'Driver view' : 'Passenger view'}</span>
              <span className="app-menu-nav-subtitle">
                {mode === 'driver' ? 'See available rides and active trips' : 'Request rides and track your trips'}
              </span>
            </button>

            <button
              type="button"
              className={`app-menu-nav-item ${isRecentRidesActive ? 'active' : ''}`}
              onClick={() => {
                if (mode === 'driver') {
                  setDriverViewTab('recent');
                  setActiveTab('driver');
                } else {
                  setPassengerViewTab('recent');
                  setActiveTab('passenger');
                }
              }}
            >
              <span className="app-menu-nav-title">Recent rides</span>
              <span className="app-menu-nav-subtitle">View your completed and cancelled trips</span>
            </button>

            <button
              type="button"
              className={`app-menu-nav-item ${activeTab === 'hub' ? 'active' : ''}`}
              onClick={() => setActiveTab('hub')}
            >
              <span className="app-menu-nav-title">About &amp; network</span>
              <span className="app-menu-nav-subtitle">About, transaction history, and explorer</span>
            </button>
          </nav>
        </aside>

        <main className="app-main" aria-live="polite">
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
            className="fade-in hub-tools-panel"
            role="tabpanel"
            id="role-panel-hub"
            aria-labelledby="role-tab-hub"
            hidden={activeTab !== 'hub'}
            style={{ display: activeTab === 'hub' ? 'block' : 'none', animationDelay: '0.05s' }}
          >
            <ExplorerTabs
              tabs={[
                { id: 'about', label: 'About', icon: 'ℹ️' },
                { id: 'transactions', label: 'Tx', icon: '📋' },
                { id: 'network', label: 'Network', icon: '🔍' },
              ]}
              activeTab={hubSubTab}
              onTabChange={setHubSubTab}
              showCounts={false}
            />
            <div
              role="tabpanel"
              id="panel-about"
              aria-labelledby="tab-about"
              hidden={hubSubTab !== 'about'}
              style={{ display: hubSubTab === 'about' ? 'block' : 'none' }}
            >
              <GeneralView />
            </div>
            <div
              role="tabpanel"
              id="panel-transactions"
              aria-labelledby="tab-transactions"
              hidden={hubSubTab !== 'transactions'}
              style={{ display: hubSubTab === 'transactions' ? 'block' : 'none' }}
            >
              <TransactionHistoryPage userPublicKey={userProfile.publicKey} />
            </div>
            <div
              role="tabpanel"
              id="panel-network"
              aria-labelledby="tab-network"
              hidden={hubSubTab !== 'network'}
              style={{ display: hubSubTab === 'network' ? 'block' : 'none' }}
            >
              <NetworkView />
            </div>
          </div>
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile navigation">
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === mode && !isRecentRidesActive ? 'active' : ''}`}
          onClick={() => {
            if (mode === 'driver') {
              setDriverViewTab('rides');
              setActiveTab('driver');
            } else {
              setPassengerViewTab('rides');
              setActiveTab('passenger');
            }
          }}
        >
          <span className="bottom-nav-icon" aria-hidden>
            {mode === 'driver' ? '🚕' : '🚗'}
          </span>
          <span className="bottom-nav-label">{mode === 'driver' ? 'Rides' : 'Rides'}</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${isRecentRidesActive ? 'active' : ''}`}
          onClick={() => {
            if (mode === 'driver') {
              setDriverViewTab('recent');
              setActiveTab('driver');
            } else {
              setPassengerViewTab('recent');
              setActiveTab('passenger');
            }
          }}
        >
          <span className="bottom-nav-icon" aria-hidden>
            ✅
          </span>
          <span className="bottom-nav-label">Recent</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'hub' ? 'active' : ''}`}
          onClick={() => setActiveTab('hub')}
        >
          <span className="bottom-nav-icon" aria-hidden>
            ⋯
          </span>
          <span className="bottom-nav-label">More</span>
        </button>
      </nav>

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
              <div className="app-menu-profile-card">
                <div className="app-menu-profile-head">
                  <div className="app-menu-profile-avatar" aria-hidden>
                    {mode === 'driver' ? 'D' : 'P'}
                  </div>
                  <div>
                    <div className="app-menu-profile-role-label">Role</div>
                    <div className="app-menu-profile-role-value">
                      <span style={{ textTransform: 'capitalize' }}>{mode}</span>
                    </div>
                  </div>
                </div>
                <div className="app-menu-profile-wallet">
                  <div className="app-menu-profile-role-label">Wallet</div>
                  {userProfile.publicKey ? (
                    <div className="app-menu-profile-wallet-row">
                      <button
                        type="button"
                        className="app-menu-wallet-address"
                        title={userProfile.publicKey}
                        onClick={handleCopyWalletAddress}
                      >
                        {walletCopied ? 'Copied!' : truncAddr(userProfile.publicKey)}
                      </button>
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
                  className="btn-secondary app-menu-signout-btn"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSignOut();
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default App;
