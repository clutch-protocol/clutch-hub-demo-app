import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
import CompletedTripCard from './CompletedTripCard';
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

const RideRequestCard = ({
  req,
  userProfile,
  offerFares,
  handleFareChange,
  handleAcceptOffer,
  acceptingTxHash,
}) => {
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offersError, setOffersError] = useState(null);

  const fetchOffers = useCallback(async () => {
    if (!req.txHash) return;
    setLoadingOffers(true);
    setOffersError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey || '0x0');
      const fetchedOffers = await sdk.listRideOffers(req.txHash);
      setOffers(fetchedOffers);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
      setOffersError(err.message || 'Failed to load offers');
    } finally {
      setLoadingOffers(false);
    }
  }, [req.txHash, userProfile.publicKey]);

  useEffect(() => {
    fetchOffers();
    const interval = setInterval(fetchOffers, 10000);
    return () => clearInterval(interval);
  }, [fetchOffers]);

  const pickup = [req.pickupLocation.latitude, req.pickupLocation.longitude];
  const dropoff = [req.dropoffLocation.latitude, req.dropoffLocation.longitude];

  return (
    <div className="card">
      <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <span className="truncate-address" title={req.passengerAddress}>
          Passenger: {truncAddr(req.passengerAddress)}
        </span>
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

      {/* Existing offers */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
        <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Offers ({offers.length})</span>
          <button type="button" className="btn-ghost" onClick={fetchOffers} disabled={loadingOffers} style={{ fontSize: '0.75rem' }}>
            {loadingOffers ? '...' : 'Refresh'}
          </button>
        </div>
        {offersError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{offersError}</div>}
        {offers.length === 0 && !loadingOffers && !offersError && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No offers yet.</p>
        )}
        {offers.map((offer) => (
          <div key={offer.txHash} className="offer-row">
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{offer.fare} CLT</span>
            <span className="truncate-address">{truncAddr(offer.driverAddress)}</span>
          </div>
        ))}
      </div>

      {/* Make offer */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
        <div className="form-row">
          <label className="label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Your offer</label>
          <input
            type="number"
            min={0}
            value={offerFares[req.txHash] !== undefined ? offerFares[req.txHash] : req.fare}
            onChange={(e) => handleFareChange(req.txHash, e.target.value)}
            className="input-field"
            style={{ width: 100, padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
            disabled={acceptingTxHash === req.txHash}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CLT</span>
          <button
            type="button"
            className="btn-primary"
            style={{ marginLeft: 'auto', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            disabled={!!acceptingTxHash || !userProfile.publicKey}
            onClick={() => handleAcceptOffer(req)}
          >
            {acceptingTxHash === req.txHash ? 'Submitting...' : userProfile.publicKey ? 'Make Offer' : 'Connect wallet'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DriverView = () => {
  const [userProfile, setUserProfile] = useState({ publicKey: '', privateKey: '' });
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);
  const [rideRequests, setRideRequests] = useState([]);
  const [isLoadingRides, setIsLoadingRides] = useState(false);
  const [ridesError, setRidesError] = useState(null);
  const [acceptingTxHash, setAcceptingTxHash] = useState(null);
  const [acceptStatus, setAcceptStatus] = useState(null);
  const [offerFares, setOfferFares] = useState({});
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeTripsLoading, setActiveTripsLoading] = useState(false);
  const [activeTripsError, setActiveTripsError] = useState(null);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [completedTripsLoading, setCompletedTripsLoading] = useState(false);
  const [completedTripsError, setCompletedTripsError] = useState(null);
  const [driverTab, setDriverTab] = useState('find');

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
      const trips = await sdk.listActiveTrips({ driverAddress: userProfile.publicKey });
      setActiveTrips(trips);
    } catch (err) {
      console.error('Failed to fetch active trips:', err);
      setActiveTripsError(err.message || 'Failed to load active trips');
      setActiveTrips([]);
    } finally {
      setActiveTripsLoading(false);
    }
  }, [userProfile.publicKey]);

  const fetchCompletedTrips = useCallback(async () => {
    if (!userProfile.publicKey) {
      setCompletedTrips([]);
      setCompletedTripsLoading(false);
      return;
    }
    setCompletedTripsLoading(true);
    setCompletedTripsError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey);
      const trips = await sdk.listCompletedTrips({ driverAddress: userProfile.publicKey });
      setCompletedTrips(trips);
    } catch (err) {
      console.error('Failed to fetch completed trips:', err);
      setCompletedTripsError(err.message || 'Failed to load completed trips');
      setCompletedTrips([]);
    } finally {
      setCompletedTripsLoading(false);
    }
  }, [userProfile.publicKey]);

  // Include refreshBalanceCounter so balance-related refreshes also pull latest trips
  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, ACTIVE_TRIPS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchActiveTrips, refreshBalanceCounter]);

  useEffect(() => {
    fetchCompletedTrips();
    const interval = setInterval(fetchCompletedTrips, ACTIVE_TRIPS_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchCompletedTrips, refreshBalanceCounter]);

  // Opening "My Trips" refetches immediately (passenger may have just accepted)
  useEffect(() => {
    if (driverTab === 'trips' && userProfile.publicKey) {
      fetchActiveTrips();
      fetchCompletedTrips();
    }
  }, [driverTab, userProfile.publicKey, fetchActiveTrips, fetchCompletedTrips]);

  const fetchRideRequests = useCallback(async () => {
    setIsLoadingRides(true);
    setRidesError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, userProfile.publicKey || '0x0');
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
    const interval = setInterval(fetchRideRequests, 3000);
    return () => clearInterval(interval);
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
      const unsignedTx = await sdk.createUnsignedRideOffer({ rideRequestTxHash: req.txHash, fare: offerFare });
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
      setAcceptStatus({ type: 'success', message: 'Offer submitted!' });
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
      setTimeout(() => setAcceptStatus(null), 5000);
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
  }, [userProfile, offerFares, fetchRideRequests]);

  return (
    <div>
      <WalletBar role="driver" userProfile={userProfile} onProfileUpdate={handleProfileUpdate} refreshTrigger={refreshBalanceCounter} />

      <div className="explorer-tabs">
        <button
          type="button"
          className={`explorer-tab ${driverTab === 'find' ? 'active' : ''}`}
          onClick={() => setDriverTab('find')}
        >
          Find Rides
          {rideRequests.length > 0 && (
            <span className="section-badge" style={{ marginLeft: '0.35rem' }}>{rideRequests.length}</span>
          )}
        </button>
        <button
          type="button"
          className={`explorer-tab ${driverTab === 'trips' ? 'active' : ''}`}
          onClick={() => setDriverTab('trips')}
        >
          My Trips
          {userProfile.publicKey && (activeTrips.length + completedTrips.length) > 0 && (
            <span className="section-badge" style={{ marginLeft: '0.35rem' }}>{activeTrips.length + completedTrips.length}</span>
          )}
        </button>
      </div>

      {driverTab === 'find' && (
        <Section
          title="Available rides"
          icon="📍"
          description="Ride requests from passengers. Make an offer with your fare to get matched."
          action={
            <button type="button" className="btn-ghost" onClick={fetchRideRequests} disabled={isLoadingRides} style={{ fontSize: '0.75rem' }}>
              {isLoadingRides ? '...' : 'Refresh'}
            </button>
          }
        >
          {acceptStatus && <div className={`status-banner ${acceptStatus.type}`}>{acceptStatus.message}</div>}
          {ridesError && <div className="status-banner error">{ridesError}</div>}

          {rideRequests.length === 0 && !isLoadingRides && !ridesError && (
            <EmptyState message="No ride requests yet. When passengers request rides, they will appear here." />
          )}

          {rideRequests.map((req) => (
            <RideRequestCard
              key={req.txHash}
              req={req}
              userProfile={userProfile}
              offerFares={offerFares}
              handleFareChange={handleFareChange}
              handleAcceptOffer={handleAcceptOffer}
              acceptingTxHash={acceptingTxHash}
            />
          ))}
        </Section>
      )}

      {driverTab === 'trips' && (
        <Section
          title="My trips"
          icon="🚗"
          description={userProfile.publicKey ? 'In-progress rides and trips where the passenger has paid the full fare.' : 'Connect your wallet to see your trips.'}
        >
          {!userProfile.publicKey ? (
            <EmptyState message="Connect your wallet above to view active trips." />
          ) : (
            <>
              {activeTripsError && <div className="status-banner error">{activeTripsError}</div>}
              {completedTripsError && <div className="status-banner error">{completedTripsError}</div>}

              {activeTrips.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="card-title">Active trips</p>
                  {activeTrips.map((trip) => <ActiveTripCard key={trip.txHash} trip={trip} />)}
                </div>
              )}

              {completedTrips.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <p className="card-title">Completed trips</p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0' }}>
                    Passenger paid the full agreed fare.
                  </p>
                  {completedTrips.map((trip) => (
                    <CompletedTripCard key={trip.txHash} trip={trip} />
                  ))}
                </div>
              )}

              {activeTrips.length === 0 && completedTrips.length === 0
                && !activeTripsLoading && !completedTripsLoading && !activeTripsError && !completedTripsError && (
                <EmptyState message="No trips yet. When a passenger accepts your offer, the ride appears under Active; after full payment it moves to Completed." />
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

export default DriverView;
