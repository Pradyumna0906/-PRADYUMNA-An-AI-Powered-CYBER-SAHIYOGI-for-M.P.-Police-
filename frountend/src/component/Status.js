import React, { useState, useEffect } from 'react';
import './Status.css';
import { NeuralWaveform, ScanningHexGrid } from './FuturisticGauges';

const CircularGauge = ({ value, label, color, size = 60 }) => {
  const radius = size * 0.4;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="gauge-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="gauge-track"
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          className="gauge-progress"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeWidth="3"
        />
        {/* Decorator Outer */}
        <circle
          cx={size / 2} cy={size / 2} r={radius + 5}
          className="gauge-decorator"
          strokeDasharray="2, 5"
        />
        <text x="50%" y="50%" dy=".3em" textAnchor="middle" className="gauge-text">
          {value}%
        </text>
      </svg>
      <span className="gauge-label">{label}</span>
    </div>
  );
};

const Status = ({ isListening, backendConnected, isProcessing, isSpeaking, systemStats = {}, aiLatency = 0 }) => {
  const [systemOnline, setSystemOnline] = useState(navigator.onLine);
  const [micPermission, setMicPermission] = useState('CHECKING...');

  useEffect(() => {
    const handleOnline = () => setSystemOnline(true);
    const handleOffline = () => setSystemOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check mic permission
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' }).then((result) => {
        setMicPermission(result.state.toUpperCase());
        result.onchange = () => {
          setMicPermission(result.state.toUpperCase());
        };
      }).catch(() => setMicPermission('UNKNOWN'));
    } else {
      setMicPermission('UNAVAILABLE');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="status-panel">
      <div className="status-header drag-handle">
        <div className="scan-line-tiny"></div>
        SYSTEM DIAGNOSTICS
      </div>

      <div className="status-divider"></div>

      <div className="status-grid">
        <div className="status-item">
        <span className="status-label">System State</span>
        <span className={`status-value ${systemOnline ? 'online' : 'offline'}`}>
          {systemOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">CYBER SAHIYOGI Core</span>
        <span className={`status-value ${backendConnected ? 'online' : 'offline'}`}>
          {backendConnected ? 'ONLINE' : 'OFFLINE'}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">API Link</span>
        <span className={`status-value ${backendConnected ? 'online' : 'offline'}`}>
          {backendConnected ? 'CONNECTED' : 'DISCONNECTED'}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">Microphone</span>
        <span className={`status-value ${isListening ? 'active' : 'inactive'}`}>
          {isListening ? 'RECORDING' : 'STANDBY'}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">Mic Permission</span>
        <span className={`status-value ${micPermission === 'GRANTED' ? 'online' : (micPermission === 'DENIED' ? 'offline' : 'inactive')}`}>
          {micPermission}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">Processing</span>
        <span className={`status-value ${isProcessing ? 'active' : 'inactive'}`}>
          {isProcessing ? 'ACTIVE' : 'IDLE'}
        </span>
      </div>

      <div className="status-item">
        <span className="status-label">Voice Output</span>
        <span className={`status-value ${isSpeaking ? 'active' : 'inactive'}`}>
          {isSpeaking ? 'SPEAKING' : 'SILENT'}
        </span>
      </div>
      </div>
    </div>
  );
};

export default Status;
