import React, { useState } from 'react';

const Section = ({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
  action,
  badge,
  className = '',
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <section className={`section ${className}`}>
      <div className="section-header">
        <div className="section-title-row">
          <h2 className="section-title">
            {title}
            {badge != null && <span className="section-badge">{badge}</span>}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {action}
            {collapsible && (
              <button
                type="button"
                className="section-toggle"
                onClick={() => setExpanded((e) => !e)}
                aria-expanded={expanded}
              >
                {expanded ? '−' : '+'}
              </button>
            )}
          </div>
        </div>
        {description && <p className="section-description">{description}</p>}
      </div>
      {(!collapsible || expanded) && <div className="section-content">{children}</div>}
    </section>
  );
};

export default Section;
