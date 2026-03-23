import React from 'react';

const TABS = [
  { id: 'requests', label: 'Ride Requests' },
  { id: 'trips', label: 'Active Trips' },
  { id: 'recent', label: 'Recent rides' },
  { id: 'about', label: 'About' },
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
        {tab.label}
      </button>
    ))}
  </div>
);

export default ExplorerTabs;
