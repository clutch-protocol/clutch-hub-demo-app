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
import { ACTIVE_TRIPS_POLL_MS } from '../pollIntervals';
import TransactionHistory from './TransactionHistory';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

function truncAddr(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

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
    <div className="card">
      <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(req.timestamp).toLocaleString()}</span>
        <span className="fare-badge">{req.fare} CLT</span>
      </div>

      <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
        <MapContainer center={pickup} zoom={13} style={{ height: '180px', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
          <MapFitBounds positions={[pickup, dropoff]} />
          <Marker position={pickup}><Popup>Pickup</Popup></Marker>
          <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>
          <Polyline positions={[pickup, dropoff]} color="var(--accent)" weight={3} opacity={0.8} />
        </MapContainer>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
        <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Offers ({offers.length})</span>
          <button type="button" className="btn-ghost" onClick={fetchOffers} disabled={loading} style={{ fontSize: '0.75rem' }}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
        {acceptError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{acceptError}</div>}

        {offers.length === 0 && !loading && !error && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No offers yet.</p>
        )}

        {offers.map((offer) => (
          <div key={offer.txHash} className="offer-row">
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{offer.fare} CLT</span>
              <span className="truncate-address" style={{ marginLeft: '0.5rem' }}>{truncAddr(offer.driverAddress)}</span>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', flexShrink: 0 }}
              onClick={() => handleAcceptOffer(offer)}
              disabled={!!acceptingOfferTxHash}
            >
              {acceptingOfferTxHash === offer.txHash ? 'Accepting...' : 'Accept'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const PassengerView = () => {
  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [fare, setFare] = useState('');
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);
  const [previousRequests, setPreviousRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeTripsLoading, setActiveTripsLoading] = useState(false);
  const [activeTripsError, setActiveTripsError] = useState(null);
  const [passengerTab, setPassengerTab] = useState('new');

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);

  const fetchActiveTrips = useCallback(async () => {
    if (!userProfile.publicKey) {
      setActiveTrips([]);
      setActiveTripsLoading(false);
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

  // Poll in-progress trips; include refreshBalanceCounter so accept / pay triggers an immediate refetch
  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, ACTIVE_TRIPS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchActiveTrips, refreshBalanceCounter]);

  // Opening "My Rides" should show the latest trip right away (don’t wait for the next tick)
  useEffect(() => {
    if (passengerTab === 'rides' && userProfile.publicKey) {
      fetchActiveTrips();
    }
  }, [passengerTab, userProfile.publicKey, fetchActiveTrips]);

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
            try { JSON.parse(stored).forEach((tx) => { if (tx.txHash) txMap[tx.txHash] = tx; }); } catch (e) {}
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
      setTransactionStatus({ type: 'info', message: 'Signing...' });
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
      setTransactionStatus({ type: 'info', message: 'Submitting...' });
      await sdk.submitTransaction(signature.rawTransaction);
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Request',
        timestamp: Date.now(),
        pickup, dropoff,
        fare: Number(fare),
        status: 'success',
        txHash: signature.txHash || '',
      });
      setTransactionStatus({ type: 'success', message: 'Ride request submitted! Awaiting driver offers.' });
      setRefreshBalanceCounter((prev) => prev + 1);
      setTimeout(() => setTransactionStatus(null), 5000);
    } catch (err) {
      console.error(err);
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Request',
        timestamp: Date.now(),
        pickup, dropoff,
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
    <div>
      <WalletBar role="passenger" userProfile={userProfile} onProfileUpdate={handleProfileUpdate} refreshTrigger={refreshBalanceCounter} />

      <div className="explorer-tabs">
        <button
          type="button"
          className={`explorer-tab ${passengerTab === 'new' ? 'active' : ''}`}
          onClick={() => setPassengerTab('new')}
        >
          New Request
        </button>
        <button
          type="button"
          className={`explorer-tab ${passengerTab === 'rides' ? 'active' : ''}`}
          onClick={() => setPassengerTab('rides')}
        >
          My Rides
          {userProfile.publicKey && (activeTrips.length + previousRequests.length) > 0 && (
            <span className="section-badge" style={{ marginLeft: '0.35rem' }}>{activeTrips.length + previousRequests.length}</span>
          )}
        </button>
      </div>

      {passengerTab === 'new' && (
        <>
          {transactionStatus && (
            <div className={`status-banner ${transactionStatus.type}`}>{transactionStatus.message}</div>
          )}

          <Section title="Request a ride" icon="📍" description="Click the map to set pickup and dropoff, then submit.">
            <div className="card">
              <form onSubmit={handleSubmit}>
                <div className="form-row" style={{ marginBottom: '1rem' }}>
                  <div style={{ flex: '0 0 auto' }}>
                    <label className="label">Fare (CLT)</label>
                    <input
                      type="number"
                      value={fare}
                      onChange={(e) => setFare(e.target.value)}
                      className="input-field"
                      style={{ width: 120 }}
                      min={0}
                      placeholder="Enter amount"
                      required
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <button type="button" onClick={handleReset} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>Reset</button>
                    <button type="submit" disabled={!(pickup && dropoff && userProfile.publicKey && fare) || isLoading} className="btn-primary" style={{ whiteSpace: 'nowrap' }}>
                      {isLoading ? 'Processing...' : 'Request Ride'}
                    </button>
                  </div>
                </div>

                {pickup && dropoff && (
                  <div className="form-row" style={{ marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(34,197,94,0.08)', color: '#15803d', borderRadius: 'var(--radius-full)' }}>
                      Pickup: {pickup.lat.toFixed(4)}, {pickup.lng.toFixed(4)}
                    </span>
                    <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'rgba(239,68,68,0.08)', color: '#dc2626', borderRadius: 'var(--radius-full)' }}>
                      Dropoff: {dropoff.lat.toFixed(4)}, {dropoff.lng.toFixed(4)}
                    </span>
                  </div>
                )}

                <div className="map-wrapper">
                  <MapContainer center={[27.1883, 56.3772]} zoom={12} style={{ height: '320px', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                    {pickup && dropoff && <MapFitBounds positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} />}
                    <LocationSelector pickup={pickup} dropoff={dropoff} setPickup={setPickup} setDropoff={setDropoff} />
                    {pickup && <Marker position={pickup}><Popup>Pickup</Popup></Marker>}
                    {dropoff && <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>}
                    {pickup && dropoff && <Polyline positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} color="var(--accent)" weight={3} opacity={0.8} />}
                  </MapContainer>
                </div>

                {!pickup && <p className="map-hint" style={{ marginTop: '0.5rem' }}>Click the map to set pickup location</p>}
                {pickup && !dropoff && <p className="map-hint" style={{ marginTop: '0.5rem' }}>Now click to set dropoff location</p>}
              </form>
            </div>
          </Section>
        </>
      )}

      {passengerTab === 'rides' && (
        <Section
          title="My rides"
          icon="🚗"
          description={userProfile.publicKey ? 'Active trips and requests awaiting driver offers.' : 'Connect your wallet to see your rides.'}
        >
          {!userProfile.publicKey ? (
            <EmptyState message="Connect your wallet above to view active trips and pending requests." />
          ) : (
            <>
              {activeTripsError && <div className="status-banner error">{activeTripsError}</div>}

              {activeTrips.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="card-title">Active trips</p>
                  {activeTrips.map((trip) => (
                    <ActiveTripCard
                      key={trip.txHash}
                      trip={trip}
                      passengerPayment={{
                        userProfile,
                        onSuccess: () => setRefreshBalanceCounter((prev) => prev + 1),
                      }}
                    />
                  ))}
                </div>
              )}

              {previousRequests.length > 0 && (
                <div>
                  <p className="card-title">Requests awaiting offers</p>
                  {previousRequests.map((req, idx) => (
                    <RideRequestCard
                      key={req.txHash || idx}
                      req={req}
                      userProfile={userProfile}
                      onAcceptSuccess={() => {
                        setRefreshBalanceCounter((prev) => prev + 1);
                        setPassengerTab('rides');
                      }}
                    />
                  ))}
                </div>
              )}

              {activeTrips.length === 0 && previousRequests.length === 0 && !activeTripsLoading && !activeTripsError && (
                <EmptyState message="No active trips or pending requests yet. Create a new request in the New Request tab." />
              )}
            </>
          )}
        </Section>
      )}

      {userProfile.publicKey && (
        <Section title="Transaction history" icon="📋" collapsible defaultExpanded={false}>
          <TransactionHistory userPublicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} contentOnly />
        </Section>
      )}
    </div>
  );
};

export default PassengerView;
