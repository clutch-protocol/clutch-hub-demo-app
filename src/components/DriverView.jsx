import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
import CompletedTripCard from './CompletedTripCard';
import { Section, WalletBar, EmptyState } from './layout';
import ExplorerTabs from './ExplorerTabs';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL, MAP_TILE_URL, MAP_ATTRIBUTION } from '../config';
import { useClutchSdk } from '../hooks/useClutchSdk';
import { truncAddr } from '../utils/address';
import Icon from './Icon';
import {
  subscribeActiveTripsCompat,
  subscribeRecentTripsCompat,
  subscribeRideOffersCompat,
  subscribeRideRequestsCompat,
} from '../sdkRealtime';
import TransactionHistory from './TransactionHistory';
import { usePrivateKeyRequest } from './layout/usePrivateKeyRequest.jsx';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const RideRequestCard = ({
  req,
  userProfile,
  hubSdk,
  offerFares,
  handleFareChange,
  handleAcceptOffer,
  acceptingTxHash,
  disabled,
}) => {
  const [offers, setOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [offersError, setOffersError] = useState(null);

  const fetchOffers = useCallback(async () => {
    if (!req.txHash) return;
    setLoadingOffers(true);
    setOffersError(null);
    try {
      const sdk = hubSdk ?? new ClutchHubSdk(API_URL, userProfile.publicKey || '0x0');
      const fetchedOffers = await sdk.listRideOffers(req.txHash);
      setOffers(fetchedOffers);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
      setOffersError(err.message || 'Failed to load offers');
    } finally {
      setLoadingOffers(false);
    }
  }, [req.txHash, userProfile.publicKey, hubSdk]);

  useEffect(() => {
    if (!req.txHash) return undefined;
    setLoadingOffers(true);
    setOffersError(null);
    const sdk = hubSdk ?? new ClutchHubSdk(API_URL, userProfile.publicKey || '0x0');
    const dispose = subscribeRideOffersCompat(sdk, req.txHash, {
      onData: (list) => {
        setOffers(list);
        setLoadingOffers(false);
      },
      onError: (err) => {
        console.error('Offers subscription error:', err);
        setOffersError(err.message || 'Failed to load offers');
        setLoadingOffers(false);
      },
    });
    return () => dispose();
  }, [req.txHash, userProfile.publicKey, hubSdk]);

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
          <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
          <MapFitBounds positions={[pickup, dropoff]} />
          <Marker position={pickup}><Popup>Pickup</Popup></Marker>
          <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>
          <Polyline positions={[pickup, dropoff]} color="var(--accent)" weight={3} opacity={0.8} />
        </MapContainer>
      </div>

      {/* Existing offers */}
      <div style={{ paddingTop: '0.875rem', marginBottom: '0.875rem' }}>
        <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>Offers ({offers.length})</span>
          <button type="button" className="btn-ghost" onClick={fetchOffers} disabled={loadingOffers} style={{ fontSize: '0.75rem' }}>
            {loadingOffers ? '...' : 'Refresh'}
          </button>
        </div>
        {offersError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{offersError}</div>}
        {offers.length === 0 && !loadingOffers && !offersError && (
          <p style={{ fontSize: '0.8rem', color: 'var(--on-surface-variant)', margin: 0 }}>No offers yet.</p>
        )}
        {offers.map((offer) => (
          <div key={offer.txHash} className="offer-row offer-row--driver">
            <div className="offer-row-driver" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div className="offer-avatar" style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-container), var(--primary-dim))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="directions_car" size={20} fill={1} className="text-on-primary-fixed" />
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--on-surface)', margin: 0 }}>{truncAddr(offer.driverAddress)}</p>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--on-surface-variant)', margin: '0.15rem 0 0 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Driver</p>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--on-surface)', margin: 0, fontFamily: 'var(--font-headline)' }}>{offer.fare} CLT</p>
            </div>
          </div>
        ))}
      </div>

      {/* Make offer */}
      <div style={{ paddingTop: '0.875rem' }}>
        <div className="form-row">
          <label className="label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Your offer</label>
          <input
            type="number"
            min={0}
            value={offerFares[req.txHash] !== undefined ? offerFares[req.txHash] : req.fare}
            onChange={(e) => handleFareChange(req.txHash, e.target.value)}
            className="input-field"
            style={{ width: 100, padding: '0.4rem 0.5rem', fontSize: '0.85rem' }}
            disabled={disabled || acceptingTxHash === req.txHash}
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CLT</span>
          <button
            type="button"
            className="btn-primary"
            style={{ marginLeft: 'auto', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            disabled={disabled || !!acceptingTxHash || !userProfile.publicKey}
            onClick={() => handleAcceptOffer(req)}
          >
            {acceptingTxHash === req.txHash ? 'Submitting...' : disabled ? 'Finish trip first' : userProfile.publicKey ? 'Make Offer' : 'Connect wallet'}
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
  const [recentTrips, setRecentTrips] = useState([]);
  const [recentTripsLoading, setRecentTripsLoading] = useState(false);
  const [recentTripsError, setRecentTripsError] = useState(null);
  const [driverTab, setDriverTab] = useState('rides');
  const [myTripsRefreshing, setMyTripsRefreshing] = useState(false);
  const [myTripsRefreshError, setMyTripsRefreshError] = useState(null);

  const { PrivateKeyModal, requestPrivateKey } = usePrivateKeyRequest();

  const hubSdk = useClutchSdk(userProfile.publicKey || undefined, '0x0');

  const hasActiveTrip = activeTrips.length > 0;

  const handleProfileUpdate = useCallback((profile) => setUserProfile(profile), []);

  useEffect(() => {
    if (!userProfile.publicKey) {
      setActiveTrips([]);
      setActiveTripsLoading(false);
      return undefined;
    }
    setActiveTripsLoading(true);
    setActiveTripsError(null);
    const dispose = subscribeActiveTripsCompat(
      hubSdk,
      { driverAddress: userProfile.publicKey },
      {
        onData: (trips) => {
          setActiveTrips(trips);
          setActiveTripsLoading(false);
        },
        onError: (err) => {
          console.error('Active trips subscription error:', err);
          setActiveTripsError(err.message || 'Failed to load active trips');
          setActiveTrips([]);
          setActiveTripsLoading(false);
        },
      }
    );
    return () => dispose();
  }, [userProfile.publicKey, hubSdk]);

  useEffect(() => {
    if (!userProfile.publicKey) {
      setRecentTrips([]);
      setRecentTripsLoading(false);
      return undefined;
    }
    setRecentTripsLoading(true);
    setRecentTripsError(null);
    const dispose = subscribeRecentTripsCompat(
      hubSdk,
      { driverAddress: userProfile.publicKey },
      {
        onData: (trips) => {
          setRecentTrips(trips);
          setRecentTripsLoading(false);
        },
        onError: (err) => {
          console.error('Recent trips subscription error:', err);
          setRecentTripsError(err.message || 'Failed to load recent trips');
          setRecentTrips([]);
          setRecentTripsLoading(false);
        },
      }
    );
    return () => dispose();
  }, [userProfile.publicKey, hubSdk]);

  const fetchRideRequests = useCallback(async () => {
    setIsLoadingRides(true);
    setRidesError(null);
    try {
      const requests = await hubSdk.listRideRequests();
      setRideRequests(requests);
    } catch (err) {
      console.error('Failed to fetch ride requests:', err);
      setRidesError(err.message || 'Failed to load ride requests');
      setRideRequests([]);
    } finally {
      setIsLoadingRides(false);
    }
  }, [hubSdk]);

  useEffect(() => {
    setIsLoadingRides(true);
    setRidesError(null);
    const dispose = subscribeRideRequestsCompat(hubSdk, null, {
      onData: (requests) => {
        setRideRequests(requests);
        setIsLoadingRides(false);
      },
      onError: (err) => {
        console.error('Ride requests subscription error:', err);
        setRidesError(err.message || 'Failed to load ride requests');
        setRideRequests([]);
        setIsLoadingRides(false);
      },
    });
    return () => dispose();
  }, [hubSdk]);

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
      const offerFare = offerFares[req.txHash] !== undefined ? Number(offerFares[req.txHash]) : req.fare;
      const unsignedTx = await hubSdk.createUnsignedRideOffer({ rideRequestTxHash: req.txHash, fare: offerFare });
      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = await requestPrivateKey('Enter your private key to sign the ride offer:');
        if (!privateKey) {
          setAcceptStatus({ type: 'warning', message: 'Signing cancelled.' });
          setAcceptingTxHash(null);
          return;
        }
      }
      const signature = await hubSdk.signTransaction(unsignedTx, privateKey);
      await hubSdk.submitTransaction(signature.rawTransaction);
      setAcceptStatus({ type: 'success', message: 'Offer submitted!' });
      setRefreshBalanceCounter((c) => c + 1);
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
  }, [userProfile, offerFares, requestPrivateKey, hubSdk]);

  const refreshDriverMyTrips = useCallback(async () => {
    if (!userProfile.publicKey) return;
    setMyTripsRefreshing(true);
    setMyTripsRefreshError(null);
    try {
      const trips = await hubSdk.listActiveTrips({ driverAddress: userProfile.publicKey });
      setActiveTrips(trips);
      setActiveTripsError(null);
      setActiveTripsLoading(false);
    } catch (err) {
      console.error('Refresh my trips failed:', err);
      setMyTripsRefreshError(err.message || 'Failed to refresh');
    } finally {
      setMyTripsRefreshing(false);
    }
  }, [userProfile.publicKey, hubSdk]);

  return (
    <div>
      <WalletBar
        role="driver"
        userProfile={userProfile}
        onProfileUpdate={handleProfileUpdate}
        refreshTrigger={refreshBalanceCounter}
        onFaucetSuccess={() => setRefreshBalanceCounter((c) => c + 1)}
      />

      <ExplorerTabs
        tabs={[
          {
            id: 'rides',
            label: 'Rides',
            icon: '📍',
            count: userProfile.publicKey ? (hasActiveTrip ? activeTrips.length : rideRequests.length) : rideRequests.length,
          },
          { id: 'recent', label: 'Recent rides', icon: '✅', count: userProfile.publicKey ? recentTrips.length : 0 },
        ]}
        activeTab={driverTab}
        onTabChange={setDriverTab}
        variant="pill"
      />

      <div
        role="tabpanel"
        id="panel-rides"
        aria-labelledby="tab-rides"
        hidden={driverTab !== 'rides'}
        style={{ display: driverTab === 'rides' ? 'block' : 'none' }}
      >
        {hasActiveTrip && userProfile.publicKey && (
          <div className="status-banner info" style={{ marginBottom: '1rem' }}>
            You have an active trip. Finish it before accepting new ride offers.
          </div>
        )}

        <Section
          title="My trips"
          icon="🚗"
          description={userProfile.publicKey ? 'Rides in progress after a passenger accepts your offer.' : 'Connect your wallet to see your active trips.'}
          action={
            userProfile.publicKey ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={refreshDriverMyTrips}
                disabled={myTripsRefreshing}
                style={{ fontSize: '0.75rem' }}
              >
                {myTripsRefreshing ? '…' : 'Refresh'}
              </button>
            ) : null
          }
        >
          {!userProfile.publicKey ? (
            <EmptyState message="Connect your wallet above to view active trips." />
          ) : (
            <>
              {activeTripsError && <div className="status-banner error">{activeTripsError}</div>}
              {myTripsRefreshError && <div className="status-banner error">{myTripsRefreshError}</div>}

              {activeTrips.length > 0 ? (
                activeTrips.map((trip) => (
                  <ActiveTripCard
                    key={trip.txHash}
                    trip={trip}
                    cancelAction={{
                      userProfile,
                      onSuccess: () => setRefreshBalanceCounter((prev) => prev + 1),
                    }}
                  />
                ))
              ) : !activeTripsLoading && !activeTripsError ? (
                <EmptyState message="No active trips. When a passenger accepts your offer, it appears here. Finished rides are under Recent rides." />
              ) : null}
            </>
          )}
        </Section>

        {!hasActiveTrip && (
          <Section
            title="Available rides"
            icon="📍"
            description="Ride requests from passengers."
            action={
              <button
                type="button"
                className="btn-ghost"
                onClick={fetchRideRequests}
                disabled={isLoadingRides}
                title="Fetch the latest ride requests from the hub (same as live subscription)"
                style={{ fontSize: '0.75rem' }}
              >
                {isLoadingRides ? '…' : 'Refresh list'}
              </button>
            }
          >
            {acceptStatus && <div className={`status-banner ${acceptStatus.type}`}>{acceptStatus.message}</div>}
            {ridesError && <div className="status-banner error">{ridesError}</div>}

            <div
              className="form-row"
              style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}
            >
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {isLoadingRides && rideRequests.length === 0 ? 'Loading ride requests…' : 'Live updates + manual refresh'}
              </span>
              <button
                type="button"
                className="btn-secondary"
                onClick={fetchRideRequests}
                disabled={isLoadingRides}
                style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
              >
                {isLoadingRides ? 'Refreshing…' : 'Refresh available rides'}
              </button>
            </div>

            {rideRequests.length === 0 && !isLoadingRides && (
              <EmptyState
                message={
                  ridesError
                    ? 'Could not load the list. Use refresh to try again, or wait for the live connection to recover.'
                    : 'No ride requests yet. When passengers request rides, they will appear here.'
                }
                action="Refresh available rides"
                onAction={fetchRideRequests}
                actionDisabled={isLoadingRides}
              />
            )}

            {rideRequests.map((req) => (
              <RideRequestCard
                key={req.txHash}
                req={req}
                userProfile={userProfile}
                hubSdk={hubSdk}
                offerFares={offerFares}
                handleFareChange={handleFareChange}
                handleAcceptOffer={handleAcceptOffer}
                acceptingTxHash={acceptingTxHash}
                disabled={hasActiveTrip}
              />
            ))}
          </Section>
        )}
      </div>

      <div
        role="tabpanel"
        id="panel-recent"
        aria-labelledby="tab-recent"
        hidden={driverTab !== 'recent'}
        style={{ display: driverTab === 'recent' ? 'block' : 'none' }}
      >
        <Section
          title="Recent rides"
          icon="✅"
          description={userProfile.publicKey ? 'Finished rides: fully paid or cancelled (not in progress).' : 'Connect your wallet to see your ride history.'}
        >
          {!userProfile.publicKey ? (
            <EmptyState message="Connect your wallet above to view recent rides." />
          ) : (
            <>
              {recentTripsError && <div className="status-banner error">{recentTripsError}</div>}
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>
                Includes completed trips and cancelled rides. Active trips stay under My Trips.
              </p>
              {recentTrips.length > 0 ? (
                recentTrips.map((trip) => <CompletedTripCard key={trip.txHash} trip={trip} />)
              ) : !recentTripsLoading && !recentTripsError ? (
                <EmptyState message="No recent rides yet. When you finish paying or cancel a trip, it will appear here." />
              ) : null}
            </>
          )}
        </Section>
      </div>

      {userProfile.publicKey && (
        <Section title="Transaction history" icon="📋" collapsible defaultExpanded={false}>
          <TransactionHistory userPublicKey={userProfile.publicKey} refreshTrigger={refreshBalanceCounter} contentOnly />
        </Section>
      )}
      <PrivateKeyModal />
    </div>
  );
};

export default DriverView;
