import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';
import UserProfile from './UserProfile';
import BalanceDisplay from './BalanceDisplay';
import TransactionHistory from './TransactionHistory';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

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
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);
  const handleReset = useCallback(() => {
    setPickup(null);
    setDropoff(null);
    setTransactionStatus(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!pickup || !dropoff || !userProfile.publicKey) return;
    try {
      setIsLoading(true);
      setTransactionStatus({ type: 'info', message: 'Creating transaction...' });

      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
      const unsignedTx = await sdk.createUnsignedRideRequest({ pickup, dropoff, fare: Number(fare) });
      setTransactionStatus({ type: 'info', message: 'Transaction created. Signing...' });

      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = window.prompt('Enter your private key to sign the transaction:');
        if (!privateKey) {
          setTransactionStatus({ type: 'warning', message: 'Signing cancelled.' });
          setIsLoading(false);
          return;
        }
      }

      const signature = await sdk.signTransaction(unsignedTx, privateKey);
      setTransactionStatus({ type: 'info', message: 'Submitting transaction to the network...' });
      await sdk.submitTransaction(signature.rawTransaction);

      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Request',
        timestamp: Date.now(),
        pickup,
        dropoff,
        fare: Number(fare),
        status: 'success',
        txHash: signature.r?.substring(0, 10) || '',
      });

      setTransactionStatus({ type: 'success', message: 'Transaction submitted successfully! Network confirmation pending.' });
      setRefreshBalanceCounter((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Request',
        timestamp: Date.now(),
        pickup,
        dropoff,
        fare: Number(fare),
        status: 'failed',
        error: err.message,
      });
      setTransactionStatus({ type: 'error', message: 'Transaction failed: ' + (err.message || 'Unknown error') });
    } finally {
      setIsLoading(false);
    }
  }, [pickup, dropoff, userProfile, fare]);

  return (
    <div>
      <UserProfile onProfileUpdate={handleProfileUpdate} />
      <BalanceDisplay publicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} />

      {transactionStatus && (
        <div className={`status-banner ${transactionStatus.type}`}>
          {transactionStatus.message}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">Request Ride</h3>
        <form onSubmit={handleSubmit}>
          <label className="label">Fare (CLT)</label>
          <input
            type="number"
            value={fare}
            onChange={(e) => setFare(e.target.value)}
            className="input-field"
            style={{ width: 140, marginBottom: '1rem' }}
            min={0}
            required
          />
          <p className="map-hint">Click on the map to select pickup (first) and dropoff (second) locations</p>
          <div className="map-wrapper">
            <MapContainer center={[27.1883, 56.3772]} zoom={12} style={{ height: '380px', width: '100%' }}>
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              <LocationSelector pickup={pickup} dropoff={dropoff} setPickup={setPickup} setDropoff={setDropoff} />
              {pickup && <Marker position={pickup}><Popup>Pickup</Popup></Marker>}
              {dropoff && <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>}
            </MapContainer>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleReset} className="btn-secondary">
              Reset
            </button>
            <button
              type="submit"
              disabled={!(pickup && dropoff && userProfile.publicKey) || isLoading}
              className="btn-primary"
            >
              {isLoading ? 'Processing…' : 'Request Ride'}
            </button>
          </div>
        </form>
      </div>

      <TransactionHistory userPublicKey={userProfile.publicKey} />
    </div>
  );
};

export default RideForm;
