import { gql, TypedDocumentNode } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SearchBar, { Location as SearchLocation } from '../components/SearchBar';
import { getMapLocation, MapLocation } from '../data/maps';

interface Poi {
  title: string;
  description: string;
}

interface LocationData {
  id: string;
  name: string;
  x: number;
  y: number;
  pois: Poi[];
}

interface GetLocationsData {
  allLocations: LocationData[];
}

interface GetLocationsVariables {
  mapName: string;
}

interface CreateLocationData {
  createLocation: {
    location: {
      id: string;
      name: string;
      x: number;
      y: number;
    };
  };
}

interface CreateLocationVariables {
  name: string;
  x: number;
  y: number;
  mapName: string;
}

const GET_LOCATIONS: TypedDocumentNode<GetLocationsData, GetLocationsVariables> = gql`
  query GetLocations($mapName: String!) {
    allLocations(mapName: $mapName) {
      name
      x
      y
      pois {
        title
        description
      }
    }
  }
`;

const CREATE_LOCATION: TypedDocumentNode<CreateLocationData, CreateLocationVariables> = gql`
  mutation CreateLocation($name: String!, $x: Float!, $y: Float!, $mapName: String!) {
    createLocation(name: $name, x: $x, y: $y, mapName: $mapName) {
      location {
        id
        name
        x
        y
      }
    }
  }
`;

function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ padding: '4rem', textAlign: 'center', color: '#e8d9b5', background: '#0d0d0d', minHeight: '100vh' }}>
      <h2 style={{ color: '#c9a84c' }}>Map not found</h2>
      <p>No map exists for that location.</p>
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', cursor: 'pointer' }}
      >
        Return to Maps
      </button>
    </div>
  );
}

function MapPageInner({ mapLocation }: { mapLocation: MapLocation }) {
  const navigate = useNavigate();
  const [variantIndex, setVariantIndex] = useState(0);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [highlighted, setHighlighted] = useState<SearchLocation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const currentVariant = mapLocation.maps[variantIndex];

  const { data, loading, error, refetch } = useQuery(GET_LOCATIONS, {
    variables: { mapName: currentVariant.mapKey },
  });

  const [createLocation] = useMutation(CREATE_LOCATION);

  const updateImageScale = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      const nativeWidth = 1200;
      setImageScale(rect.width / nativeWidth);
    }
  };

  React.useEffect(() => {
    updateImageScale();
    window.addEventListener('resize', updateImageScale);
    return () => window.removeEventListener('resize', updateImageScale);
  }, []);

  // Reset highlight when switching variants
  React.useEffect(() => {
    setHighlighted(null);
  }, [variantIndex]);

  if (loading) return <p style={{ color: '#e8d9b5', padding: '2rem' }}>Loading...</p>;
  if (error) return <p style={{ color: '#e8d9b5', padding: '2rem' }}>Error loading map data</p>;

  const locations: SearchLocation[] = (data?.allLocations ?? []).map((loc) => ({
    id: loc.name,
    name: loc.name,
    x: loc.x,
    y: loc.y,
    description: loc.pois.map((p) => `${p.title}: ${p.description}`).join('\n'),
  }));

  return (
    <div style={{ position: 'relative' }}>
      <SearchBar
        locations={locations}
        onSelectLocation={(loc) => setHighlighted(loc)}
        editMode={editMode}
        setEditMode={setEditMode}
        mapLocation={mapLocation}
        currentVariantIndex={variantIndex}
        onSwitchVariant={setVariantIndex}
        onGoHome={() => navigate('/')}
      />

      <img
        ref={imgRef}
        src={`/maps/${currentVariant.filename}`}
        alt={currentVariant.label}
        style={{
          display: 'block',
          width: '100vw',
          height: 'auto',
          margin: 0,
          padding: 0,
          objectFit: 'contain',
        }}
        onLoad={updateImageScale}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) / imageScale);
          const y = Math.round((e.clientY - rect.top) / imageScale);
          setCoords({ x, y });
        }}
        onMouseLeave={() => setCoords(null)}
        onClick={async (e) => {
          if (!editMode) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) / imageScale);
          const y = Math.round((e.clientY - rect.top) / imageScale);
          const name = prompt('Enter a name for this location:');
          if (!name) return;

          try {
            await createLocation({
              variables: { name, x, y, mapName: currentVariant.mapKey },
            });
            await refetch();
          } catch (err) {
            alert('Failed to create location.');
            console.error(err);
          }
        }}
      />

      {coords && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '14px',
            zIndex: 1000,
          }}
        >
          x: {coords.x}, y: {coords.y}
        </div>
      )}

      {(highlighted ? [highlighted] : locations).map((loc) => (
        <div
          key={loc.name}
          style={{
            position: 'absolute',
            top: `${loc.y * imageScale}px`,
            left: `${loc.x * imageScale}px`,
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            fontSize: highlighted?.name === loc.name ? '24px' : '18px',
            color: highlighted?.name === loc.name ? 'red' : 'black',
            zIndex: highlighted?.name === loc.name ? 1000 : 500,
          }}
          title={loc.name}
          onClick={() => alert(`${loc.name}\n${loc.description}`)}
        >
          📍
        </div>
      ))}
    </div>
  );
}

function MapPage() {
  const { slug } = useParams<{ slug: string }>();
  const mapLocation = slug ? getMapLocation(slug) : undefined;

  if (!mapLocation) return <NotFound />;

  return <MapPageInner mapLocation={mapLocation} />;
}

export default MapPage;
