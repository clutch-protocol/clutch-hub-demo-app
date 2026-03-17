import React, { useState, useEffect, useCallback } from 'react';
import { generateWallet } from '../utils/wallet';

const UserProfile = ({ onProfileUpdate }) => {
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [rememberKeys, setRememberKeys] = useState(false);
  const [isProfileSaved, setIsProfileSaved] = useState(false);

  const updateParentProfile = useCallback((profileData) => {
    if (onProfileUpdate) onProfileUpdate(profileData);
  }, [onProfileUpdate]);

  useEffect(() => {
    const savedPublicKey = localStorage.getItem('clutchPublicKey');
    const savedPrivateKey = localStorage.getItem('clutchPrivateKey');

    if (savedPublicKey) {
      let normalizedKey = savedPublicKey.trim();
      if (!normalizedKey.startsWith('0x')) normalizedKey = '0x' + normalizedKey;
      setPublicKey(normalizedKey);
      setRememberKeys(true);
      if (savedPrivateKey) setPrivateKey(savedPrivateKey);
      setIsProfileSaved(true);
      updateParentProfile({ publicKey: normalizedKey, privateKey: savedPrivateKey || '' });
    }
  }, [updateParentProfile]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (publicKey) {
      let normalizedKey = publicKey.trim();
      if (!normalizedKey.startsWith('0x')) normalizedKey = '0x' + normalizedKey;
      setPublicKey(normalizedKey);
      setIsProfileSaved(true);
      if (rememberKeys) {
        localStorage.setItem('clutchPublicKey', normalizedKey);
        if (privateKey) localStorage.setItem('clutchPrivateKey', privateKey);
      } else {
        localStorage.removeItem('clutchPublicKey');
        localStorage.removeItem('clutchPrivateKey');
      }
      if (onProfileUpdate) onProfileUpdate({ publicKey: normalizedKey, privateKey });
    }
  };

  const handleGenerateWallet = () => {
    const { address, privateKey } = generateWallet();
    setPublicKey(address);
    setPrivateKey(privateKey);
    setRememberKeys(true);
    setIsProfileSaved(true);
    localStorage.setItem('clutchPublicKey', address);
    localStorage.setItem('clutchPrivateKey', privateKey);
    if (onProfileUpdate) onProfileUpdate({ publicKey: address, privateKey });
  };

  const handleClearProfile = () => {
    setPublicKey('');
    setPrivateKey('');
    setIsProfileSaved(false);
    setRememberKeys(false);
    localStorage.removeItem('clutchPublicKey');
    localStorage.removeItem('clutchPrivateKey');
    if (onProfileUpdate) onProfileUpdate({ publicKey: '', privateKey: '' });
  };

  if (isProfileSaved) {
    return (
      <div className="card">
        <h3 className="card-title">Wallet</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Public Key</div>
            <code style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>
              {publicKey.substring(0, 12)}…{publicKey.substring(publicKey.length - 10)}
            </code>
          </div>
          <button type="button" onClick={handleClearProfile} className="btn-danger">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="card-title">Connect Wallet</h3>
      <button type="button" onClick={handleGenerateWallet} className="btn-primary" style={{ marginBottom: '1rem' }}>
        Generate New Wallet
      </button>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Create a new wallet. Keys are stored locally on this device.
      </p>
      <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1rem 0' }} />
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Or enter existing keys:</p>
      <form onSubmit={handleSaveProfile}>
        <label className="label">Public Key</label>
        <input
          type="text"
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="0x..."
          className="input-field"
          style={{ marginBottom: '1rem' }}
          required
        />
        <label className="label">Private Key (optional)</label>
        <input
          type="password"
          value={privateKey}
          onChange={(e) => setPrivateKey(e.target.value)}
          placeholder="Enter private key"
          className="input-field"
          style={{ marginBottom: '0.5rem' }}
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Never share your private key. Store at your own risk.
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', cursor: 'pointer', fontSize: '0.9rem' }}>
          <input type="checkbox" checked={rememberKeys} onChange={(e) => setRememberKeys(e.target.checked)} />
          Remember keys on this device
        </label>
        <button type="submit" className="btn-primary">Save Profile</button>
      </form>
    </div>
  );
};

export default UserProfile;
