import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';

function truncAddr(addr) {
  if (!addr || addr.length < 12) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function CopyableAddress({ address }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };
  return (
    <span
      className="truncate-address"
      onClick={handleCopy}
      title={address}
      style={{ cursor: 'pointer' }}
    >
      {copied ? 'Copied!' : truncAddr(address)}
    </span>
  );
}

/** Read-only card for trips where the full fare has been paid. */
const CompletedTripCard = ({ trip }) => {
  const farePaid = trip.farePaid ?? trip.fare_paid ?? trip.fare;
  const totalFare = trip.fare;

  const pickup = [trip.pickupLocation.latitude, trip.pickupLocation.longitude];
  const dropoff = [trip.dropoffLocation.latitude, trip.dropoffLocation.longitude];

  return (
    <div className="card active-trip-card completed-trip-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span className="trip-status">
          <span className="status-dot status-dot--done" />
          Completed
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
          <span className="fare-badge">{totalFare} CLT paid</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {farePaid} CLT settled
          </span>
        </div>
      </div>

      <div
        style={{
          height: 6,
          borderRadius: 4,
          background: 'var(--bg-surface)',
          marginBottom: '0.875rem',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            background: 'var(--success)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
        <MapContainer center={pickup} zoom={13} style={{ height: '160px', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapFitBounds positions={[pickup, dropoff]} />
          <Marker position={pickup}><Popup>Pickup</Popup></Marker>
          <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>
          <Polyline positions={[pickup, dropoff]} color="var(--success)" weight={3} opacity={0.75} />
        </MapContainer>
      </div>

      <div className="trip-details-grid">
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
          <div>Driver: <CopyableAddress address={trip.driverAddress} /></div>
          <div>Passenger: <CopyableAddress address={trip.passengerAddress} /></div>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right', lineHeight: 1.8 }}>
          <div title={trip.txHash}>Acceptance: <CopyableAddress address={trip.txHash} /></div>
          <div title={trip.rideOfferTxHash}>Offer: <CopyableAddress address={trip.rideOfferTxHash} /></div>
        </div>
      </div>
    </div>
  );
};

export default CompletedTripCard;
