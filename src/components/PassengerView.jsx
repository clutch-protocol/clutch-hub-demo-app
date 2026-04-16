import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
import CompletedTripCard from './CompletedTripCard';
import { Section, EmptyState } from './layout';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL, MAP_TILE_URL, MAP_ATTRIBUTION } from '../config';
import { useClutchSdk } from '../hooks/useClutchSdk';
import { truncAddr } from '../utils/address';
import {
  subscribeActiveTripsCompat,
  subscribeRecentTripsCompat,
  subscribeRideOffersCompat,
  subscribeRideRequestsCompat,
} from '../sdkRealtime';
import TransactionHistory from './TransactionHistory';
import { usePrivateKeyRequest } from './layout/usePrivateKeyRequest.jsx';
import { pickupIcon, dropoffIcon, currentLocationIcon } from '../utils/mapMarkers';
import MapLegend from './MapLegend';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

/** Map open ride requests to card rows for the signed-in passenger (shared by subscription + manual refresh). */
function formatPassengerOpenRequests(allRequests, publicKey) {
  if (!publicKey) return [];
  const myRequests = allRequests.filter((r) => r.passengerAddress === publicKey);
  const stored = localStorage.getItem(`clutch_tx_${publicKey}`);
  let txMap = {};
  if (stored) {
    try {
      JSON.parse(stored).forEach((tx) => {
        if (tx.txHash) txMap[tx.txHash] = tx;
      });
    } catch {
      /* ignore */
    }
  }
  const formatted = myRequests.map((r) => {
    const pickupLat = Number(r.pickupLocation?.latitude);
    const pickupLng = Number(r.pickupLocation?.longitude);
    const dropoffLat = Number(r.dropoffLocation?.latitude);
    const dropoffLng = Number(r.dropoffLocation?.longitude);
    const localTx = txMap[r.txHash];
    return {
      type: 'Ride Request',
      timestamp: localTx?.timestamp ?? Date.now(),
      pickup: { lat: pickupLat, lng: pickupLng },
      dropoff: { lat: dropoffLat, lng: dropoffLng },
      fare: r.fare,
      txHash: r.txHash,
      passengerAddress: r.passengerAddress,
    };
  });
  return formatted
    .filter((r) => Number.isFinite(r.pickup.lat) && Number.isFinite(r.pickup.lng) && Number.isFinite(r.dropoff.lat) && Number.isFinite(r.dropoff.lng))
    .sort((a, b) => b.timestamp - a.timestamp);
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

const MapCenterTracker = ({ onCenterChange }) => {
  const map = useMap();
  useEffect(() => {
    const c = map.getCenter();
    onCenterChange?.({ lat: Number(c.lat), lng: Number(c.lng) });
  }, [map, onCenterChange]);
  useMapEvents({
    moveend(e) {
      const c = e.target.getCenter();
      onCenterChange?.({ lat: Number(c.lat), lng: Number(c.lng) });
    },
  });
  return null;
};

const MapFlyToLocation = ({ location }) => {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    const lat = Number(location.lat);
    const lng = Number(location.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const container = map.getContainer?.();
    const isVisible = !!container && container.offsetWidth > 0 && container.offsetHeight > 0;
    if (!isVisible) return;
    const zoom = Number(map.getZoom());
    const safeZoom = Number.isFinite(zoom) ? Math.max(zoom, 14) : 14;
    try {
      map.flyTo([lat, lng], safeZoom, { duration: 0.7 });
    } catch (err) {
      // Hidden/inactive maps can still throw inside Leaflet animations; ignore safely.
      console.warn('Skipped map flyTo due to invalid map state:', err);
    }
  }, [location, map]);

  return null;
};

const RideRequestCard = ({
  req,
  userProfile,
  hubSdk,
  onAcceptSuccess,
  onCancelSuccess,
  requestPrivateKey,
}) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [acceptingOfferTxHash, setAcceptingOfferTxHash] = useState(null);
  const [acceptError, setAcceptError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const fetchOffers = useCallback(async () => {
    if (!userProfile.publicKey || !req.txHash) return;
    setLoading(true);
    setError(null);
    try {
      const sdk = hubSdk ?? new ClutchHubSdk(API_URL, userProfile.publicKey);
      const fetchedOffers = await sdk.listRideOffers(req.txHash);
      setOffers(fetchedOffers);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
      setError(err.message || 'Failed to load offers');
    } finally {
      setLoading(false);
    }
  }, [req.txHash, userProfile.publicKey, hubSdk]);

  useEffect(() => {
    if (!userProfile.publicKey || !req.txHash) return undefined;
    setLoading(true);
    setError(null);
    const sdk = hubSdk ?? new ClutchHubSdk(API_URL, userProfile.publicKey);
    const dispose = subscribeRideOffersCompat(sdk, req.txHash, {
      onData: (list) => {
        setOffers(list);
        setLoading(false);
      },
      onError: (err) => {
        console.error('Offers subscription error:', err);
        setError(err.message || 'Failed to load offers');
        setLoading(false);
      },
    });
    return () => dispose();
  }, [req.txHash, userProfile.publicKey, hubSdk]);

  const handleAcceptOffer = useCallback(async (offer) => {
    if (!userProfile.publicKey || !offer.txHash) return;
    setAcceptingOfferTxHash(offer.txHash);
    setAcceptError(null);
    try {
      const sdk = hubSdk ?? new ClutchHubSdk(API_URL, userProfile.publicKey);
      const unsignedTx = await sdk.createUnsignedRideAcceptance({ rideOfferTxHash: offer.txHash });
      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = await requestPrivateKey('Enter your private key to sign the acceptance:');
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
  }, [userProfile, onAcceptSuccess, requestPrivateKey, hubSdk]);

  const handleCancelRequest = useCallback(async () => {
    if (!userProfile.publicKey || !req.txHash) return;
    setCancelling(true);
    setCancelError(null);
    try {
      const sdk = hubSdk ?? new ClutchHubSdk(API_URL, userProfile.publicKey);
      const unsignedTx = await sdk.createUnsignedRideRequestCancel({ rideRequestTxHash: req.txHash });
      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = await requestPrivateKey('Enter your private key to sign the cancellation:');
        if (!privateKey) {
          setCancelError('Signing cancelled.');
          setCancelling(false);
          return;
        }
      }
      const signature = await sdk.signTransaction(unsignedTx, privateKey);
      await sdk.submitTransaction(signature.rawTransaction);
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Request Cancel',
        timestamp: Date.now(),
        rideRequestTxHash: req.txHash,
        status: 'success',
        txHash: signature.txHash || '',
      });
      onCancelSuccess?.();
    } catch (err) {
      console.error('Cancel request failed:', err);
      setCancelError(err.message || 'Failed to cancel request');
      TransactionHistory.addTransaction(userProfile.publicKey, {
        type: 'Ride Request Cancel',
        timestamp: Date.now(),
        rideRequestTxHash: req.txHash,
        status: 'failed',
        error: err.message,
      });
    } finally {
      setCancelling(false);
    }
  }, [userProfile, req.txHash, onCancelSuccess, requestPrivateKey, hubSdk]);

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(req.timestamp).toLocaleString()}</span>
        <span className="fare-badge">{req.fare} CLT</span>
      </div>

      <div>
        <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.625rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Offers ({offers.length})</span>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="button" className="btn-ghost" onClick={fetchOffers} disabled={loading} style={{ fontSize: '0.75rem' }}>
              {loading ? '...' : 'Refresh'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: '0.75rem' }}
              onClick={handleCancelRequest}
              disabled={cancelling}
            >
              {cancelling ? 'Cancelling...' : 'Cancel request'}
            </button>
          </div>
        </div>

        {error && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{error}</div>}
        {cancelError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{cancelError}</div>}
        {acceptError && <div className="status-banner error" style={{ padding: '0.5rem', fontSize: '0.8rem', marginBottom: '0.5rem' }}>{acceptError}</div>}

        {offers.length === 0 && !loading && !error && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No offers yet.</p>
        )}

        {offers.map((offer) => (
          <div key={offer.txHash} className="offer-row offer-row--driver">
            <div className="offer-row-driver">
              <div className="offer-avatar" aria-hidden>🚗</div>
              <div className="offer-row-driver-meta">
                <p className="offer-row-driver-address">{truncAddr(offer.driverAddress)}</p>
                <p className="offer-row-driver-label">Driver</p>
              </div>
            </div>
            <div className="offer-row-actions">
              <div className="offer-row-price">{offer.fare} CLT</div>
              <button
                type="button"
                className="btn-primary"
                style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', flexShrink: 0, marginTop: '0.35rem' }}
                onClick={() => handleAcceptOffer(offer)}
                disabled={!!acceptingOfferTxHash}
              >
                {acceptingOfferTxHash === offer.txHash ? 'Accepting...' : 'Accept'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PassengerView = ({ userProfile, onProfileUpdate, refreshTrigger, onFaucetSuccess, externalTab }) => {
  const [fare, setFare] = useState('');
  const fareInputRef = useRef(null);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const submittingRef = useRef(false);
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [refreshBalanceCounter, setRefreshBalanceCounter] = useState(0);
  const [previousRequests, setPreviousRequests] = useState([]);
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeTripsLoading, setActiveTripsLoading] = useState(false);
  const [activeTripsError, setActiveTripsError] = useState(null);
  const [recentTrips, setRecentTrips] = useState([]);
  const [recentTripsLoading, setRecentTripsLoading] = useState(false);
  const [recentTripsError, setRecentTripsError] = useState(null);
  const [passengerTab, setPassengerTab] = useState('rides');
  const [myRideRefreshing, setMyRideRefreshing] = useState(false);
  const [myRideRefreshError, setMyRideRefreshError] = useState(null);
  const [myTripsRefreshing, setMyTripsRefreshing] = useState(false);
  const [myTripsRefreshError, setMyTripsRefreshError] = useState(null);
  const defaultMapCenter = [27.1883, 56.3772];
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: defaultMapCenter[0], lng: defaultMapCenter[1] });
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const { PrivateKeyModal, requestPrivateKey } = usePrivateKeyRequest();

  const hubSdk = useClutchSdk(userProfile.publicKey, '0x0');

  const hasConcurrent = activeTrips.length > 0 || previousRequests.length > 0;
  const hasActiveTrip = activeTrips.length > 0;
  const isRouteSelected = !!pickup && !!dropoff;
  const mapActiveTrips = activeTrips.filter((t) => (
    Number.isFinite(Number(t?.pickupLocation?.latitude))
    && Number.isFinite(Number(t?.pickupLocation?.longitude))
    && Number.isFinite(Number(t?.dropoffLocation?.latitude))
    && Number.isFinite(Number(t?.dropoffLocation?.longitude))
  ));
  const firstActiveTrip = mapActiveTrips.length > 0 ? mapActiveTrips[0] : null;
  const activeTripPickup = firstActiveTrip
    ? [firstActiveTrip.pickupLocation.latitude, firstActiveTrip.pickupLocation.longitude]
    : null;
  const activeTripDropoff = firstActiveTrip
    ? [firstActiveTrip.dropoffLocation.latitude, firstActiveTrip.dropoffLocation.longitude]
    : null;

  useEffect(() => {
    if (externalTab) {
      setPassengerTab(externalTab);
    }
  }, [externalTab]);

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
      { passengerAddress: userProfile.publicKey },
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
      { passengerAddress: userProfile.publicKey },
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

  useEffect(() => {
    if (!userProfile.publicKey) {
      setPreviousRequests([]);
      return undefined;
    }
    const dispose = subscribeRideRequestsCompat(hubSdk, null, {
      onData: (allRequests) => {
        setPreviousRequests(formatPassengerOpenRequests(allRequests, userProfile.publicKey));
      },
      onError: (err) => {
        console.error('Ride requests subscription error:', err);
      },
    });
    return () => dispose();
  }, [userProfile.publicKey, hubSdk]);

  const handleReset = useCallback(() => {
    setPickup(null);
    setDropoff(null);
    setFare('');
    setTransactionStatus(null);
  }, []);

  const handleSubmit = useCallback(async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    if (!pickup || !dropoff || !userProfile.publicKey) return;
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsLoading(true);
    try {
      setTransactionStatus({ type: 'info', message: 'Creating transaction...' });
      const unsignedTx = await hubSdk.createUnsignedRideRequest({ pickup, dropoff, fare: Number(fare) });
      setTransactionStatus({ type: 'info', message: 'Signing...' });
      let privateKey = userProfile.privateKey;
      if (!privateKey) {
        privateKey = await requestPrivateKey('Enter your private key to sign the transaction:');
        if (!privateKey) {
          setTransactionStatus({ type: 'warning', message: 'Signing cancelled.' });
          submittingRef.current = false;
          setIsLoading(false);
          return;
        }
      }
      const signature = await hubSdk.signTransaction(unsignedTx, privateKey);
      setTransactionStatus({ type: 'info', message: 'Submitting...' });
      await hubSdk.submitTransaction(signature.rawTransaction);
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
      submittingRef.current = false;
      setIsLoading(false);
    }
  }, [pickup, dropoff, userProfile, fare, hubSdk]);

  const refreshMyRide = useCallback(async () => {
    if (!userProfile.publicKey) return;
    setMyRideRefreshing(true);
    setMyRideRefreshError(null);
    try {
      const [allRequests, trips] = await Promise.all([
        hubSdk.listRideRequests(),
        hubSdk.listActiveTrips({ passengerAddress: userProfile.publicKey }),
      ]);
      setPreviousRequests(formatPassengerOpenRequests(allRequests, userProfile.publicKey));
      setActiveTrips(trips);
      setActiveTripsError(null);
      setActiveTripsLoading(false);
    } catch (err) {
      console.error('Refresh my ride failed:', err);
      setMyRideRefreshError(err.message || 'Failed to refresh');
    } finally {
      setMyRideRefreshing(false);
    }
  }, [userProfile.publicKey, hubSdk]);

  const refreshPassengerMyTrips = useCallback(async () => {
    if (!userProfile.publicKey) return;
    setMyTripsRefreshing(true);
    setMyTripsRefreshError(null);
    try {
      const trips = await hubSdk.listActiveTrips({ passengerAddress: userProfile.publicKey });
      setActiveTrips(trips);
      setActiveTripsError(null);
      setActiveTripsLoading(false);
    } catch (err) {
      console.error('Refresh my trips failed:', err);
      setMyTripsRefreshError(err.message || 'Failed to refresh trips');
    } finally {
      setMyTripsRefreshing(false);
    }
  }, [userProfile.publicKey, hubSdk]);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(next);
        setMapCenter(next);
        if (!hasActiveTrip && !hasConcurrent && !pickup) {
          setPickup(next);
        }
        setLocating(false);
      },
      (err) => {
        setLocationError(err?.message || 'Unable to get your current location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  }, [hasActiveTrip, hasConcurrent, pickup]);

  const handleSetFromCenter = useCallback(() => {
    if (hasConcurrent || hasActiveTrip) return;
    if (!pickup) {
      setPickup(mapCenter);
      return;
    }
    if (!dropoff) {
      setDropoff(mapCenter);
    }
  }, [hasConcurrent, hasActiveTrip, pickup, dropoff, mapCenter]);

  // Once route points are set, move user directly to fare entry.
  useEffect(() => {
    if (!isRouteSelected || hasConcurrent || hasActiveTrip) return;
    fareInputRef.current?.focus();
  }, [isRouteSelected, hasConcurrent, hasActiveTrip]);

  // Try to center the map at the user's location on first render.
  useEffect(() => {
    if (!navigator.geolocation || currentLocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Keep fallback center silently if geolocation fails/denied.
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, [currentLocation]);

  return (
    <div>
      <div
        role="tabpanel"
        id="panel-rides"
        aria-labelledby="tab-rides"
        hidden={passengerTab !== 'rides'}
        style={{ display: passengerTab === 'rides' ? 'block' : 'none' }}
      >
        <Section
          title=" "
          icon={null}
          description={null}
          action={
            userProfile.publicKey ? (
              <button
                type="button"
                className="btn-ghost"
                onClick={refreshMyRide}
                disabled={myRideRefreshing}
                style={{ fontSize: '0.75rem' }}
              >
                {myRideRefreshing ? '…' : 'Refresh'}
              </button>
            ) : null
          }
        >
          {!userProfile.publicKey ? (
            <EmptyState message="Connect your wallet above to request a ride." />
          ) : (
            <>
              <div className="passenger-ride-split"><div className="passenger-ride-mapcol"><div className="map-hero ride-builder-shell">
                <div className="ride-builder-toolbar">
                  {hasActiveTrip ? (
                    <div className="step-pill">
                      Active trip in progress
                    </div>
                  ) : (
                    <div className="step-pill ride-builder-step-pill">
                      Step {!pickup ? 1 : !dropoff ? 2 : !fare ? 3 : 4}:{' '}
                      {!pickup ? 'Pick pickup' : !dropoff ? 'Pick destination' : !fare ? 'Enter fare' : 'Confirm'}
                    </div>
                  )}
                  <div className="ride-builder-toolbar-actions">
                    {!hasActiveTrip && !hasConcurrent && (
                      <>
                        {(!pickup || !dropoff) && (
                          <button
                            type="button"
                            className="btn-secondary ride-builder-set-center-btn"
                            onClick={handleSetFromCenter}
                          >
                            {!pickup ? 'Set pickup' : 'Set drop-off'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn-secondary ride-builder-reset-btn"
                          onClick={handleReset}
                          disabled={isLoading}
                        >
                          Reset
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="btn-secondary ride-builder-location-btn"
                      onClick={handleUseCurrentLocation}
                      disabled={locating}
                    >
                      {locating ? 'Locating…' : 'My location'}
                    </button>
                  </div>
                </div>
                <div
                  className="map-wrapper map-wrapper--ride"
                >
                  <MapLegend style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', zIndex: 700 }} />
                  {!hasActiveTrip && !hasConcurrent && !isRouteSelected && (
                    <div className="map-center-pin" aria-hidden>
                      <div className="map-center-pin-head">+</div>
                      <div className="map-center-pin-stem" />
                    </div>
                  )}
                  <div className="map-gradient-overlay" />
                  <MapContainer
                    center={currentLocation ? [currentLocation.lat, currentLocation.lng] : defaultMapCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} />
                    <MapCenterTracker onCenterChange={setMapCenter} />

                    {previousRequests.map((r) => (
                      !hasActiveTrip && (
                        <React.Fragment key={r.txHash}>
                          <Marker position={[r.pickup.lat, r.pickup.lng]} icon={pickupIcon}><Popup>Pickup (awaiting offers)</Popup></Marker>
                          <Marker position={[r.dropoff.lat, r.dropoff.lng]} icon={dropoffIcon}><Popup>Dropoff (awaiting offers)</Popup></Marker>
                          <Polyline positions={[[r.pickup.lat, r.pickup.lng], [r.dropoff.lat, r.dropoff.lng]]} color="#94a3b8" weight={3} opacity={0.75} />
                        </React.Fragment>
                      )
                    ))}

                    {mapActiveTrips.map((t) => (
                      <React.Fragment key={t.txHash}>
                        <Marker position={[Number(t.pickupLocation.latitude), Number(t.pickupLocation.longitude)]} icon={pickupIcon}><Popup>Pickup (active trip)</Popup></Marker>
                        <Marker position={[Number(t.dropoffLocation.latitude), Number(t.dropoffLocation.longitude)]} icon={dropoffIcon}><Popup>Dropoff (active trip)</Popup></Marker>
                        <Polyline positions={[[Number(t.pickupLocation.latitude), Number(t.pickupLocation.longitude)], [Number(t.dropoffLocation.latitude), Number(t.dropoffLocation.longitude)]]} color="var(--accent)" weight={4} opacity={0.9} />
                      </React.Fragment>
                    ))}

                    {hasActiveTrip && activeTripPickup && activeTripDropoff && (
                      <MapFitBounds positions={[activeTripPickup, activeTripDropoff]} />
                    )}
                    {!hasActiveTrip && pickup && dropoff && (
                      <MapFitBounds positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]} />
                    )}
                    {currentLocation && <MapFlyToLocation location={currentLocation} />}
                    <LocationSelector
                      pickup={pickup}
                      dropoff={dropoff}
                      setPickup={hasConcurrent || isRouteSelected ? () => {} : setPickup}
                      setDropoff={hasConcurrent || isRouteSelected ? () => {} : setDropoff}
                    />
                    {currentLocation && <Marker position={currentLocation} icon={currentLocationIcon}><Popup>Your current location</Popup></Marker>}
                    {!hasActiveTrip && pickup && <Marker position={pickup} icon={pickupIcon}><Popup>Pickup</Popup></Marker>}
                    {!hasActiveTrip && dropoff && <Marker position={dropoff} icon={dropoffIcon}><Popup>Dropoff</Popup></Marker>}
                    {!hasActiveTrip && pickup && dropoff && (
                      <Polyline
                        positions={[[pickup.lat, pickup.lng], [dropoff.lat, dropoff.lng]]}
                        color="var(--accent)"
                        weight={3}
                        opacity={0.8}
                      />
                    )}
                  </MapContainer>
                </div>

                </div></div><div className="passenger-ride-sidecol">
                  {!hasActiveTrip && transactionStatus && (
                    <div className={`status-banner ${transactionStatus.type}`} style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      {transactionStatus.message}
                    </div>
                  )}
                  {!hasActiveTrip && hasConcurrent && (
                    <div className="status-banner info" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      Active request. Complete or cancel it first.
                    </div>
                  )}
                  {activeTripsError && <div className="status-banner error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>{activeTripsError}</div>}
                  {myRideRefreshError && (
                    <div className="status-banner error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      {myRideRefreshError}
                    </div>
                  )}
                  {locationError && (
                    <div className="status-banner error" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      {locationError}
                    </div>
                  )}
                  {hasActiveTrip && (
                    <div className="status-banner info" style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                      Active trip in progress (origin → destination)
                    </div>
                  )}

              {!hasActiveTrip && !hasConcurrent && (
                <div className="card ride-request-card">
                  <div className="card-title">Ride request</div>
                  <div className="ride-request-form-row">
                    <div className="ride-request-fare-col">
                      <label className="label">Fare (CLT)</label>
                      <input
                        ref={fareInputRef}
                        type="number"
                        value={fare}
                        onChange={(e) => setFare(e.target.value)}
                        className="input-field"
                        min={0}
                        placeholder="Enter fare after selecting route"
                        disabled={hasConcurrent || !pickup || !dropoff}
                      />
                    </div>
                    <div className="ride-request-actions">
                      <button
                        type="button"
                        className="btn-primary ride-request-btn"
                        disabled={hasConcurrent || !(pickup && dropoff && fare) || isLoading}
                        onClick={() => handleSubmit()}
                      >
                        {isLoading ? 'Submitting…' : 'Confirm request'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!hasActiveTrip && hasConcurrent && (
                <div className="card wait-offers-card">
                  <div className="wait-offers-title">Waiting for driver offers</div>
                  <p className="wait-offers-text">
                    Your ride request is live. Drivers can now send offers.
                    Stay on this page and review offers below when they arrive.
                  </p>
                  <div className="wait-offers-actions">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={refreshMyRide}
                      disabled={myRideRefreshing}
                    >
                      {myRideRefreshing ? 'Refreshing…' : 'Refresh status'}
                    </button>
                  </div>
                </div>
              )}

              <div className="card">
              <div className="form-row" style={{ justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--on-surface-variant)' }}>My trips</span>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={refreshPassengerMyTrips}
                  disabled={myTripsRefreshing}
                  style={{ fontSize: '0.75rem' }}
                >
                  {myTripsRefreshing ? '…' : 'Refresh'}
                </button>
              </div>
              {myTripsRefreshError && (
                <div className="status-banner error" style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                  {myTripsRefreshError}
                </div>
              )}
              {activeTrips.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  {activeTrips.map((trip) => (
                    <ActiveTripCard
                      key={trip.txHash}
                      trip={trip}
                      passengerPayment={{ userProfile, onSuccess: () => setRefreshBalanceCounter((prev) => prev + 1) }}
                      cancelAction={{ userProfile, onSuccess: () => setRefreshBalanceCounter((prev) => prev + 1) }}
                    />
                  ))}
                </div>
              )}

              {previousRequests.length > 0 && !hasActiveTrip && (
                <div style={{ marginTop: '1rem', paddingTop: activeTrips.length > 0 ? '1rem' : 0 }}>
                  {previousRequests.map((req, idx) => (
                    <RideRequestCard
                      key={req.txHash || idx}
                      req={req}
                      userProfile={userProfile}
                      hubSdk={hubSdk}
                      onAcceptSuccess={() => setRefreshBalanceCounter((prev) => prev + 1)}
                      onCancelSuccess={() => setRefreshBalanceCounter((prev) => prev + 1)}
                      requestPrivateKey={requestPrivateKey}
                    />
                  ))}
                </div>
              )}

              {activeTrips.length === 0 && previousRequests.length === 0 && !activeTripsLoading && !activeTripsError && (
                <EmptyState message="Set your route on the map above, then enter the fare and confirm. Your request will appear here and on the map." />
              )}
              </div></div></div>
            </>
          )}
        </Section>
      </div>

      <div
        role="tabpanel"
        id="panel-recent"
        aria-labelledby="tab-recent"
        hidden={passengerTab !== 'recent'}
        style={{ display: passengerTab === 'recent' ? 'block' : 'none' }}
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
                Includes completed trips and cancelled rides. Active trips stay under My Ride.
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

      <PrivateKeyModal />
    </div>
  );
};

export default PassengerView;
