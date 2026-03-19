import React from 'react';

const ROLES = [
  { id: 'passenger', label: 'Passenger', icon: '🚗' },
  { id: 'driver', label: 'Driver', icon: '🚕' },
  { id: 'explorer', label: 'Explorer', icon: '🔍' },
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
          <span>{r.label}</span>
        </button>
      ))}
    </div>
  </div>
);

export default RoleSelector;
