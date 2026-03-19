import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
import { Section, WalletBar, EmptyState } from './layout';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';
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
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(req.timestamp).toLocaleString()}</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginLeft: '0.5rem' }}>{req.fare} CLT</span>
        </div>
      </div>
      <div className="map-wrapper" style={{ marginBottom: '1rem', height: '200px' }}>
        <MapContainer center={pickup} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapFitBounds positions={[pickup, dropoff]} />
          <Marker position={pickup}><Popup>Pickup</Popup></Marker>
          <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>
          <Polyline positions={[pickup, dropoff]} color="#0ea5e9" weight={3} opacity={0.8} />
        </MapContainer>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Offers ({offers.length})</span>
          <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={fetchOffers} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {error && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
        {acceptError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{acceptError}</div>}
        {offers.length === 0 && !loading && !error && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No offers yet.</p>
        )}
        {offers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {offers.map((offer) => (
              <div key={offer.txHash} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{offer.fare} CLT</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>Driver: {offer.driverAddress}</div>
                <button
                  type="button"
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}
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
    if (!userProfile.publicKey) { setActiveTrips([]); return; }
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
      if (!userProfile.publicKey) { if (isMounted) setPreviousRequests([]); return; }
      try {
        const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
        const allRequests = await sdk.listRideRequests();
        if (isMounted) {
          const myRequests = allRequests.filter((req) => req.passengerAddress === userProfile.publicKey);
          const stored = localStorage.getItem(`clutch_tx_${userProfile.publicKey}`);
          let txMap = {};
          if (stored) {
            try {
              JSON.parse(stored).forEach((tx) => { if (tx.txHash) txMap[tx.txHash] = tx; });
            } catch (e) {}
          }
          const formatted = myRequests.map((r) => {
            const localTx = txMap[r.txHash];
            return {
              type: 'Ride Request',
              timestamp: localTx?.timestamp ?? Date.now(),
              pickup: { lat: r.pickupLocation.latitude, lng: r.pickupLocation.longitude },
              dropoff: { lat: r.dropoffLocation.latitude, lng: r.dropoffLocation.longitude },
              fare: r.fare,
              txHash: r.txHash,
              passengerAddress: r.passengerAddress,
            };
          });
          formatted.sort((a, b) => b.timestamp - a.timestamp);
          setPreviousRequests(formatted);
        }
      } catch (err) {
        console.error('Failed to fetch ride requests:', err);
      }
    };
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => { isMounted = false; clearInterval(interval); };
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
      setTransactionStatus({ type: 'info', message: 'Submitting transaction...' });
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
      setTransactionStatus({ type: 'success', message: 'Ride request submitted! Awaiting driver offers.' });
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
      setTransactionStatus({ type: 'error', message: 'Failed: ' + (err.message || 'Unknown error') });
    } finally {
      setIsLoading(false);
    }
  }, [pickup, dropoff, userProfile, fare]);

  return (
    <div className="passenger-view">
      <WalletBar role="passenger" userProfile={userProfile} onProfileUpdate={handleProfileUpdate} refreshTrigger={refreshBalanceCounter} />

      {transactionStatus && (
        <div className={`status-banner ${transactionStatus.type}`} style={{ marginBottom: '1rem' }}>
          {transactionStatus.message}
        </div>
      )}

      <Section
        title="Request a ride"
        description="Select pickup and dropoff on the map, set your fare, and submit. Drivers will see your request and can make offers."
      >
        <div className="card">
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
            <p className="map-hint">Click the map to set pickup (first) and dropoff (second)</p>
            <div className="map-wrapper">
              <MapContainer center={[27.1883, 56.3772]} zoom={12} style={{ height: '340px', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                {pickup && dropoff && <MapFitBounds positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} />}
                <LocationSelector pickup={pickup} dropoff={dropoff} setPickup={setPickup} setDropoff={setDropoff} />
                {pickup && <Marker position={pickup}><Popup>Pickup</Popup></Marker>}
                {dropoff && <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>}
              </MapContainer>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
              <button type="button" onClick={handleReset} className="btn-secondary">Reset</button>
              <button type="submit" disabled={!(pickup && dropoff && userProfile.publicKey) || isLoading} className="btn-primary">
                {isLoading ? 'Processing…' : 'Request Ride'}
              </button>
            </div>
          </form>
        </div>
      </Section>

      {userProfile.publicKey && (
        <Section
          title="My activity"
          description="Your active trips and ride requests awaiting offers."
          badge={activeTrips.length + previousRequests.length > 0 ? `${activeTrips.length + previousRequests.length}` : null}
          action={
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={fetchActiveTrips} disabled={activeTripsLoading}>
              Refresh
            </button>
          }
        >
          {activeTripsError && <div className="status-banner error" style={{ marginBottom: '1rem' }}>{activeTripsError}</div>}

          {activeTrips.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>Active trips</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activeTrips.map((trip) => <ActiveTripCard key={trip.txHash} trip={trip} />)}
              </div>
            </div>
          )}

          {previousRequests.length > 0 && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 0.75rem 0' }}>Requests awaiting offers</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {previousRequests.map((req, idx) => (
                  <RideRequestCard
                    key={req.txHash || idx}
                    req={req}
                    userProfile={userProfile}
                    onAcceptSuccess={() => setRefreshBalanceCounter((prev) => prev + 1)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTrips.length === 0 && previousRequests.length === 0 && !activeTripsLoading && !activeTripsError && (
            <EmptyState message="No active trips or pending requests. Request a ride above to get started." icon="🚗" />
          )}
        </Section>
      )}

      {userProfile.publicKey && (
        <Section title="Transaction history" description="Recent transactions from this session." collapsible defaultExpanded={false}>
          <TransactionHistory userPublicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} contentOnly />
        </Section>
      )}
    </div>
  );
};

export default PassengerView;
