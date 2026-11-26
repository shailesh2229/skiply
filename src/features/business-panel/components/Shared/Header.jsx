import React from 'react';
import '../../styles/Header.css';

const Header = ({ title, actions, subtitle }) => {
  const words = String(title).split(' ');
  const last = words.pop();
  return (
    <div className="bp-header">
      <div className="bp-header-content">
        <p className="bp-header-kicker"><span className="bp-header-led" aria-hidden="true" /> Skiply console · {title}</p>
        <h1 className="bp-header-title">{words.length ? `${words.join(' ')} ` : ''}<span>{last}</span></h1>
        {subtitle && <p className="bp-header-subtitle">{subtitle}</p>}
      </div>
      {actions && (
        <div className="bp-header-actions">
          {actions}
        </div>
      )}
    </div>
  );
};

export default Header;
