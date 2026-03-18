import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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

const DEFAULT_CENTER = [27.1883, 56.3772];
const DEFAULT_ZOOM = 12;

const DriverView = () => {
  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);
  const [rideRequests, setRideRequests] = useState([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [ridesError, setRidesError] = useState(null);
  const [selectedTxHash, setSelectedTxHash] = useState(null);
  const [acceptingTxHash, setAcceptingTxHash] = useState(null);
  const [acceptStatus, setAcceptStatus] = useState(null);
  const [offerFares, setOfferFares] = useState({});

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);

  const fetchRideRequests = useCallback(async () => {
    setIsLoadingRides(true);
    setRidesError(null);
    try {
      const publicKey = userProfile.publicKey || '0x0';
      const sdk = new ClutchHubSdk(API_URL, publicKey);
      const requests = await sdk.listRideRequests();
      setRideRequests(requests);
    } catch (err) {
      console.error('Failed to fetch ride requests:', err);
      setRidesError(err.message || 'Failed to load ride requests');
      setRideRequests([]);
    } finally {
      setIsLoadingRides(false);
    }
  }, [userProfile.publicKey]);

  useEffect(() => {
    fetchRideRequests();
  }, [fetchRideRequests]);

  const handleFareChange = useCallback((txHash, value) => {
    setOfferFares((prev) => ({ ...prev, [txHash]: value }));
  }, []);

  const handleAcceptOffer = useCallback(async (req) => {
    if (!userProfile.publicKey) {
      setAcceptStatus({ type: 'warning', message: 'Connect your wallet first.' });
      return;
    }
    setAcceptingTxHash(req.txHash);
    setAcceptStatus(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
      const offerFare = offerFares[req.txHash] !== undefined ? Number(offerFares[req.txHash]) : req.fare;
      const unsignedTx = await sdk.createUnsignedRideOffer({
        rideRequestTxHash: req.txHash,
        fare: offerFare,
      });
      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = window.prompt('Enter your private key to sign the ride offer:');
        if (!privateKey) {
          setAcceptStatus({ type: 'warning', message: 'Signing cancelled.' });
          setAcceptingTxHash(null);
          return;
        }
      }
      const signature = await sdk.signTransaction(unsignedTx, privateKey);
      await sdk.submitTransaction(signature.rawTransaction);
      setAcceptStatus({ type: 'success', message: 'Offer submitted! Awaiting passenger acceptance.' });
      setRefreshBalanceCounter((c) => c + 1);
      fetchRideRequests();
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Offer',
        timestamp: Date.now(),
        rideRequestTxHash: req.txHash,
        fare: req.fare,
        status: 'success',
        txHash: signature.txHash || '',
      });
    } catch (err) {
      console.error(err);
      setAcceptStatus({ type: 'error', message: 'Failed: ' + (err.message || 'Unknown error') });
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Offer',
        timestamp: Date.now(),
        rideRequestTxHash: req.txHash,
        fare: req.fare,
        status: 'failed',
        error: err.message,
      });
    } finally {
      setAcceptingTxHash(null);
    }
  }, [userProfile, fetchRideRequests]);

  return (
    <div>
      <UserProfile onProfileUpdate={handleProfileUpdate} />
      <BalanceDisplay publicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} />

      <div className="card">
        <h3 className="card-title">Available rides</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Ride requests awaiting a driver. Click a pickup marker to show dropoff and route.
        </p>
        {acceptStatus && (
          <div className={`status-banner ${acceptStatus.type}`} style={{ marginBottom: '1rem' }}>
            {acceptStatus.message}
          </div>
        )}
        <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {rideRequests.length} ride request{rideRequests.length !== 1 ? 's' : ''} available
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={fetchRideRequests}
                disabled={isLoadingRides}
              >
                {isLoadingRides ? 'Loading…' : 'Refresh'}
              </button>
            </div>

            {ridesError && (
              <div className="status-banner error" style={{ marginBottom: '1rem' }}>
                {ridesError}
              </div>
            )}

            {rideRequests.length > 0 && (
              <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
                <MapContainer
                  center={DEFAULT_CENTER}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: '280px', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution="&copy; OpenStreetMap contributors"
                  />
                  {rideRequests.map((req) => (
                    <Marker
                      key={req.txHash}
                      position={[req.pickupLocation.latitude, req.pickupLocation.longitude]}
                      eventHandlers={{
                        click: () => setSelectedTxHash((prev) => (prev === req.txHash ? null : req.txHash)),
                      }}
                    >
                      <Popup>
                        <strong>Pickup</strong>
                        <br />
                        Fare: {req.fare} CLT
                        <br />
                        <small>{req.txHash.substring(0, 10)}…</small>
                      </Popup>
                    </Marker>
                  ))}
                  {selectedTxHash &&
                    (() => {
                      const req = rideRequests.find((r) => r.txHash === selectedTxHash);
                      if (!req) return null;
                      const pickup = [req.pickupLocation.latitude, req.pickupLocation.longitude];
                      const dropoff = [req.dropoffLocation.latitude, req.dropoffLocation.longitude];
                      return (
                        <>
                          <Polyline
                            positions={[pickup, dropoff]}
                            color="#0ea5e9"
                            weight={3}
                            opacity={0.8}
                          />
                          <Marker position={dropoff}>
                            <Popup>
                              <strong>Dropoff</strong>
                              <br />
                              Fare: {req.fare} CLT
                              <br />
                              <small>{req.txHash.substring(0, 10)}…</small>
                            </Popup>
                          </Marker>
                        </>
                      );
                    })()}
                </MapContainer>
              </div>
            )}

            {rideRequests.length === 0 && !isLoadingRides && !ridesError && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No ride requests yet. When passengers request rides, they will appear here.
              </div>
            )}

            {rideRequests.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {rideRequests.map((req) => (
                  <div
                    key={req.txHash}
                    style={{
                      padding: '0.875rem',
                      background: 'var(--bg-elevated)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                          {req.fare} CLT
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Pickup: {req.pickupLocation.latitude.toFixed(4)}, {req.pickupLocation.longitude.toFixed(4)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Dropoff: {req.dropoffLocation.latitude.toFixed(4)}, {req.dropoffLocation.longitude.toFixed(4)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Passenger: {req.passengerAddress.substring(0, 10)}…{req.passengerAddress.slice(-8)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Your offer:</label>
                          <input
                            type="number"
                            min={0}
                            value={offerFares[req.txHash] !== undefined ? offerFares[req.txHash] : req.fare}
                            onChange={(e) => handleFareChange(req.txHash, e.target.value)}
                            className="input-field"
                            style={{ width: 100, padding: '0.375rem 0.5rem', fontSize: '0.85rem' }}
                            disabled={acceptingTxHash === req.txHash}
                          />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CLT</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', flexShrink: 0 }}
                        disabled={!!acceptingTxHash || !userProfile.publicKey}
                        onClick={() => handleAcceptOffer(req)}
                      >
                        {acceptingTxHash === req.txHash ? 'Submitting…' : userProfile.publicKey ? 'Make Offer' : 'Connect wallet'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </>
      </div>

      <TransactionHistory userPublicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} />
    </div>
  );
};

export default DriverView;
