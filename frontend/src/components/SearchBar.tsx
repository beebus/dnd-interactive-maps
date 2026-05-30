import React, { useState, useEffect } from 'react';
import './SearchBar.css';
import { MapLocation } from '../data/maps';

export interface Location {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
}

interface SearchBarProps {
  locations: Location[];
  onSelectLocation: (location: Location) => void;
  editMode: boolean;
  setEditMode: (value: boolean) => void;
  marksVisible: boolean;
  onToggleMarks: () => void;
  mapLocation: MapLocation;
  currentVariantIndex: number;
  onSwitchVariant: (index: number) => void;
  onGoHome: () => void;
  distanceMode: boolean;
  onToggleDistanceMode: () => void;
  distanceFeet: number;
  distanceWaypoints: number;
  isRealm: boolean;
  hasDistanceScale: boolean;
}

const TRAVEL_MODES = [
  { label: 'On foot (normal)', feetPerMin: 264, cityOnly: false },
  { label: 'On foot (fast)', feetPerMin: 352, cityOnly: false },
  { label: 'On foot (slow)', feetPerMin: 176, cityOnly: false },
  { label: 'Rowboat', feetPerMin: 132, cityOnly: true },
  { label: 'Keelboat', feetPerMin: 88, cityOnly: true },
];

function formatDistance(feet: number): string {
  if (feet < 5280) return `${Math.round(feet).toLocaleString()} ft`;
  const miles = feet / 5280;
  return miles < 100 ? `${miles.toFixed(1)} mi` : `${Math.round(miles).toLocaleString()} mi`;
}

function formatTime(feet: number, feetPerMin: number): string {
  const minutes = feet / feetPerMin;
  if (minutes < 1) return '< 1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const totalHours = minutes / 60;
  const hours = Math.floor(totalHours);
  const mins = Math.round((totalHours - hours) * 60);
  if (hours < 24) return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  const days = Math.floor(hours / 24);
  const hrs = hours % 24;
  return hrs > 0 ? `${days} days ${hrs} hr` : `${days} days`;
}

export default function SearchBar({
  locations,
  onSelectLocation,
  editMode,
  setEditMode,
  marksVisible,
  onToggleMarks,
  mapLocation,
  currentVariantIndex,
  onSwitchVariant,
  onGoHome,
  distanceMode,
  onToggleDistanceMode,
  distanceFeet,
  distanceWaypoints,
  isRealm,
  hasDistanceScale,
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  useEffect(() => {
    if (query.trim()) {
      const filtered = locations.filter(loc =>
        loc.name.toLowerCase().includes(query.toLowerCase())
      );
      setResults(filtered);
    } else {
      setResults([]);
    }
  }, [query, locations]);

  useEffect(() => {
    if (distanceMode) setPanelCollapsed(false);
  }, [distanceMode]);

  const hasVariants = mapLocation.maps.length > 1;
  const visibleTravelModes = TRAVEL_MODES.filter(m => !m.cityOnly || !isRealm);

  return (
    <div className="search-bar">
      <div className="top-bar">
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
        <input
          type="text"
          placeholder="Search"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button className="close" onClick={() => setQuery('')}>×</button>
      </div>

      {menuOpen && (
        <div className="menu">
          <div className="menu-item" onClick={() => { setEditMode(!editMode); setMenuOpen(false); }}>
            {editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'}
          </div>
          <div className="menu-item" onClick={() => { onToggleMarks(); setMenuOpen(false); }}>
            {marksVisible ? 'Hide all Marks' : 'Show all Marks'}
          </div>
          <div
            className={`menu-item${distanceMode ? ' menu-item--active' : ''}`}
            onClick={() => { onToggleDistanceMode(); setMenuOpen(false); }}
          >
            {distanceMode ? 'Exit Distance Mode' : 'Distance and Time'}
          </div>

          {hasVariants && (
            <>
              <hr />
              <div className="menu-section-label">Map Variants</div>
              {mapLocation.maps.map((variant, index) => (
                <div
                  key={variant.mapKey}
                  className={`menu-item${index === currentVariantIndex ? ' menu-item--active' : ''}`}
                  onClick={() => { onSwitchVariant(index); setMenuOpen(false); }}
                >
                  {variant.label}
                </div>
              ))}
            </>
          )}

          <hr />
          <div className="menu-item" onClick={() => { onGoHome(); setMenuOpen(false); }}>
            ← All Maps
          </div>
          <hr />
          <div className="menu-item">Send a Comment</div>
          <div className="menu-item">Information</div>
        </div>
      )}

      {distanceMode && (
        <div className="distance-panel">
          {!panelCollapsed && (
            <div className="distance-content">
              <p className="distance-instruction">
                {distanceWaypoints === 0
                  ? 'Click on the map to determine the starting point.'
                  : distanceWaypoints === 1
                  ? 'Click on the map to determine the destination.'
                  : <>Keep drawing your path by clicking on the map, then press <strong>ESC</strong> to go back to normal mode.</>
                }
              </p>

              {distanceFeet > 0 && (
                <>
                  {hasDistanceScale ? (
                    <>
                      <div className="distance-section">
                        <div className="distance-label">DISTANCE</div>
                        <div className="distance-value">{formatDistance(distanceFeet)}</div>
                      </div>
                      <div className="distance-section">
                        <div className="distance-label">TRAVEL</div>
                        {visibleTravelModes.map(m => (
                          <div key={m.label} className="travel-mode">
                            {m.label}: <span className="travel-time">{formatTime(distanceFeet, m.feetPerMin)}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="distance-no-scale">No scale configured for this map.</p>
                  )}
                </>
              )}
            </div>
          )}

          <button
            className="distance-collapse"
            onClick={() => setPanelCollapsed(v => !v)}
            title={panelCollapsed ? 'Expand' : 'Collapse'}
          >
            {panelCollapsed ? '∨' : '∧'}
          </button>
        </div>
      )}

      {results.length > 0 && (
        <div className="results">
          {results.map(loc => (
            <div
              key={loc.id}
              className="result-item"
              onClick={() => onSelectLocation(loc)}
            >
              {loc.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
