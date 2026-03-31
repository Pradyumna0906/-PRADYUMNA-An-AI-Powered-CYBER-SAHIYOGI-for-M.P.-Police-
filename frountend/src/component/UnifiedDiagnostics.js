import React from 'react';
import './UnifiedDiagnostics.css';

/**
 * TACTICAL BLADE // V7.1 (Compact Edition)
 * A single, ultra-minimalistic tactical hub for J.A.R.V.I.S.
 */
export const UnifiedTacticalHUD = ({ stats = {}, latency = 0 }) => {
  const { awareness = {}, memDetail = {}, cpu = 0 } = stats;
  const { battery = {}, wifi = {}, location = 'MAINFRAME' } = awareness;
  
  // Real-time Power Check
  const pwrFill = battery.level !== undefined ? battery.level : 0;
  const pwrColor = battery.status === 'CHARGING' ? '#0f0' : (pwrFill < 20 ? '#f00' : '#0ff');

  return (
    <div className="tactical-blade drag-handle">
      <div className="blade-accent"></div>
      
      {/* Header: Geo + Pulse */}
      <div className="blade-section geo-header">
        <div className="sync-pulse"></div>
        <span className="geo-text">{location.split(',')[0]} // STATION</span>
      </div>

      {/* Row 1: Power & Link */}
      <div className="blade-row">
        <div className="blade-stat power">
          <div className="tiny-bar">
             <div className="fill" style={{ width: `${pwrFill}%`, background: pwrColor }}></div>
          </div>
          <span className="val">
            {battery.status === 'CHARGING' && <span className="charge-symbol" style={{ color: '#0f0', marginRight: '2px', animation: 'charging-pulse 1s infinite alternate' }}>⚡</span>}
            {pwrFill}% PWR
          </span>
        </div>
        <div className="blade-stat link">
          <span className="lab">PROJECT</span>
          <span className="val" style={{ fontSize: '0.6rem', lineBreak: 'anywhere' }}>CYBER SAHIYOGI (M.P. POLICE)</span>
        </div>
      </div>

      {/* Row 2: Resources */}
      <div className="blade-row">
        <div className="blade-stat cpu">
          <span className="lab">CPU</span>
          <span className="val">{cpu}%</span>
        </div>
        <div className="blade-stat ram">
          <span className="lab">RAM</span>
          <span className="val">{memDetail.used || 0}GB</span>
        </div>
        <div className="blade-stat latency">
          <span className="lab">LAT</span>
          <span className="val">{latency}ms</span>
        </div>
      </div>

      {/* Footer: Version */}
      <div className="blade-footer">
        <span>V7.1.0 // NEURAL LINK ACTIVE</span>
      </div>
    </div>
  );
};

// Deleting old Hub exports to ensure clean migration
export const AwarenessHub = () => null;
export const ResourceHub = () => null;
