import React from 'react';
import RideForm from './components/RideForm';

function App() {
  return (
    <div style={{
      maxWidth: 600,
      margin: '2rem auto',
      padding: 24,
      backgroundColor: '#ffffff',
      color: '#000000',
      borderRadius: 8,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '1rem' }}>Clutch Hub Demo App</h1>
      <RideForm />
      </div>
  );
}

export default App;
