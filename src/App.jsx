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
          <span className="app-logo-text">Clutch</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Decentralized ride-sharing
        </span>
      </header>
      <main className="app-main">
        <RoleSelector role={role} onRoleChange={setRole} />
        {role === 'passenger' && <PassengerView />}
        {role === 'driver' && <DriverView />}
        {role === 'viewer' && <NetworkView />}
      </main>
    </div>
  );
}

export default App;
