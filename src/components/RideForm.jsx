import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';
import UserProfile from './UserProfile';
import TransactionHistory from './TransactionHistory';

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

const LocationSelector = ({ pickup, dropoff, setPickup, setDropoff }) => {
  useMapEvents({
    click(e) {
      if (!pickup) setPickup(e.latlng);
      else if (!dropoff) setDropoff(e.latlng);
    },
  });
  return null;
};

const RideForm = () => {
  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [fare, setFare] = useState(1000);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);

  // Use useCallback to memoize this function
  const handleProfileUpdate = useCallback((profile) => {
    setUserProfile(profile);
  }, []);

  const handleReset = useCallback(() => {
    setPickup(null);
    setDropoff(null);
    setTransactionStatus(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (pickup && dropoff && userProfile.publicKey) {
      try {
        setIsLoading(true);
        setTransactionStatus({ type: 'info', message: 'Creating transaction...' });
        
        const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
        const unsignedTx = await sdk.createUnsignedRideRequest({ 
          pickup, 
          dropoff, 
          fare: Number(fare) 
        });
        
        console.log('Unsigned transaction:', unsignedTx);
        setTransactionStatus({ type: 'info', message: 'Transaction created. Signing...' });
        
        // Use stored private key if available, otherwise prompt
        let privateKey = userProfile.privateKey;
        if (!privateKey) {
          privateKey = window.prompt('Enter your private key to sign the transaction:');
          if (!privateKey) {
            setTransactionStatus({ type: 'warning', message: 'Signing cancelled.' });
            setIsLoading(false);
            return;
          }
        }
        
        // Sign transaction
        const signature = await sdk.signTransaction(unsignedTx, privateKey);
        console.log('Signature:', signature);
        
        // Prepare transaction for submission
        setTransactionStatus({ type: 'info', message: 'Submitting transaction to the network...' });
        
        // Submit the raw transaction string to the blockchain
        const response = await sdk.submitTransaction(signature.rawTransaction);
        
        console.log('Transaction response:', response);
        
        // Record transaction in history
        const txRecord = {
          type: 'Ride Request',
          timestamp: Date.now(),
          pickup,
          dropoff,
          fare: Number(fare),
          status: 'success',
          txHash: signature.r.substring(0, 10) // Just for display purposes
        };
        
        // Add to transaction history
        TransactionHistory.addTransaction(userProfile.publicKey, txRecord);
        
        setTransactionStatus({ 
          type: 'success', 
          message: 'Transaction submitted successfully! Network confirmation pending.'
        });
      } catch (err) {
        console.error(err);
        
        // Record failed transaction
        if (pickup && dropoff && userProfile.publicKey) {
          const txRecord = {
            type: 'Ride Request',
            timestamp: Date.now(),
            pickup,
            dropoff,
            fare: Number(fare),
            status: 'failed',
            error: err.message
          };
          
          // Add to transaction history
          TransactionHistory.addTransaction(userProfile.publicKey, txRecord);
        }
        
        setTransactionStatus({ 
          type: 'error', 
          message: 'Transaction failed: ' + (err.message || 'Unknown error')
        });
      } finally {
        setIsLoading(false);
      }
    }
  }, [pickup, dropoff, userProfile, fare]);

  return (
    <div>
      <UserProfile onProfileUpdate={handleProfileUpdate} />
      
      {transactionStatus && (
        <div style={{
          padding: '0.75rem',
          marginBottom: '1rem',
          borderRadius: '4px',
          backgroundColor: 
            transactionStatus.type === 'success' ? '#d4edda' :
            transactionStatus.type === 'error' ? '#f8d7da' :
            transactionStatus.type === 'warning' ? '#fff3cd' : '#cce5ff',
          color: 
            transactionStatus.type === 'success' ? '#155724' :
            transactionStatus.type === 'error' ? '#721c24' :
            transactionStatus.type === 'warning' ? '#856404' : '#004085',
        }}>
          {transactionStatus.message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="number"
            placeholder="Fare"
            value={fare}
            onChange={e => setFare(e.target.value)}
            style={{ width: 120, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
            min={0}
            required
          />
        </div>
        <p style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: '500' }}>
          Click on the map to select Pickup and Dropoff locations
        </p>
        <div style={{
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
        }}>
          <MapContainer center={[27.1883, 56.3772]} zoom={12} style={{ height: '400px', width: '100%' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            <LocationSelector
              pickup={pickup}
              dropoff={dropoff}
              setPickup={setPickup}
              setDropoff={setDropoff}
            />
            {pickup && (
              <Marker position={pickup}>
                <Popup>Pickup</Popup>
              </Marker>
            )}
            {dropoff && (
              <Marker position={dropoff}>
                <Popup>Dropoff</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button
            type="button"
            onClick={handleReset}
            style={{
              backgroundColor: '#f0f0f0',
              color: '#333333',
              border: '1px solid #cccccc',
              padding: '0.5rem 1rem',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={!(pickup && dropoff && userProfile.publicKey) || isLoading}
            style={{
              backgroundColor: '#646cff',
              color: '#ffffff',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: 4,
              cursor: 'pointer',
              opacity: (pickup && dropoff && userProfile.publicKey && !isLoading) ? 1 : 0.6,
            }}
          >
            {isLoading ? 'Processing...' : 'Request Ride'}
          </button>
        </div>
      </form>
      
      <TransactionHistory userPublicKey={userProfile.publicKey} />
    </div>
  );
};

export default RideForm; 