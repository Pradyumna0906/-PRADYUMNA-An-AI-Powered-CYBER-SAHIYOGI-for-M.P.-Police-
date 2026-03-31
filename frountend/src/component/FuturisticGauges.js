import React, { useEffect, useState, useRef } from 'react';
import './FuturisticGauges.css';

/**
 * NeuralWaveform: An oscillating sine-wave that reacts to system state.
 */
export const NeuralWaveform = ({ isActive, color = "#0ff", speed = 0.05, amplitude = 20 }) => {
  const [phase, setPhase] = useState(0);
  const requestRef = useRef();

  const animate = (time) => {
    setPhase(prev => prev + (isActive ? speed : speed * 0.2));
    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isActive]);

  const points = [];
  for (let x = 0; x <= 200; x += 5) {
    const y = 30 + Math.sin(x * 0.05 + phase) * amplitude;
    points.push(`${x},${y}`);
  }

  return (
    <div className="neural-waveform-container">
      <svg width="200" height="60" viewBox="0 0 200 60">
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points.join(' ')}
          style={{ opacity: 0.8 }}
        />
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="1"
          points={points.map(p => {
             const [x, y] = p.split(',');
             return `${x},${60 - y}`;
          }).join(' ')}
          style={{ opacity: 0.3 }}
        />
      </svg>
    </div>
  );
};

/**
 * ScanningHexGrid: A procedural hexagonal background animation.
 */
export const ScanningHexGrid = () => {
  return (
    <div className="hex-grid-container">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="hexagons" width="30" height="26" patternUnits="userSpaceOnUse" patternTransform="scale(1.2)">
            <polygon 
              points="15,0 30,7.5 30,18.5 15,26 0,18.5 0,7.5" 
              fill="none" 
              stroke="rgba(0, 255, 255, 0.05)" 
              strokeWidth="0.5" 
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons)" />
        <div className="scan-beam"></div>
      </svg>
    </div>
  );
};

/**
 * TransmissionSpectrum: A high-density visualizer for data transmission.
 */
export const TransmissionSpectrum = ({ isTransmitting }) => {
  const [bars, setBars] = useState(new Array(15).fill(2));

  useEffect(() => {
    if (!isTransmitting) {
       setBars(new Array(15).fill(2));
       return;
    }
    const interval = setInterval(() => {
      setBars(new Array(15).fill(0).map(() => Math.floor(Math.random() * 20) + 5));
    }, 100);
    return () => clearInterval(interval);
  }, [isTransmitting]);

  return (
    <div className="transmission-spectrum">
      {bars.map((h, i) => (
        <div 
          key={i} 
          className="spectrum-bar" 
          style={{ height: `${h}px` }}
        ></div>
      ))}
    </div>
  );
};
