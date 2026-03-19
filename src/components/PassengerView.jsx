import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
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

const RideRequestCard = ({ req, userProfile, onAcceptSuccess }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [acceptingOfferTxHash, setAcceptingOfferTxHash] = useState(null);
  const [acceptError, setAcceptError] = useState(null);

  const fetchOffers = useCallback(async () => {
    if (!userProfile.publicKey || !req.txHash) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
      const fetchedOffers = await sdk.listRideOffers(req.txHash);
      setOffers(fetchedOffers);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
      setError(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, [req.txHash, userProfile.publicKey]);

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 10000);
    return () => clearInterval(interval);
  }, [fetchOffers]);

  const handleAcceptOffer = useCallback(async (offer) => {
    if (!userProfile.publicKey || !offer.txHash) return;
    setAcceptingOfferTxHash(offer.txHash);
    setAcceptError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
      const unsignedTx = await sdk.createUnsignedRideAcceptance({ rideOfferTxHash: offer.txHash });
      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = window.prompt('Enter your private key to sign the acceptance:');
        if (!privateKey) {
          setAcceptError('Signing cancelled.');
          setAcceptingOfferTxHash(null);
          return;
        }
      }
      const signature = await sdk.signTransaction(unsignedTx, privateKey);
      await sdk.submitTransaction(signature.rawTransaction);
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Acceptance',
        timestamp: Date.now(),
        rideOfferTxHash: offer.txHash,
        status: 'success',
        txHash: signature.txHash || '',
      });
      onAcceptSuccess?.();
    } catch (err) {
      console.error('Accept offer failed:', err);
      setAcceptError(err.message || 'Failed to accept offer');
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Acceptance',
        timestamp: Date.now(),
        rideOfferTxHash: offer.txHash,
        status: 'failed',
        error: err.message,
      });
    } finally {
      setAcceptingOfferTxHash(null);
    }
  }, [userProfile, onAcceptSuccess]);

  const pickup = [req.pickup.lat, req.pickup.lng];
  const dropoff = [req.dropoff.lat, req.dropoff.lng];

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 className="card-title" style={{ margin: 0, display: 'inline-block' }}>Ride Request</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            {new Date(req.timestamp).toLocaleString()}
          </span>
        </div>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {req.fare} CLT
        </div>
      </div>
      
      <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
        <MapContainer center={pickup} zoom={13} style={{ height: '220px', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapFitBounds positions={[pickup, dropoff]} />
          <Marker position={pickup}><Popup>Pickup</Popup></Marker>
          <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>
          <Polyline positions={[pickup, dropoff]} color="#0ea5e9" weight={3} opacity={0.8} />
        </MapContainer>
      </div>

      {req.passengerAddress && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
          <strong>Passenger:</strong> {req.passengerAddress}
        </div>
      )}
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', wordBreak: 'break-all' }}>
        <strong>Request Tx:</strong> {req.txHash}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h4 style={{ fontSize: '0.875rem', margin: 0, color: 'var(--text-secondary)' }}>Offers ({offers.length})</h4>
          <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={fetchOffers} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {error && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{error}</div>}
        {acceptError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem' }}>{acceptError}</div>}

        {offers.length === 0 && !loading && !error && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            No offers yet.
          </div>
        )}

        {offers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {offers.map((offer) => (
              <div key={offer.txHash} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{offer.fare} CLT</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}><strong>Driver:</strong> {offer.driverAddress}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}><strong>Offer Tx:</strong> {offer.txHash}</div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', alignSelf: 'flex-start', marginTop: '0.25rem' }}
                  onClick={() => handleAcceptOffer(offer)}
                  disabled={!!acceptingOfferTxHash}
                >
                  {acceptingOfferTxHash === offer.txHash ? 'Accepting…' : 'Accept Offer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const PassengerView = () => {
  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [fare, setFare] = useState(1000);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);
  const [previousRequests, setPreviousRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeTripsLoading, setActiveTripsLoading] = useState(false);
  const [activeTripsError, setActiveTripsError] = useState(null);

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);

  const fetchActiveTrips = useCallback(async () => {
    if (!userProfile.publicKey) {
      setActiveTrips([]);
      return;
    }
    setActiveTripsLoading(true);
    setActiveTripsError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
      const trips = await sdk.listActiveTrips({ passengerAddress: userProfile.publicKey });
      setActiveTrips(trips);
    } catch (err) {
      console.error('Failed to fetch active trips:', err);
      setActiveTripsError(err.message || 'Failed to load active trips');
      setActiveTrips([]);
    } finally {
      setActiveTripsLoading(false);
    }
  }, [userProfile.publicKey]);

  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, 3000);
    return () => clearInterval(interval);
  }, [fetchActiveTrips]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchRequests = async () => {
      if (!userProfile.publicKey) {
        if (isMounted) setPreviousRequests([]);
        return;
      }
      
      try {
        const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
        const allRequests = await sdk.listRideRequests();
        if (isMounted) {
          const myRequests = allRequests.filter(req => req.passengerAddress === userProfile.publicKey);
          
          // Attempt to get timestamps from localStorage if available
          const stored = localStorage.getItem(`clutch_tx_${userProfile.publicKey}`);
          let txMap = {};
          if (stored) {
            try {
              const allTxs = JSON.parse(stored);
              allTxs.forEach(tx => { if (tx.txHash) txMap[tx.txHash] = tx; });
            } catch (e) {}
          }

          const formattedRequests = myRequests.map(r => {
            const localTx = txMap[r.txHash];
            return {
              type: 'Ride Request',
              timestamp: localTx && localTx.timestamp ? localTx.timestamp : Date.now(),
              pickup: { lat: r.pickupLocation.latitude, lng: r.pickupLocation.longitude },
              dropoff: { lat: r.dropoffLocation.latitude, lng: r.dropoffLocation.longitude },
              fare: r.fare,
              txHash: r.txHash,
              passengerAddress: r.passengerAddress,
            };
          });
          
          // Sort descending by timestamp
          formattedRequests.sort((a, b) => b.timestamp - a.timestamp);
          setPreviousRequests(formattedRequests);
        }
      } catch (err) {
        console.error("Failed to fetch ride requests from node:", err);
      }
    };

    fetchRequests();
    // Poll for new requests every 10 seconds
    const interval = setInterval(fetchRequests, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [userProfile.publicKey, refreshBalanceCounter]);
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
        txHash: signature.txHash || '',
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
      <UserProfile role="passenger" onProfileUpdate={handleProfileUpdate} />
      <BalanceDisplay publicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} />

      {transactionStatus && (
        <div className={`status-banner ${transactionStatus.type}`}>
          {transactionStatus.message}
        </div>
      )}

      {userProfile.publicKey && (
        <div className="card">
          <h3 className="card-title">Active trips</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Trips you have accepted that are in progress.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {activeTrips.length} active trip{activeTrips.length !== 1 ? 's' : ''}
            </span>
            <button type="button" className="btn-secondary" onClick={fetchActiveTrips} disabled={activeTripsLoading}>
              {activeTripsLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {activeTripsError && (
            <div className="status-banner error" style={{ marginBottom: '1rem' }}>{activeTripsError}</div>
          )}
          {activeTrips.length === 0 && !activeTripsLoading && !activeTripsError && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No active trips. Accepted offers will appear here.
            </div>
          )}
          {activeTrips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {activeTrips.map((trip) => (
                <ActiveTripCard key={trip.txHash} trip={trip} />
              ))}
            </div>
          )}
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
              {pickup && dropoff && (
                <MapFitBounds positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} />
              )}
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

      {userProfile.publicKey && previousRequests.length > 0 && (
        <div>
          <h3 className="card-title" style={{ marginBottom: '1rem', marginTop: '2rem' }}>Active Requests</h3>
          {previousRequests.map((req, idx) => (
            <RideRequestCard
              key={req.txHash || idx}
              req={req}
              userProfile={userProfile}
              onAcceptSuccess={() => setRefreshBalanceCounter((prev) => prev + 1)}
            />
          ))}
        </div>
      )}

      <TransactionHistory userPublicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} />
    </div>
  );
};

export default PassengerView;
