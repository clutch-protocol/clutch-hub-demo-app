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
  const sdk = new ClutchHubSdk(API_URL);
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);

  const handleReset = () => {
    setPickup(null);
    setDropoff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (pickup && dropoff) {
      try {
        // TODO: adjust fare as needed      
        const unsignedTx = await sdk.createUnsignedRideRequest({ pickup, dropoff, fare: 1000 });
        console.log('Unsigned transaction:', unsignedTx);
        //alert(`Unsigned transaction:\n${JSON.stringify(unsignedTx, null, 2)}`);
      } catch (err) {
        console.error(err);
        //alert('Failed to fetch unsigned transaction');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
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
          disabled={!(pickup && dropoff)}
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