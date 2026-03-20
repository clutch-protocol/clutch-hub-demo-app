import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
import CompletedTripCard from './CompletedTripCard';
import ExplorerTabs from './ExplorerTabs';
import { Section, EmptyState } from './layout';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

const DEFAULT_CENTER = [27.1883, 56.3772];
const DEFAULT_ZOOM = 12;

function truncAddr(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const GitHubIcon = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

const NetworkView = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [ridesError, setRidesError] = useState(null);
  const [selectedTxHash, setSelectedTxHash] = useState(null);
  const [offers, setOffers] = useState([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [activeTrips, setActiveTrips] = useState([]);
  const [activeTripsLoading, setActiveTripsLoading] = useState(false);
  const [activeTripsError, setActiveTripsError] = useState(null);
  const [completedTrips, setCompletedTrips] = useState([]);
  const [completedTripsLoading, setCompletedTripsLoading] = useState(false);
  const [completedTripsError, setCompletedTripsError] = useState(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL.replace(/\/$/, '')}/health`);
        const data = await res.json();
        setHealth(data);
      } catch (err) {
        setError(err.message || 'Failed to reach API');
        setHealth(null);
      } finally {
        setLoading(false);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setRidesLoading(true);
    setRidesError(null);
    const sdk = new ClutchHubSdk(API_URL, '0x0');
    const dispose = sdk.subscribeRideRequests(null, {
      onData: (requests) => {
        setRideRequests(requests);
        setRidesLoading(false);
      },
      onError: (err) => {
        console.error('Ride requests subscription error:', err);
        setRidesError(err.message || 'Failed to load ride requests');
        setRideRequests([]);
        setRidesLoading(false);
      },
    });
    return () => dispose();
  }, []);

  useEffect(() => {
    setActiveTripsLoading(true);
    setActiveTripsError(null);
    const sdk = new ClutchHubSdk(API_URL, '0x0');
    const dispose = sdk.subscribeActiveTrips(undefined, {
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
    });
    return () => dispose();
  }, []);

  useEffect(() => {
    setCompletedTripsLoading(true);
    setCompletedTripsError(null);
    const sdk = new ClutchHubSdk(API_URL, '0x0');
    const dispose = sdk.subscribeCompletedTrips(undefined, {
      onData: (trips) => {
        setCompletedTrips(trips);
        setCompletedTripsLoading(false);
      },
      onError: (err) => {
        console.error('Completed trips subscription error:', err);
        setCompletedTripsError(err.message || 'Failed to load completed trips');
        setCompletedTrips([]);
        setCompletedTripsLoading(false);
      },
    });
    return () => dispose();
  }, []);

  useEffect(() => {
    if (!selectedTxHash) {
      setOffers([]);
      setOffersLoading(false);
      return undefined;
    }
    setOffersLoading(true);
    const sdk = new ClutchHubSdk(API_URL, '0x0');
    const dispose = sdk.subscribeRideOffers(selectedTxHash, {
      onData: (list) => {
        setOffers(list);
        setOffersLoading(false);
      },
      onError: (err) => {
        console.error('Offers subscription error:', err);
        setOffers([]);
        setOffersLoading(false);
      },
    });
    return () => dispose();
  }, [selectedTxHash]);

  const selectedRequest = rideRequests.find((r) => r.txHash === selectedTxHash);

  const apiOk = health?.status === 'healthy';

  return (
    <div>
      {/* Compact network status + metrics */}
      <div className="form-row" style={{ marginBottom: '1.5rem', gap: '0.75rem', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 500 }}>
          {loading ? (
            <span className="status-dot" />
          ) : error ? (
            <span className="status-dot status-dot--error" />
          ) : (
            <span className={`status-dot ${apiOk ? 'status-dot--live' : 'status-dot--error'}`} />
          )}
          <span style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}>
            {loading ? 'Checking...' : error ? 'API Offline' : apiOk ? 'API Online' : 'API Unknown'}
          </span>
        </span>
      </div>

      <div className="metrics-bar">
        <button
          type="button"
          className={`metric-card metric-card--clickable ${activeTab === 'requests' ? 'metric-card--active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          <div className="metric-value">{rideRequests.length}</div>
          <div className="metric-label">Requests</div>
        </button>
        <button
          type="button"
          className={`metric-card metric-card--clickable ${activeTab === 'trips' ? 'metric-card--active' : ''}`}
          onClick={() => setActiveTab('trips')}
        >
          <div className="metric-value">{activeTrips.length}</div>
          <div className="metric-label">Active Trips</div>
        </button>
        <button
          type="button"
          className={`metric-card metric-card--clickable ${activeTab === 'completed' ? 'metric-card--active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          <div className="metric-value">{completedTrips.length}</div>
          <div className="metric-label">Completed</div>
        </button>
        <div className="metric-card">
          <div className="metric-value">{apiOk ? 'Online' : '--'}</div>
          <div className="metric-label">Hub API</div>
        </div>
      </div>

      <ExplorerTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'requests' && (
        <>
          {ridesError && <div className="status-banner error">{ridesError}</div>}

          {rideRequests.length === 0 && !ridesLoading && !ridesError && (
            <EmptyState message="No active ride requests on the network." />
          )}

          {rideRequests.length > 0 && (
            <>
              <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
                <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} style={{ height: '320px', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  <MapFitBounds
                    positions={
                      selectedTxHash && selectedRequest
                        ? [
                            [selectedRequest.pickupLocation.latitude, selectedRequest.pickupLocation.longitude],
                            [selectedRequest.dropoffLocation.latitude, selectedRequest.dropoffLocation.longitude],
                          ]
                        : rideRequests.map((r) => [r.pickupLocation.latitude, r.pickupLocation.longitude])
                    }
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
                        <div style={{ maxWidth: 240, fontSize: '0.8rem', lineHeight: 1.6 }}>
                          <strong>Pickup</strong> &mdash; {req.fare} CLT<br />
                          Dropoff: {req.dropoffLocation.latitude.toFixed(4)}, {req.dropoffLocation.longitude.toFixed(4)}<br />
                          Passenger: {truncAddr(req.passengerAddress)}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                  {selectedTxHash && selectedRequest && (
                    <>
                      <Polyline
                        positions={[
                          [selectedRequest.pickupLocation.latitude, selectedRequest.pickupLocation.longitude],
                          [selectedRequest.dropoffLocation.latitude, selectedRequest.dropoffLocation.longitude],
                        ]}
                        color="var(--accent)"
                        weight={3}
                        opacity={0.8}
                      />
                      <Marker position={[selectedRequest.dropoffLocation.latitude, selectedRequest.dropoffLocation.longitude]}>
                        <Popup>
                          <div style={{ maxWidth: 240, fontSize: '0.8rem' }}>
                            <strong>Dropoff</strong> &mdash; {selectedRequest.fare} CLT
                          </div>
                        </Popup>
                      </Marker>
                    </>
                  )}
                </MapContainer>
              </div>

              {selectedRequest && (
                <div className="card">
                  <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Offers ({offers.length})
                    </span>
                    <span className="fare-badge">{selectedRequest.fare} CLT</span>
                  </div>
                  {offersLoading ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Loading...</p>
                  ) : offers.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>No offers yet.</p>
                  ) : (
                    offers.map((offer) => (
                      <div key={offer.txHash} className="offer-row">
                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{offer.fare} CLT</span>
                        <span className="truncate-address" title={offer.driverAddress}>{truncAddr(offer.driverAddress)}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'trips' && (
        <>
          {activeTripsError && <div className="status-banner error">{activeTripsError}</div>}

          {activeTrips.length === 0 && !activeTripsLoading && !activeTripsError && (
            <EmptyState message="No active trips on the network." />
          )}

          {activeTrips.map((trip) => <ActiveTripCard key={trip.txHash} trip={trip} />)}
        </>
      )}

      {activeTab === 'completed' && (
        <>
          {completedTripsError && <div className="status-banner error">{completedTripsError}</div>}

          {completedTrips.length === 0 && !completedTripsLoading && !completedTripsError && (
            <EmptyState message="No completed trips on the network yet. Trips appear here after the passenger pays the full fare." />
          )}

          {completedTrips.map((trip) => (
            <CompletedTripCard key={trip.txHash} trip={trip} />
          ))}
        </>
      )}

      {activeTab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { name: 'Clutch Node', desc: 'Blockchain core with Aura consensus.', url: 'https://github.com/clutchprotocol/clutch-node' },
            { name: 'Clutch Hub API', desc: 'Bridge between apps and the node. GraphQL and REST.', url: 'https://github.com/clutchprotocol/clutch-hub-api' },
            { name: 'Clutch Hub SDK (JS)', desc: 'Client-side transaction signing and encoding.', url: 'https://github.com/clutchprotocol/clutch-hub-sdk-js' },
            { name: 'Demo App', desc: 'This demo application -- passenger, driver, and explorer views.', url: 'https://github.com/clutchprotocol/clutch-hub-demo-app' },
          ].map((project) => (
            <div key={project.name} className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{project.name}</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0' }}>{project.desc}</p>
              <a href={project.url} target="_blank" rel="noopener noreferrer" className="github-link">
                <GitHubIcon />
                {project.url.replace('https://github.com/', '')}
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworkView;
