import React from 'react';
import RideForm from './components/RideForm';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">
          <img src="/clutch-logo.svg" alt="Clutch" className="app-logo-icon" width={32} height={32} />
          <span className="app-logo-text">Clutch</span>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Demo
        </span>
      </header>
      <main className="app-main">
        <RideForm />
      </main>
    </div>
  );
}

export default App;
