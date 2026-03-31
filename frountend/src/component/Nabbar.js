import React, { useState, useEffect } from 'react';
import './Nabbar.css';

import cyberLogo from '../images/mp_cyber_police.png.png';

const SHAPES = [
  'Auto', 'Abyssal Jellyfish', 'Ethereal Loom', 'Chrono Core', 'Aetheric Crown', 
  'Aizawa Sphere', 'Thomas Labyrinth', 'Nose-Hoover Braid', 'Four-Wing Butterfly', 
  'Clifford Cloud', 'Hopalong Nebula', 'Quantum Lotus', 'Stellar Web', 
  'Crystalline Spire', 'Void Dragon', 'Astral Web', 'Hyperborean Snowflake', 'Plasma Coil'
];

const COLORS = [
  'Default', 'Neon Cyber', 'Molten Core', 'Matrix Green', 'Deep Space',
  'Golden Aura', 'Arctic Ice', 'Amethyst Dream', 'Blood Moon', 'Toxic Waste'
];

const Nabbar = ({ blobConfig, setBlobConfig, isEditMode, setIsEditMode, saveLayout, resetLayout }) => {
  const [scrolled, setScrolled] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const updateConfig = (key, value) => {
    if (setBlobConfig) {
      setBlobConfig(prev => ({ ...prev, [key]: value }));
    }
  };

  return (
    <nav className={`nabbar-container ${scrolled ? 'nabbar-scrolled' : ''}`}>
      <div className="nabbar-glass">
        <div className="glow-container">
          <div className="liquid-glow glow-1"></div>
          <div className="liquid-glow glow-2"></div>
        </div>

        <div className="nabbar-content">
          <div className="nabbar-logo">
            <div className="logo-shield-container">
              <img src={cyberLogo} alt="MP Cyber Police" className="logo-shield" />
              <div className="hologram-scanline"></div>
            </div>
            <span className="logo-text">CYBER SAHIYOGI (M.P. POLICE)</span>
          </div>

          <ul className="nabbar-links">
            <li className="nav-item">
              <a href="#home" className="nav-link" data-text="HOME">HOME</a>
            </li>
            <li className="nav-item" style={{ position: 'relative' }}>
              <button 
                className="nav-link settings-btn" 
                onClick={() => setSettingsOpen(!settingsOpen)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', color: 'inherit', fontSize: 'inherit' }}
              >
                SETTINGS ⚙️
              </button>
              
              {settingsOpen && (
                <div className="settings-dropdown">
                  <div className="settings-header">BLOB CONTROLS</div>
                  
                  <div className="settings-row">
                    <label>Color</label>
                    <select 
                      value={blobConfig?.colorPreset || 'Default'} 
                      onChange={(e) => updateConfig('colorPreset', e.target.value)}
                    >
                      {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="settings-row">
                    <label>Shape</label>
                    <select 
                      value={blobConfig?.shape || 'Auto'} 
                      onChange={(e) => updateConfig('shape', e.target.value)}
                    >
                      {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="settings-row">
                    <label>Size: {blobConfig?.scaleMult?.toFixed(1) || '1.0'}x</label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="2.5" 
                      step="0.1" 
                      value={blobConfig?.scaleMult || 1.0}
                      onChange={(e) => updateConfig('scaleMult', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="settings-row">
                    <label>Sensitivity: {blobConfig?.sensitivity?.toFixed(1) || '1.0'}x</label>
                    <input 
                      type="range" 
                      min="0.1" 
                      max="3.0" 
                      step="0.1" 
                      value={blobConfig?.sensitivity || 1.0}
                      onChange={(e) => updateConfig('sensitivity', parseFloat(e.target.value))}
                    />
                  </div>

                  <div className="settings-divider"></div>
                </div>
              )}
            </li>
          </ul>

          <div className="nabbar-actions">
            <button className="cyber-btn">
              <span className="btn-glitch"></span>
              INITIALIZE
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Nabbar;
