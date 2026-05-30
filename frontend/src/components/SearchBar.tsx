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
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Location[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const hasVariants = mapLocation.maps.length > 1;

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
          <div className="menu-item">Distance and Time</div>

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
