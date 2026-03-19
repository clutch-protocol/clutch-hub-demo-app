import React from 'react';

const EmptyState = ({ message, icon = '📭', className = '' }) => (
  <div className={`empty-state ${className}`}>
    <span className="empty-state-icon">{icon}</span>
    <p className="empty-state-message">{message}</p>
  </div>
);

export default EmptyState;
