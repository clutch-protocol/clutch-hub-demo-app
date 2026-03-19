import React from 'react';

const TABS = [
  { id: 'requests', label: 'Ride Requests', icon: '📍' },
  { id: 'trips', label: 'Active Trips', icon: '🚗' },
  { id: 'about', label: 'About', icon: 'ℹ️' },
];

const ExplorerTabs = ({ activeTab, onTabChange }) => (
  <div className="explorer-tabs">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        className={`explorer-tab ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onTabChange(tab.id)}
      >
        <span className="explorer-tab-icon">{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    ))}
  </div>
);

export default ExplorerTabs;
