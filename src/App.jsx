import React, { useState } from 'react';
import RoleSelector from './components/RoleSelector';
import PassengerView from './components/PassengerView';
import DriverView from './components/DriverView';
import NetworkView from './components/NetworkView';
import './App.css';

const ROLE_TITLES = {
  passenger: 'Passenger',
  driver: 'Driver',
  explorer: 'Explorer',
};

function App() {
  const [role, setRole] = useState('explorer');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <img src="/clutch-logo.svg" alt="Clutch" className="app-logo-icon" width={28} height={28} />
          <span className="app-logo-text">Clutch</span>
        </div>
        <RoleSelector role={role} onRoleChange={setRole} />
      </header>
      <main className="app-main">
        <h1 className="app-page-title fade-in" key={role}>{ROLE_TITLES[role]}</h1>
        <div className="fade-in" key={`view-${role}`}>
          {role === 'passenger' && <PassengerView />}
          {role === 'driver' && <DriverView />}
          {role === 'explorer' && <NetworkView />}
        </div>
      </main>
    </div>
  );
}

export default App;
