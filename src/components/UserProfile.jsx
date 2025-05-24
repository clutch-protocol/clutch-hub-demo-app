import React, { useState, useEffect, useCallback } from 'react';

const UserProfile = ({ onProfileUpdate }) => {
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [rememberKeys, setRememberKeys] = useState(false);
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  // Memoize the profile update callback to prevent infinite loops
  const updateParentProfile = useCallback((profileData) => {
    if (onProfileUpdate) {
      onProfileUpdate(profileData);
    }
  }, [onProfileUpdate]);

  // Load saved keys from localStorage on component mount
  useEffect(() => {
    const savedPublicKey = localStorage.getItem('clutchPublicKey');
    const savedPrivateKey = localStorage.getItem('clutchPrivateKey');
    
    if (savedPublicKey) {
      setPublicKey(savedPublicKey);
      setRememberKeys(true);
      
      if (savedPrivateKey) {
        setPrivateKey(savedPrivateKey);
      }
      
      setIsProfileSaved(true);
      
      // Notify parent component - using memoized callback
      updateParentProfile({ 
        publicKey: savedPublicKey, 
        privateKey: savedPrivateKey || '' 
      });
    }
    // Only run this effect once on mount
  }, [updateParentProfile]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    
    if (publicKey) {
      // Store in state
      setIsProfileSaved(true);
      
      // Save to localStorage if remember is checked
      if (rememberKeys) {
        localStorage.setItem('clutchPublicKey', publicKey);
        if (privateKey) {
          localStorage.setItem('clutchPrivateKey', privateKey);
        }
      } else {
        // Clear localStorage if remember is unchecked
        localStorage.removeItem('clutchPublicKey');
        localStorage.removeItem('clutchPrivateKey');
      }
      
      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate({ publicKey, privateKey });
      }
    }
  };

  const handleClearProfile = () => {
    // Clear state
    setPublicKey('');
    setPrivateKey('');
    setIsProfileSaved(false);
    setRememberKeys(false);
    
    // Clear localStorage
    localStorage.removeItem('clutchPublicKey');
    localStorage.removeItem('clutchPrivateKey');
    
    // Notify parent component
    if (onProfileUpdate) {
      onProfileUpdate({ publicKey: '', privateKey: '' });
    }
  };

  if (isProfileSaved) {
    return (
      <div className="user-profile" style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#333' }}>User Profile</h3>
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontWeight: 'bold' }}>Public Key:</span>
          <span style={{ 
            marginLeft: '0.5rem', 
            wordBreak: 'break-all',
            color: '#555'
          }}>
            {publicKey.substring(0, 10)}...{publicKey.substring(publicKey.length - 10)}
          </span>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <span style={{ fontWeight: 'bold' }}>Private Key:</span>
          <span style={{ 
            marginLeft: '0.5rem',
            color: '#555'
          }}>
            {privateKey ? '••••••••••••••••••••' : 'Not stored'}
          </span>
        </div>
        <button 
          onClick={handleClearProfile}
          style={{
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Clear Profile
        </button>
      </div>
    );
  }

  return (
    <div className="user-profile" style={{
      padding: '1rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#333' }}>User Profile</h3>
      <form onSubmit={handleSaveProfile}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Public Key:
          </label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="Enter your public key"
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ced4da'
            }}
            required
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500' }}>
            Private Key (optional):
          </label>
          <input
            type="password"
            value={privateKey}
            onChange={(e) => setPrivateKey(e.target.value)}
            placeholder="Enter your private key"
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '4px',
              border: '1px solid #ced4da'
            }}
          />
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: '#6c757d' }}>
            ⚠️ Store private key at your own risk. Never share your private key.
          </p>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={rememberKeys}
              onChange={(e) => setRememberKeys(e.target.checked)}
              style={{ marginRight: '0.5rem' }}
            />
            Remember my keys on this device
          </label>
        </div>
        
        <button 
          type="submit"
          style={{
            backgroundColor: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}
        >
          Save Profile
        </button>
      </form>
    </div>
  );
};

export default UserProfile; 