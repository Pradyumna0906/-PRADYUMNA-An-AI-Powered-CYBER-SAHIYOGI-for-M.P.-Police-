import React from 'react';
import './AwarenessHUD.css';

export const LocationBox = ({ location = 'SCANNING...' }) => {
  return (
    <div className="awareness-widget location-box">
      <div className="widget-header drag-handle">GEO-POSITIONING</div>
      <div className="loc-content">
        <div className="loc-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="loc-details">
          <span className="loc-main">{location.split(',')[0]}</span>
          <span className="loc-sub">{location.split(',')[1] || 'GLOBAL'}</span>
        </div>
      </div>
      <div className="loc-scan-bar"></div>
    </div>
  );
};

export const PowerCell = ({ battery = { level: 100, status: 'UNKNOWN' } }) => {
  const isCharging = battery.status === 'CHARGING';
  
  return (
    <div className="awareness-widget power-cell">
      <div className="widget-header drag-handle">POWER GRID</div>
      <div className="battery-viz">
        <div className="battery-base">
          <div className="battery-level" style={{ height: `${battery.level}%`, background: battery.level < 20 ? '#f00' : (isCharging ? '#0f0' : '#0ff') }}>
            {isCharging && <div className="charging-bolt">⚡</div>}
          </div>
        </div>
        <div className="battery-text">
          <span className="b-pct">{battery.level}%</span>
          <span className="b-stat">{battery.status}</span>
        </div>
      </div>
    </div>
  );
};

export const ConnectivityHUD = ({ wifi = { ssid: 'OFFLINE', signal: 0 }, bluetooth = 'NONE' }) => {
  return (
    <div className="awareness-widget connectivity-hud">
      <div className="widget-header drag-handle">CONNECTIVITY LINK</div>
      <div className="conn-item">
        <div className="c-icon wifi">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12.55a11 11 0 0114.08 0" /><path d="M1.42 9a16 16 0 0121.16 0" /><path d="M8.53 16.11a6 6 0 016.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>
        <div className="c-info">
          <span className="c-lab">WI-FI // {wifi.signal}%</span>
          <span className="c-val">{wifi.ssid}</span>
        </div>
      </div>
      <div className="conn-item">
        <div className="c-icon bt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 7l10 10-5 5V2l5 5L7 17" />
          </svg>
        </div>
        <div className="c-info">
          <span className="c-lab">BLUETOOTH LINK</span>
          <span className="c-val">{bluetooth || 'DISCONNECTED'}</span>
        </div>
      </div>
    </div>
  );
};
