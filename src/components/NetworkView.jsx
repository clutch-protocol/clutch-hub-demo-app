import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
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
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [ridesLoading, setRidesLoading] = useState(false);
  const [ridesError, setRidesError] = useState(null);
  const [selectedTxHash, setSelectedTxHash] = useState(null);

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

  return (
    <div>
      <div className="card">
        <h3 className="card-title">Network status</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          View the Clutch blockchain network state. No wallet required.
        </p>

        {loading && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Checking…</div>
        )}
        {error && (
          <div className="status-banner error">{error}</div>
        )}
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
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Hub API: {health.status || 'unknown'}
              </span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Service: {health.service || 'clutch-hub-api'}
            </div>
            {health.timestamp && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Last check: {new Date(health.timestamp).toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Platform overview</h3>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Node</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Blockchain core with Aura consensus. Validates and broadcasts transactions.
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch Hub API</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Bridge between apps and the node. GraphQL and REST endpoints.
            </div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Clutch SDK</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Client-side transaction signing and encoding for ride requests and more.
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Active ride requests (map view)</h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          All ride requests currently awaiting a driver. Click a pickup marker to show dropoff and route. No wallet required.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {rideRequests.length} ride request{rideRequests.length !== 1 ? 's' : ''} active
          </span>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchRideRequests}
            disabled={ridesLoading}
          >
            {ridesLoading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
        {ridesError && (
          <div className="status-banner error" style={{ marginBottom: '1rem' }}>
            {ridesError}
          </div>
        )}
        {rideRequests.length > 0 ? (
          <div className="map-wrapper">
            <MapContainer
              center={DEFAULT_CENTER}
              zoom={DEFAULT_ZOOM}
              style={{ height: '320px', width: '100%' }}
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
                    Dropoff: {req.dropoffLocation.latitude.toFixed(4)}, {req.dropoffLocation.longitude.toFixed(4)}
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
        ) : (
          !ridesLoading &&
          !ridesError && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No active ride requests on the network.
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default NetworkView;
