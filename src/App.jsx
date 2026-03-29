import React, { useState } from 'react';
import RoleSelector from './components/RoleSelector';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import './App.css';

function App() {
  const [role, setRole] = useState('passenger');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <img src="/clutch-logo.svg" alt="Clutch" className="app-logo-icon" width={32} height={32} />
          <span className="app-logo-text">Clutch Stage</span>
        </div>
        <RoleSelector role={role} onRoleChange={setRole} />
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
