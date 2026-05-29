import { gql } from '@apollo/client';
import { useQuery, useMutation } from '@apollo/client/react';
import React, { useState } from 'react';
import SearchBar, { Location as SearchLocation } from '../components/SearchBar';

// eslint-disable-next-line
const GET_LOCATIONS = gql`
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

// eslint-disable-next-line
const CREATE_LOCATION = gql`
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

function MapPage({ mapName }: { mapName: string }) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [highlighted, setHighlighted] = useState<SearchLocation | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const { data, loading, error, refetch } = useQuery<GetLocationsData>(GET_LOCATIONS, {
    variables: { mapName: mapName.toLowerCase() },
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

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading map data</p>;

  const locations: SearchLocation[] = (data?.allLocations ?? []).map((loc) => ({
    id: loc.name,
    name: loc.name,
    x: loc.x,
    y: loc.y,
    description: loc.pois.map((p) => `${p.title}: ${p.description}`).join('\n'),
  }));

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1100 }}>
      </div>

      <SearchBar
        locations={locations}
        onSelectLocation={(loc) => setHighlighted(loc)}
        editMode={editMode}
        setEditMode={setEditMode}
      />

      <img
        ref={imgRef}
        src={`/maps/${mapName.toLowerCase()}.jpg`}
        alt={mapName}
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
            await createLocation({ variables: { name, x, y, mapName: mapName.toLowerCase() } });
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

export default MapPage;
