import React, { useState } from 'react';

const RideForm = () => {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Requesting ride from ${pickup} to ${dropoff}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Pickup Location:</label>
        <input
          type="text"
          value={pickup}
          onChange={(e) => setPickup(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Dropoff Location:</label>
        <input
          type="text"
          value={dropoff}
          onChange={(e) => setDropoff(e.target.value)}
          required
        />
      </div>
      <button type="submit">Request Ride</button>
    </form>
  );
};

export default RideForm; 