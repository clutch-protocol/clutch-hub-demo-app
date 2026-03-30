import React, { useEffect, useMemo, useState } from 'react';
import RoleSelector from './components/RoleSelector';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import GeneralView from './components/GeneralView';
import './App.css';

function App() {
  const [role, setRole] = useState('passenger');
  const themeStorageKey = 'clutch_demo_theme';

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
          <RoleSelector role={role} onRoleChange={setRole} />
        </div>
      </header>
      <main className="app-main">
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-passenger"
          aria-labelledby="role-tab-passenger"
          hidden={role !== 'passenger'}
          style={{ display: role === 'passenger' ? 'block' : 'none', animationDelay: '0.05s' }}
        >
          <PassengerView />
        </div>
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-driver"
          aria-labelledby="role-tab-driver"
          hidden={role !== 'driver'}
          style={{ display: role === 'driver' ? 'block' : 'none', animationDelay: '0.05s' }}
        >
          <DriverView />
        </div>
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-general"
          aria-labelledby="role-tab-general"
          hidden={role !== 'general'}
          style={{ display: role === 'general' ? 'block' : 'none', animationDelay: '0.05s' }}
        >
          <GeneralView />
        </div>
        <div
          className="fade-in"
          role="tabpanel"
          id="role-panel-explorer"
          aria-labelledby="role-tab-explorer"
          hidden={role !== 'explorer'}
          style={{ display: role === 'explorer' ? 'block' : 'none', animationDelay: '0.05s' }}
        >
          <NetworkView />
        </div>
      </main>
    </div>
  );
}

export default App;
