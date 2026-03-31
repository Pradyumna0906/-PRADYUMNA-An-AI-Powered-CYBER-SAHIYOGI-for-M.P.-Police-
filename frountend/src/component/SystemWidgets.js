import React from 'react';
import './SystemWidgets.css';

export const ProcessMonitor = ({ processes = [] }) => {
  return (
    <div className="system-widget process-monitor">
      <div className="widget-header drag-handle">
        <span className="dot pulse"></span> ACTIVE PROCESSES
      </div>
      <div className="process-list">
        {processes.length > 0 ? processes.map((p, i) => (
          <div key={i} className="process-item">
            <span className="p-name">{p.name || 'Unknown'}</span>
            <span className="p-val">{p.mem || '0 KB'}</span>
          </div>
        )) : <div className="loading-text">SCANNING...</div>}
      </div>
    </div>
  );
};

export const NetworkHUD = ({ latency = 0 }) => {
  const getQuality = () => {
    if (latency < 100) return 'EXCELLENT';
    if (latency < 300) return 'STABLE';
    return 'DEGRADED';
  };

  return (
    <div className="system-widget network-hud">
      <div className="widget-header drag-handle">NETWORK TELEMETRY</div>
      <div className="net-data">
        <div className="net-stat">
          <span className="n-lab">CORE PING</span>
          <span className={`n-val ${getQuality().toLowerCase()}`}>{latency}ms</span>
        </div>
        <div className="net-stat">
          <span className="n-lab">LINK QUALITY</span>
          <span className="n-val">{getQuality()}</span>
        </div>
      </div>
      <div className="signal-bars">
        {[1,2,3,4,5].map(b => (
          <div key={b} className={`bar ${b <= (latency < 300 ? 5 : 2) ? 'lit' : ''}`}></div>
        ))}
      </div>
    </div>
  );
};

export const MemoryHub = ({ memDetail = { total: 0, used: 0, free: 0 } }) => {
  const usedPct = memDetail.total > 0 ? Math.round((memDetail.used / memDetail.total) * 100) : 0;
  
  return (
    <div className="system-widget memory-hub">
      <div className="widget-header drag-handle">MEMORY ANALYTICS</div>
      <div className="mem-visual">
        <div className="mem-bar-bg">
          <div className="mem-bar-fill" style={{ width: `${usedPct}%` }}></div>
        </div>
        <div className="mem-pct">{usedPct}%</div>
      </div>
      <div className="mem-stats">
        <div className="m-row"><span>PHYSICAL</span> <span>{memDetail.total}GB</span></div>
        <div className="m-row"><span>COMMITTED</span> <span>{memDetail.used}GB</span></div>
        <div className="m-row"><span>AVAILABLE</span> <span>{memDetail.free}GB</span></div>
      </div>
    </div>
  );
};
