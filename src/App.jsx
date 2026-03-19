import React, { useState } from 'react';
import RoleSelector from './components/RoleSelector';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import './App.css';

const ROLE_DESC = {
  passenger: 'Request rides and accept driver offers',
  driver: 'Browse requests and make offers',
  explorer: 'View network activity without a wallet',
};

function App() {
  const [role, setRole] = useState('explorer');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <div className="app-logo">
            <img src="/clutch-logo.svg" alt="Clutch" className="app-logo-icon" width={32} height={32} />
            <span className="app-logo-text">Clutch</span>
          </div>
          <span className="app-tagline">Decentralized ride-sharing</span>
        </div>
        <RoleSelector role={role} onRoleChange={setRole} />
      </header>
      <main className="app-main">
        <p className="app-role-desc">{ROLE_DESC[role]}</p>
        {role === 'passenger' && <PassengerView />}
        {role === 'driver' && <DriverView />}
        {role === 'explorer' && <NetworkView />}
      </main>
    </div>
  );
}

export default App;
