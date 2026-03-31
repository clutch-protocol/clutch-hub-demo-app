import React, { useEffect, useMemo, useState } from 'react';
import RoleSelector from './components/RoleSelector';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import GeneralView from './components/GeneralView';
import RoleEntry, { persistRole } from './components/RoleEntry';
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
    if (mode && userProfile.publicKey && activeTab !== mode) {
      setActiveTab(mode);
    }
  }, [mode, userProfile.publicKey, activeTab]);

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
            className="theme-toggle-btn"
            onClick={toggleTheme}
            aria-label="Toggle dark/light mode"
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <RoleSelector mode={mode} activeTab={activeTab} onTabChange={setActiveTab} />
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
    </div>
  );
}

export default App;
