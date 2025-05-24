import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';
import { ClutchHubSdk } from 'clutch-hub-sdk-js';
import { API_URL } from '../config';

// Fix Leaflet's default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
});

const LocationSelector = ({ pickup, dropoff, setPickup, setDropoff }) => {
  useMapEvents({
    click(e) {
      if (!pickup) setPickup(e.latlng);
      else if (!dropoff) setDropoff(e.latlng);
    },
  });
  return null;
};

const RideForm = () => {
  const [publicKey, setPublicKey] = useState('');
  const [fare, setFare] = useState(1000);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const sdk = new ClutchHubSdk(API_URL, publicKey);

  const handleReset = () => {
    setPickup(null);
    setDropoff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pickup && dropoff && publicKey) {
      try {
        const unsignedTx = await sdk.createUnsignedRideRequest({ pickup, dropoff, fare: Number(fare) });
        console.log('Unsigned transaction:', unsignedTx);
        // Prompt for private key
        const privateKey = window.prompt('Enter your private key to sign the transaction:');
        if (!privateKey) {
          alert('Signing cancelled.');
          return;
        }
        // Directly sign the JSON object
        const signature = await sdk.signTransaction(unsignedTx, privateKey);
        console.log('Signature:', signature);
      } catch (err) {
        console.error(err);
        alert('Failed to fetch unsigned transaction');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Public Key"
          value={publicKey}
          onChange={e => setPublicKey(e.target.value)}
          style={{ width: 340, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          required
        />
        <input
          type="number"
          placeholder="Fare"
          value={fare}
          onChange={e => setFare(e.target.value)}
          style={{ width: 120, padding: 8, borderRadius: 4, border: '1px solid #ccc' }}
          min={0}
          required
        />
      </div>
      <p style={{ textAlign: 'center', marginBottom: '0.5rem', fontWeight: '500' }}>
        Click on the map to select Pickup and Dropoff locations
      </p>
      <div style={{
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: '1rem',
      }}>
        <MapContainer center={[27.1883, 56.3772]} zoom={12} style={{ height: '400px', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <LocationSelector
            pickup={pickup}
            dropoff={dropoff}
            setPickup={setPickup}
            setDropoff={setDropoff}
          />
          {pickup && (
            <Marker position={pickup}>
              <Popup>Pickup</Popup>
            </Marker>
          )}
          {dropoff && (
            <Marker position={dropoff}>
              <Popup>Dropoff</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button
          type="button"
          onClick={handleReset}
          style={{
            backgroundColor: '#f0f0f0',
            color: '#333333',
            border: '1px solid #cccccc',
            padding: '0.5rem 1rem',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={!(pickup && dropoff && publicKey)}
          style={{
            backgroundColor: '#646cff',
            color: '#ffffff',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: 4,
            cursor: 'pointer',
            opacity: pickup && dropoff ? 1 : 0.6,
          }}
        >
          Request Ride
        </button>
      </div>
    </form>
  );
};

export default RideForm; 