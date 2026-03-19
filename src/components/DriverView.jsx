import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{req.fare} CLT</span>
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
      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem', wordBreak: 'break-all' }}>
        Passenger: {req.passengerAddress}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Offers ({offers.length})</span>
          <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={fetchOffers} disabled={loadingOffers}>
            {loadingOffers ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
        {offersError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{offersError}</div>}
        {offers.length === 0 && !loadingOffers && !offersError && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>No offers yet.</p>
        )}
        {offers.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {offers.map((offer) => (
              <div key={offer.txHash} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{offer.fare} CLT</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>Driver: {offer.driverAddress}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
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
        <button
          type="button"
          className="btn-primary"
          style={{ fontSize: '0.8rem' }}
          disabled={!!acceptingTxHash || !userProfile.publicKey}
          onClick={() => handleAcceptOffer(req)}
        >
          {acceptingTxHash === req.txHash ? 'Submitting…' : userProfile.publicKey ? 'Make Offer' : 'Connect wallet'}
        </button>
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

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);

  const fetchActiveTrips = useCallback(async () => {
    if (!userProfile.publicKey) { setActiveTrips([]); return; }
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

  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, 3000);
    return () => clearInterval(interval);
  }, [fetchActiveTrips]);

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
  }, [userProfile, offerFares, fetchRideRequests]);

  return (
    <div className="driver-view">
      <WalletBar role="driver" userProfile={userProfile} onProfileUpdate={handleProfileUpdate} refreshTrigger={refreshBalanceCounter} />

      {userProfile.publicKey && (
        <Section
          title="My active trips"
          description="Trips you are currently driving. Accepted by passengers, in progress."
          badge={activeTrips.length > 0 ? `${activeTrips.length}` : null}
          action={
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={fetchActiveTrips} disabled={activeTripsLoading}>
              Refresh
            </button>
          }
        >
          {activeTripsError && <div className="status-banner error" style={{ marginBottom: '1rem' }}>{activeTripsError}</div>}
          {activeTrips.length === 0 && !activeTripsLoading && !activeTripsError && (
            <EmptyState message="No active trips. When a passenger accepts your offer, it will appear here." icon="🚗" />
          )}
          {activeTrips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeTrips.map((trip) => <ActiveTripCard key={trip.txHash} trip={trip} />)}
            </div>
          )}
        </Section>
      )}

      <Section
        title="Available ride requests"
        description="Ride requests from passengers. Make an offer with your fare to get matched."
        badge={rideRequests.length > 0 ? `${rideRequests.length}` : null}
        action={
          <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={fetchRideRequests} disabled={isLoadingRides}>
            {isLoadingRides ? 'Loading…' : 'Refresh'}
          </button>
        }
      >
        {acceptStatus && (
          <div className={`status-banner ${acceptStatus.type}`} style={{ marginBottom: '1rem' }}>
            {acceptStatus.message}
          </div>
        )}
        {ridesError && <div className="status-banner error" style={{ marginBottom: '1rem' }}>{ridesError}</div>}
        {rideRequests.length === 0 && !isLoadingRides && !ridesError && (
          <EmptyState message="No ride requests yet. When passengers request rides, they will appear here." icon="📍" />
        )}
        {rideRequests.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
          </div>
        )}
      </Section>

      {userProfile.publicKey && (
        <Section title="Transaction history" description="Recent offers and activity." collapsible defaultExpanded={false}>
          <TransactionHistory userPublicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} contentOnly />
        </Section>
      )}
    </div>
  );
};

export default DriverView;
