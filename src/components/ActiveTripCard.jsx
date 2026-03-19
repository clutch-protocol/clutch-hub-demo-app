import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import MapFitBounds from './MapFitBounds';

const ActiveTripCard = ({ trip }) => {
  const pickup = [trip.pickupLocation.latitude, trip.pickupLocation.longitude];
  const dropoff = [trip.dropoffLocation.latitude, trip.dropoffLocation.longitude];

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 className="card-title" style={{ margin: 0 }}>Active trip</h3>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          {trip.fare} CLT
        </div>
      </div>

      <div className="map-wrapper" style={{ marginBottom: '1rem' }}>
        <MapContainer center={pickup} zoom={13} style={{ height: '220px', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapFitBounds positions={[pickup, dropoff]} />
          <Marker position={pickup}><Popup>Pickup</Popup></Marker>
          <Marker position={dropoff}><Popup>Dropoff</Popup></Marker>
          <Polyline positions={[pickup, dropoff]} color="#0ea5e9" weight={3} opacity={0.8} />
        </MapContainer>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>
        <div><strong>Driver:</strong> {trip.driverAddress}</div>
        <div><strong>Passenger:</strong> {trip.passengerAddress}</div>
        <div><strong>Acceptance Tx:</strong> {trip.txHash}</div>
        <div><strong>Offer Tx:</strong> {trip.rideOfferTxHash}</div>
      </div>
    </div>
  );
};

export default ActiveTripCard;
