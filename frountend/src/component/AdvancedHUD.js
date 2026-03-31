import React, { useState, useEffect } from 'react';
import {
  Clock,
  Cloud,
  CloudRain,
  CloudLightning,
  Sun,
  Map as MapIcon,
  Navigation,
  X
} from 'lucide-react';
import { MapContainer as LMapContainer, TileLayer as LTileLayer, Marker as LMarker, Popup as LPopup, useMap as LuseMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './AdvancedHUD.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to update map view
function ChangeView({ center }) {
  const map = LuseMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export const ClockWeatherHUD = () => {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState(null);
  const [location, setLocation] = useState('FETCHING...');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const wRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=relativehumidity_2m`);
          const wData = await wRes.json();
          setWeather(wData);

          const lRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const lData = await lRes.json();
          const city = lData.address.city || lData.address.town || lData.address.village || 'STATION';
          setLocation(city.toUpperCase());
        } catch (error) {
          console.error("HUD Data Error:", error);
          setLocation("SYNC ERROR");
        }
      }, () => setLocation("DENIED"));
    }
  }, []);

  const getWeatherIcon = (code) => {
    if (code === 0) return <Sun size={14} className="weather-icon sun pulse" />;
    if (code <= 3) return <Cloud size={14} className="weather-icon cloud" />;
    if (code >= 51 && code <= 67) return <CloudRain size={14} className="weather-icon rain" />;
    if (code >= 95) return <CloudLightning size={14} className="weather-icon lightning" />;
    return <Cloud size={14} className="weather-icon cloud" />;
  };

  return (
    <div className="hud-panel glass-panel animate-fade-in drag-handle compact-hud" style={{ position: 'relative' }}>
      <div className="hud-content">
        {/* Row 1: Time, Temp, Humidity */}
        <div className="hud-row main-data-row">
          <div className="clock-group">
            <span className="clock-text-compact">
              {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          <div className="weather-group">
            {weather ? (
              <>
                {getWeatherIcon(weather.current_weather.weathercode)}
                <span className="temp-text">{Math.round(weather.current_weather.temperature)}°C</span>
                <span className="hum-text">{weather.hourly?.relativehumidity_2m[0]}% H</span>
              </>
            ) : <span className="sync-text">SYNCING</span>}
          </div>
        </div>

        {/* Row 2: Location, Date */}
        <div className="hud-row sub-data-row">
          <div className="location-group">
            <Navigation size={10} className="accent-icon" />
            <span className="location-text">{location}</span>
          </div>
          <span className="date-text">
            {time.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TacticalMapHUD = () => {
  const [showMap, setShowMap] = useState(false);
  const [coords, setCoords] = useState([23.2599, 77.4126]); // Default: Bhopal

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setCoords([position.coords.latitude, position.coords.longitude]);
      });
    }
  }, []);

  return (
    <>
      <div className={`map-trigger ${showMap ? 'active' : ''} drag-handle`}
        onClick={() => setShowMap(!showMap)}
        style={{ position: 'relative' }}>
        <MapIcon size={18} />
        <span className="trigger-label">{showMap ? 'CLOSE' : 'TACTICAL'}</span>
      </div>

      {showMap && (
        <div className="map-overlay glass-panel animate-fade-in" style={{ position: 'fixed', bottom: '80px', right: '20px' }}>
          <div className="map-header drag-handle">
            <div className="map-title">
              <Navigation size={12} className="accent-icon" />
              <span>TACTICAL GEOLOCATION INFOMATION</span>
            </div>
            <X size={16} className="close-btn" onClick={() => setShowMap(false)} />
          </div>

          <div className="map-container-wrapper">
            <LMapContainer center={coords} zoom={13} className="hud-map" zoomControl={false}>
              <ChangeView center={coords} />
              <LTileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                className="map-tiles"
              />
              <LMarker position={coords}>
                <LPopup className="map-popup">
                  CYBER SAHIYOGI INTERFACE POSITION<br />
                  LAT: {coords[0].toFixed(4)}<br />
                  LON: {coords[1].toFixed(4)}
                </LPopup>
              </LMarker>
            </LMapContainer>
          </div>

          <div className="map-footer">
            COORDINATES: {coords[0].toFixed(4)}°N, {coords[1].toFixed(4)}°E // SYSTEM_ACTIVE
          </div>
        </div>
      )}
    </>
  );
};

// Default export for backward compatibility
const AdvancedHUD = () => {
  return (
    <div className="advanced-hud">
      <ClockWeatherHUD />
      <TacticalMapHUD />
    </div>
  );
};

export default AdvancedHUD;
