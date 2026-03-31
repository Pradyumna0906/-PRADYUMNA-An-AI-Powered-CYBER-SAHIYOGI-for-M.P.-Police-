import React from 'react';
import './TacticalRotator.css';

const TacticalRotator = ({ isListening, isProcessing }) => {
  return (
    <div className={`tactical-rotator-container ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}>
      <svg viewBox="0 0 200 200" className="tactical-svg">
        {/* Outer Ring - Dashed */}
        <circle
          cx="100" cy="100" r="90"
          className="ring outer-ring"
          strokeDasharray="10 5"
        />
        
        {/* Middle Ring - Incomplete */}
        <circle
          cx="100" cy="100" r="75"
          className="ring middle-ring"
          strokeDasharray="100 20 40 20"
        />

        {/* Inner Ring - Rapid Rotator */}
        <circle
          cx="100" cy="100" r="60"
          className="ring inner-ring"
          strokeDasharray="5 5"
        />

        {/* Tactical Crosshair Extensions */}
        <line x1="100" y1="5" x2="100" y2="20" className="crosshair-tick" />
        <line x1="100" y1="180" x2="100" y2="195" className="crosshair-tick" />
        <line x1="5" y1="100" x2="20" y2="100" className="crosshair-tick" />
        <line x1="180" y1="100" x2="195" y2="100" className="crosshair-tick" />

        {/* Floating Data Points (Simulated) */}
        <text x="145" y="60" className="tactical-text">SYNC_7</text>
        <text x="45" y="145" className="tactical-text">CORE_9</text>
      </svg>
    </div>
  );
};

export default TacticalRotator;
