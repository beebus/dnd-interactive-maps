import React from 'react';
import './Modal.css';

interface InformationModalProps {
  onClose: () => void;
}

export default function InformationModal({ onClose }: InformationModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card--wide" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <h2 className="modal-title">Travel Information</h2>
        <p className="modal-subtitle">
          Rules from the 2024 Dungeon Master's Guide and Player's Handbook.
        </p>

        {/* Weather */}
        <div className="info-section">
          <h3>Weather</h3>
          <p>
            Roll 1d20 three times to determine temperature, wind, and precipitation. Adjust for terrain
            and season as appropriate.
          </p>

          <table className="info-table">
            <thead>
              <tr><th>1d20</th><th>Temperature</th></tr>
            </thead>
            <tbody>
              <tr><td>1–14</td><td>Normal for the season</td></tr>
              <tr><td>15–17</td><td>1d4 × 10°F colder</td></tr>
              <tr><td>18–20</td><td>1d4 × 10°F hotter</td></tr>
            </tbody>
          </table>

          <table className="info-table">
            <thead>
              <tr><th>1d20</th><th>Wind</th><th>Precipitation</th></tr>
            </thead>
            <tbody>
              <tr><td>1–12</td><td>None</td><td>None</td></tr>
              <tr><td>13–17</td><td>Light</td><td>Light rain or light snowfall</td></tr>
              <tr><td>18–20</td><td>Strong</td><td>Heavy rain or heavy snowfall</td></tr>
            </tbody>
          </table>
        </div>

        {/* Travel Pace */}
        <div className="info-section">
          <h3>Travel Pace</h3>
          <p>
            The predominant terrain determines the characters' maximum travel pace. Certain factors
            can affect a group's travel pace:
          </p>
          <div className="info-subsection">
            <p><strong>Good Roads.</strong> Increases maximum pace by one step (Slow → Normal, or Normal → Fast).</p>
            <p><strong>Slower Travelers.</strong> The group must move at Slow pace if any member's Speed is reduced to half or less of normal.</p>
            <p>
              <strong>Extended Travel.</strong> Characters can travel more than 8 hours per day at the risk of tiring.
              At the end of each hour beyond 8, each character must succeed on a Constitution saving throw
              (DC 10 + 1 per hour past 8) or gain 1 Exhaustion level.
            </p>
            <p>
              <strong>Special Movement.</strong> Miles per hour = Speed ÷ 10. Miles per day (Normal) = MPH × hours
              traveled (typically 8). Fast = ×1⅓ (round down). Slow = ×⅔ (round down).
            </p>
            <p><strong>Vehicles.</strong> Use the vehicle's speed in miles per hour; no travel pace is chosen.</p>
          </div>
        </div>

        {/* Travel Terrain */}
        <div className="info-section">
          <h3>Travel Terrain</h3>
          <table className="info-table">
            <thead>
              <tr>
                <th>Terrain</th>
                <th>Max Pace</th>
                <th>Encounter Distance</th>
                <th>Foraging DC</th>
                <th>Navigation DC</th>
                <th>Search DC</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Arctic</td><td>Fast*</td><td>6d6 × 10 ft</td><td>20</td><td>10</td><td>10</td></tr>
              <tr><td>Coastal</td><td>Normal</td><td>2d10 × 10 ft</td><td>10</td><td>5</td><td>15</td></tr>
              <tr><td>Desert</td><td>Normal</td><td>6d6 × 10 ft</td><td>20</td><td>10</td><td>10</td></tr>
              <tr><td>Forest</td><td>Normal</td><td>2d8 × 10 ft</td><td>10</td><td>15</td><td>15</td></tr>
              <tr><td>Grassland</td><td>Fast</td><td>6d6 × 10 ft</td><td>15</td><td>5</td><td>15</td></tr>
              <tr><td>Hill</td><td>Normal</td><td>2d10 × 10 ft</td><td>15</td><td>10</td><td>15</td></tr>
              <tr><td>Mountain</td><td>Slow</td><td>4d10 × 10 ft</td><td>20</td><td>15</td><td>20</td></tr>
              <tr><td>Swamp</td><td>Slow</td><td>2d8 × 10 ft</td><td>10</td><td>15</td><td>20</td></tr>
              <tr><td>Underdark</td><td>Normal</td><td>2d6 × 10 ft</td><td>20</td><td>10</td><td>20</td></tr>
              <tr><td>Urban</td><td>Normal</td><td>2d6 × 10 ft</td><td>20</td><td>15</td><td>15</td></tr>
              <tr><td>Waterborne</td><td>Special†</td><td>6d6 × 10 ft</td><td>15</td><td>10</td><td>15</td></tr>
            </tbody>
          </table>
          <p className="info-note">* Appropriate equipment (e.g., skis) is necessary to keep up a Fast pace in Arctic terrain.</p>
          <p className="info-note">† Rate of travel while waterborne depends on the vehicle; see Vehicles below.</p>
        </div>

        {/* Mounts and Animals */}
        <div className="info-section">
          <h3>Mounts and Other Animals</h3>
          <p>
            An animal pulling a carriage, cart, chariot, sled, or wagon can move weight up to five times
            its base carrying capacity, including the vehicle's weight. Add carrying capacities together
            for multiple animals.
          </p>
          <table className="info-table">
            <thead>
              <tr><th>Mount</th><th>Carrying Capacity</th><th>Cost</th></tr>
            </thead>
            <tbody>
              <tr><td>Camel</td><td>450 lb.</td><td>50 GP</td></tr>
              <tr><td>Elephant</td><td>1,320 lb.</td><td>200 GP</td></tr>
              <tr><td>Horse, Draft</td><td>540 lb.</td><td>50 GP</td></tr>
              <tr><td>Horse, Riding</td><td>480 lb.</td><td>75 GP</td></tr>
              <tr><td>Mastiff</td><td>195 lb.</td><td>25 GP</td></tr>
              <tr><td>Mule</td><td>420 lb.</td><td>8 GP</td></tr>
              <tr><td>Pony</td><td>225 lb.</td><td>30 GP</td></tr>
              <tr><td>Warhorse</td><td>540 lb.</td><td>400 GP</td></tr>
            </tbody>
          </table>
        </div>

        {/* Vehicles */}
        <div className="info-section">
          <h3>Tack, Harness, and Drawn Vehicles</h3>
          <table className="info-table">
            <thead>
              <tr><th>Item</th><th>Weight</th><th>Cost</th></tr>
            </thead>
            <tbody>
              <tr><td>Carriage</td><td>600 lb.</td><td>100 GP</td></tr>
              <tr><td>Cart</td><td>200 lb.</td><td>15 GP</td></tr>
              <tr><td>Chariot</td><td>100 lb.</td><td>250 GP</td></tr>
              <tr><td>Feed per day</td><td>10 lb.</td><td>5 CP</td></tr>
              <tr><td>Saddle, Exotic</td><td>40 lb.</td><td>60 GP</td></tr>
              <tr><td>Saddle, Military</td><td>30 lb.</td><td>20 GP</td></tr>
              <tr><td>Saddle, Riding</td><td>25 lb.</td><td>10 GP</td></tr>
              <tr><td>Sled</td><td>300 lb.</td><td>20 GP</td></tr>
              <tr><td>Stabling per day</td><td>—</td><td>5 SP</td></tr>
              <tr><td>Wagon</td><td>400 lb.</td><td>35 GP</td></tr>
            </tbody>
          </table>
          <p>
            <strong>Barding</strong> (mount armor) costs four times the normal armor cost and weighs twice as much.
            A <strong>Military Saddle</strong> gives Advantage on checks to remain mounted. An <strong>Exotic Saddle</strong> is
            required for aquatic or flying mounts.
          </p>
        </div>

        {/* Large Vehicles */}
        <div className="info-section">
          <h3>Airborne and Waterborne Vehicles</h3>
          <p>
            A ship sailing against a strong wind moves at half speed. In dead calm, waterborne ships can't
            move under sail and must be rowed. If going downstream, add the current's speed (typically 3 mph).
            Repairing 1 HP of ship damage requires 1 day and costs 20 GP (halved at a city shipyard).
          </p>
          <p>
            Passengers typically pay <strong>5 SP/day</strong> for a hammock; a small private cabin costs <strong>2 GP/day</strong>.
          </p>
          <table className="info-table">
            <thead>
              <tr>
                <th>Ship</th>
                <th>Speed</th>
                <th>Crew</th>
                <th>Passengers</th>
                <th>Cargo (Tons)</th>
                <th>AC</th>
                <th>HP</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Airship</td><td>8 mph</td><td>10</td><td>20</td><td>1</td><td>13</td><td>300</td><td>40,000 GP</td></tr>
              <tr><td>Galley</td><td>4 mph</td><td>80</td><td>—</td><td>150</td><td>15</td><td>500</td><td>30,000 GP</td></tr>
              <tr><td>Keelboat</td><td>1 mph</td><td>1</td><td>6</td><td>½</td><td>15</td><td>100</td><td>3,000 GP</td></tr>
              <tr><td>Longship</td><td>3 mph</td><td>40</td><td>150</td><td>10</td><td>15</td><td>300</td><td>10,000 GP</td></tr>
              <tr><td>Rowboat</td><td>1½ mph</td><td>1</td><td>3</td><td>—</td><td>11</td><td>50</td><td>50 GP</td></tr>
              <tr><td>Sailing Ship</td><td>2 mph</td><td>20</td><td>20</td><td>100</td><td>15</td><td>300</td><td>10,000 GP</td></tr>
              <tr><td>Warship</td><td>2½ mph</td><td>60</td><td>60</td><td>200</td><td>15</td><td>500</td><td>25,000 GP</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
