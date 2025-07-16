import { useQuery, useMutation, gql } from '@apollo/client';
import React, { useState } from 'react';
import SearchBar, { Location as SearchLocation } from '../components/SearchBar';

const GET_LOCATIONS = gql`
  query {
    allLocations {
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

const CREATE_LOCATION = gql`
  mutation CreateLocation($name: String!, $x: Float!, $y: Float!) {
    createLocation(name: $name, x: $x, y: $y) {
      location {
        id
        name
        x
        y
      }
    }
  }
`;

function MapPage({ mapName }: { mapName: string }) {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [highlighted, setHighlighted] = useState<SearchLocation | null>(null);
  const [editMode, setEditMode] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_LOCATIONS);
  const [createLocation] = useMutation(CREATE_LOCATION);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading map data</p>;

  const locations: SearchLocation[] = data.allLocations.map((loc: any) => ({
    id: loc.name,
    name: loc.name,
    x: loc.x,
    y: loc.y,
    description: loc.pois.map((p: any) => `${p.title}: ${p.description}`).join('\n'),
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
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round(e.clientX - rect.left);
          const y = Math.round(e.clientY - rect.top);
          setCoords({ x, y });
        }}
        onMouseLeave={() => setCoords(null)}
        onClick={async (e) => {
          if (!editMode) return;

          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round(e.clientX - rect.left);
          const y = Math.round(e.clientY - rect.top);
          const name = prompt('Enter a name for this location:');
          if (!name) return;

          try {
            await createLocation({ variables: { name, x, y } });
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
            top: `${loc.y}px`,
            left: `${loc.x}px`,
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
