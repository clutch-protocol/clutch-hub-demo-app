import React from 'react';

const ROLES = [
  { id: 'passenger', label: 'Passenger', icon: '🚗', desc: 'Request rides' },
  { id: 'driver', label: 'Driver', icon: '🚕', desc: 'Accept & fulfill rides' },
  { id: 'explorer', label: 'Explorer', icon: '🔍', desc: 'Browse network & activity' },
];

const RoleSelector = ({ role, onRoleChange }) => (
  <div className="role-selector">
    <div className="role-tabs">
      {ROLES.map((r) => (
        <button
          key={r.id}
          type="button"
          className={`role-tab ${role === r.id ? 'active' : ''}`}
          onClick={() => onRoleChange(r.id)}
        >
          <span className="role-tab-icon">{r.icon}</span>
          <span className="role-tab-label">{r.label}</span>
        </button>
      ))}
    </div>
    <p className="role-desc">{ROLES.find((r) => r.id === role)?.desc}</p>
  </div>
);

export default RoleSelector;
