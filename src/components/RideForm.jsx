import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

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
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);

  const handleReset = () => {
    setPickup(null);
    setDropoff(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pickup && dropoff) {
      alert(`Requesting ride from ${pickup.lat},${pickup.lng} to ${dropoff.lat},${dropoff.lng}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ textAlign: 'center' }}>
      <MapContainer center={[0, 0]} zoom={2} style={{ height: '400px', width: '100%' }}>
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
      <div style={{ marginTop: '1rem' }}>
        <button type="button" onClick={handleReset} style={{ marginRight: '1rem' }}>
          Reset
        </button>
        <button type="submit" disabled={!(pickup && dropoff)}>
          Request Ride
        </button>
      </div>
    </form>
  );
};

export default RideForm; 