import React, { useState, useEffect } from 'react';

const TransactionHistory = ({ userPublicKey }) => {
  const [transactions, setTransactions] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load transactions from localStorage when the component mounts or user changes
  useEffect(() => {
    if (userPublicKey) {
      // Get transactions from localStorage
      const storedTransactions = localStorage.getItem(`clutch_tx_${userPublicKey}`);
      if (storedTransactions) {
        try {
          setTransactions(JSON.parse(storedTransactions));
        } catch (error) {
          console.error('Failed to parse transaction history:', error);
          setTransactions([]);
        }
      } else {
        setTransactions([]);
      }
    } else {
      setTransactions([]);
    }
  }, [userPublicKey]);

  // Function to add a new transaction to history
  const addTransaction = (transaction) => {
    const updatedTransactions = [transaction, ...transactions];
    setTransactions(updatedTransactions);
    
    // Save to localStorage
    if (userPublicKey) {
      localStorage.setItem(
        `clutch_tx_${userPublicKey}`, 
        JSON.stringify(updatedTransactions.slice(0, 10)) // Store only last 10 transactions
      );
    }
  };

  // No transactions or no user logged in
  if (!userPublicKey || transactions.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: '2rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      padding: '1rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <h3 style={{ margin: 0, color: '#333' }}>Transaction History</h3>
        <span>{isExpanded ? '▲' : '▼'}</span>
      </div>
      
      {isExpanded && (
        <div style={{ marginTop: '1rem' }}>
          {transactions.map((tx, index) => (
            <div 
              key={index} 
              style={{
                padding: '0.75rem',
                marginBottom: index < transactions.length - 1 ? '0.5rem' : 0,
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #e9ecef'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 'bold', color: '#333' }}>
                  {tx.type || 'Ride Request'}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: '#495057' }}>
                <div>
                  <strong>Pickup:</strong> {tx.pickup && `(${tx.pickup.lat.toFixed(4)}, ${tx.pickup.lng.toFixed(4)})`}
                </div>
                <div>
                  <strong>Dropoff:</strong> {tx.dropoff && `(${tx.dropoff.lat.toFixed(4)}, ${tx.dropoff.lng.toFixed(4)})`}
                </div>
                <div>
                  <strong>Fare:</strong> {tx.fare}
                </div>
                <div>
                  <strong>Status:</strong> <span style={{
                    color: 
                      tx.status === 'success' ? '#28a745' :
                      tx.status === 'failed' ? '#dc3545' : '#ffc107'
                  }}>
                    {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Add static method to TransactionHistory component to allow other components to add transactions
TransactionHistory.addTransaction = (userPublicKey, transaction) => {
  // Get existing transactions
  let transactions = [];
  const storedTransactions = localStorage.getItem(`clutch_tx_${userPublicKey}`);
  if (storedTransactions) {
    try {
      transactions = JSON.parse(storedTransactions);
    } catch (error) {
      console.error('Failed to parse transaction history:', error);
    }
  }
  
  // Add new transaction
  const updatedTransactions = [transaction, ...transactions];
  
  // Save to localStorage
  localStorage.setItem(
    `clutch_tx_${userPublicKey}`, 
    JSON.stringify(updatedTransactions.slice(0, 10)) // Store only last 10 transactions
  );
  
  return updatedTransactions;
};

export default TransactionHistory; 