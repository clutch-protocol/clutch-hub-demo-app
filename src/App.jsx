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
        <RoleSelector role={role} onRoleChange={setRole} />
      </header>
      <main className="app-main">
        <div className="fade-in" key={`view-${role}`} style={{ animationDelay: '0.05s' }}>
          {role === 'passenger' && <PassengerView />}
          {role === 'driver' && <DriverView />}
          {role === 'explorer' && <NetworkView />}
        </div>
      </main>
    </div>
  );
}

export default App;
