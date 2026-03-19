import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';
import ActiveTripCard from './ActiveTripCard';
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

  const fetchRideRequests = useCallback(async () => {
    setRidesLoading(true);
    setRidesError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, '0x0');
      const requests = await sdk.listRideRequests();
      setRideRequests(requests);
    } catch (err) {
      console.error('Failed to fetch ride requests:', err);
      setRidesError(err.message || 'Failed to load ride requests');
      setRideRequests([]);
    } finally {
      setRidesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRideRequests();
    const interval = setInterval(fetchRideRequests, 3000);
    return () => clearInterval(interval);
  }, [fetchRideRequests]);

  const fetchActiveTrips = useCallback(async () => {
    setActiveTripsLoading(true);
    setActiveTripsError(null);
    try {
      const sdk = new ClutchHubSdk(API_URL, '0x0');
      const trips = await sdk.listActiveTrips();
      setActiveTrips(trips);
    } catch (err) {
      console.error('Failed to fetch active trips:', err);
      setActiveTripsError(err.message || 'Failed to load active trips');
      setActiveTrips([]);
    } finally {
      setActiveTripsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveTrips();
    const interval = setInterval(fetchActiveTrips, 3000);
    return () => clearInterval(interval);
  }, [fetchActiveTrips]);

  const fetchOffers = useCallback(async (txHash) => {
    if (!txHash) return;
    setOffersLoading(true);
    try {
      const sdk = new ClutchHubSdk(API_URL, '0x0');
      const list = await sdk.listRideOffers(txHash);
      setOffers(list);
    } catch (err) {
      console.error('Failed to fetch offers:', err);
      setOffers([]);
    } finally {
      setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedTxHash) {
      fetchOffers(selectedTxHash);
      const interval = setInterval(() => fetchOffers(selectedTxHash), 5000);
      return () => clearInterval(interval);
    } else {
      setOffers([]);
    }
  }, [selectedTxHash, fetchOffers]);

  const selectedRequest = rideRequests.find((r) => r.txHash === selectedTxHash);

  return (
    <div className="network-view">
      <Section
        title="Network status"
        description="Clutch Hub API health. No wallet required to explore."
      >
        <div className="card">
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Checking…</div>}
          {error && <div className="status-banner error">{error}</div>}
          {health && !loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: health.status === 'healthy' ? 'var(--success)' : 'var(--error)',
                  }}
                />
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Hub API: {health.status || 'unknown'}</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Service: {health.service || 'clutch-hub-api'}</div>
              {health.timestamp && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last check: {new Date(health.timestamp).toLocaleString()}</div>
              )}
            </div>
          )}
        </div>
      </Section>

      <ExplorerTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === 'requests' && (
        <Section
          title="Active ride requests"
          description="Browse requests on the map. Click a pickup marker to see dropoff, route, and offers."
          badge={rideRequests.length > 0 ? `${rideRequests.length}` : null}
          action={
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={fetchRideRequests} disabled={ridesLoading}>
              {ridesLoading ? 'Loading…' : 'Refresh'}
            </button>
          }
        >
          {ridesError && <div className="status-banner error" style={{ marginBottom: '1rem' }}>{ridesError}</div>}
          {rideRequests.length === 0 && !ridesLoading && !ridesError && (
            <EmptyState message="No active ride requests on the network." icon="📍" />
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
                        <div style={{ maxWidth: 280 }}>
                          <strong>Pickup</strong><br />
                          Fare: {req.fare} CLT<br />
                          Dropoff: {req.dropoffLocation.latitude.toFixed(4)}, {req.dropoffLocation.longitude.toFixed(4)}<br />
                          <strong>Passenger:</strong>
                          <div style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{req.passengerAddress}</div>
                          <strong>Request Tx:</strong>
                          <div style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{req.txHash}</div>
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
                        color="#0ea5e9"
                        weight={3}
                        opacity={0.8}
                      />
                      <Marker position={[selectedRequest.dropoffLocation.latitude, selectedRequest.dropoffLocation.longitude]}>
                        <Popup>
                          <div style={{ maxWidth: 280 }}>
                            <strong>Dropoff</strong><br />
                            Fare: {selectedRequest.fare} CLT<br />
                            <strong>Passenger:</strong>
                            <div style={{ wordBreak: 'break-all', fontSize: '0.75rem' }}>{selectedRequest.passengerAddress}</div>
                          </div>
                        </Popup>
                      </Marker>
                    </>
                  )}
                </MapContainer>
              </div>
              {selectedRequest && (
                <div className="card" style={{ marginTop: '1rem' }}>
                  <h3 style={{ fontSize: '0.875rem', margin: '0 0 0.75rem 0', color: 'var(--text-secondary)' }}>
                    Offers for this request ({offers.length})
                  </h3>
                  {offersLoading ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading offers…</div>
                  ) : offers.length === 0 ? (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No offers yet.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {offers.map((offer) => (
                        <div key={offer.txHash} style={{ padding: '0.75rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{offer.fare} CLT</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>Driver: {offer.driverAddress}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>Offer Tx: {offer.txHash}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </Section>
      )}

      {activeTab === 'trips' && (
        <Section
          title="All active trips"
          description="Trips in progress across the network. Ride accepted, awaiting completion."
          badge={activeTrips.length > 0 ? `${activeTrips.length}` : null}
          action={
            <button type="button" className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={fetchActiveTrips} disabled={activeTripsLoading}>
              {activeTripsLoading ? 'Loading…' : 'Refresh'}
            </button>
          }
        >
          {activeTripsError && <div className="status-banner error" style={{ marginBottom: '1rem' }}>{activeTripsError}</div>}
          {activeTrips.length === 0 && !activeTripsLoading && !activeTripsError && (
            <EmptyState message="No active trips on the network." icon="🚗" />
          )}
          {activeTrips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeTrips.map((trip) => <ActiveTripCard key={trip.txHash} trip={trip} />)}
            </div>
          )}
        </Section>
      )}

      {activeTab === 'about' && (
        <Section title="About Clutch" description="Decentralized ride-sharing on a custom blockchain.">
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Node</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Blockchain core with Aura consensus. Validates and broadcasts transactions.
              </div>
              <a href="https://github.com/clutchprotocol/clutch-node" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                github.com/clutchprotocol/clutch-node
              </a>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Hub API</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Bridge between apps and the node. GraphQL and REST endpoints.
              </div>
              <a href="https://github.com/clutchprotocol/clutch-hub-api" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                github.com/clutchprotocol/clutch-hub-api
              </a>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Hub SDK (JS)</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Client-side transaction signing and encoding for ride requests, offers, and acceptances.
              </div>
              <a href="https://github.com/clutchprotocol/clutch-hub-sdk-js" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                github.com/clutchprotocol/clutch-hub-sdk-js
              </a>
            </div>
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Hub Demo App</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                This demo application. Passenger, driver, and explorer views.
              </div>
              <a href="https://github.com/clutchprotocol/clutch-hub-demo-app" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem' }}>
                github.com/clutchprotocol/clutch-hub-demo-app
              </a>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
};

export default NetworkView;
