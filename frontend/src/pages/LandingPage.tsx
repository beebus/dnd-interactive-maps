import { Link } from 'react-router-dom';
import { MAP_LOCATIONS } from '../data/maps';
import './LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1>D&amp;D Interactive Maps</h1>
        <p>Explore the Forgotten Realms and beyond</p>
      </header>

      <div className="map-grid">
        {MAP_LOCATIONS.map((location) => {
          const thumbnail = location.maps[0].filename;
          const hasVariants = location.maps.length > 1;

          return (
            <Link
              key={location.slug}
              to={`/maps/${location.slug}`}
              className="map-card"
            >
              <div className="map-card-thumbnail">
                <img
                  src={`/maps/${thumbnail}`}
                  alt={location.name}
                  loading="lazy"
                />
                {hasVariants && (
                  <span className="variant-badge">{location.maps.length} maps</span>
                )}
              </div>

              <div className="map-card-body">
                <h2>{location.name}</h2>
                <p>{location.description}</p>
                <div className="map-tags">
                  {location.tags.map((tag) => (
                    <span key={tag} className="map-tag">{tag}</span>
                  ))}
                </div>
                <span className="map-card-cta">Explore</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default LandingPage;
