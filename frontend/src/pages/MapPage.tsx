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
  const [marksVisible, setMarksVisible] = useState(true);
  const [imageScale, setImageScale] = useState(1);
  const [naturalWidth, setNaturalWidth] = useState(1200);
  const [distanceMode, setDistanceMode] = useState(false);
  const [distancePath, setDistancePath] = useState<{ x: number; y: number }[]>([]);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const imgRef = React.useRef<HTMLImageElement>(null);

  const currentVariant = mapLocation.maps[variantIndex];

  const { data, loading, error, refetch } = useQuery(GET_LOCATIONS, {
    variables: { mapName: currentVariant.mapKey },
  });

  const [createLocation] = useMutation(CREATE_LOCATION);

  const updateImageScale = () => {
    if (imgRef.current) {
      const rect = imgRef.current.getBoundingClientRect();
      setImageScale(rect.width / 1200);
      if (imgRef.current.naturalWidth) {
        setNaturalWidth(imgRef.current.naturalWidth);
      }
    }
  };

  React.useEffect(() => {
    updateImageScale();
    window.addEventListener('resize', updateImageScale);
    return () => window.removeEventListener('resize', updateImageScale);
  }, []);

  React.useEffect(() => {
    setHighlighted(null);
    setDistancePath([]);
    setDistanceMode(false);
    setMousePos(null);
  }, [variantIndex]);

  React.useEffect(() => {
    if (!distanceMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDistanceMode(false);
        setDistancePath([]);
        setMousePos(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [distanceMode]);

  const handleToggleDistanceMode = () => {
    setDistanceMode(v => !v);
    setDistancePath([]);
    setMousePos(null);
  };

  const committedFeet = React.useMemo(() => {
    if (distancePath.length < 2 || !currentVariant.feetPerPixel) return 0;
    let total = 0;
    for (let i = 1; i < distancePath.length; i++) {
      const dx = distancePath[i].x - distancePath[i - 1].x;
      const dy = distancePath[i].y - distancePath[i - 1].y;
      total += Math.sqrt(dx * dx + dy * dy) * (naturalWidth / 1200) * currentVariant.feetPerPixel;
    }
    return total;
  }, [distancePath, currentVariant.feetPerPixel, naturalWidth]);

  const displayFeet = React.useMemo(() => {
    if (!mousePos || distancePath.length < 1 || !currentVariant.feetPerPixel) return committedFeet;
    const last = distancePath[distancePath.length - 1];
    const dx = mousePos.x - last.x;
    const dy = mousePos.y - last.y;
    const liveDist = Math.sqrt(dx * dx + dy * dy) * (naturalWidth / 1200) * currentVariant.feetPerPixel;
    return committedFeet + liveDist;
  }, [committedFeet, mousePos, distancePath, currentVariant.feetPerPixel, naturalWidth]);

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
        marksVisible={marksVisible}
        onToggleMarks={() => setMarksVisible(v => !v)}
        mapLocation={mapLocation}
        currentVariantIndex={variantIndex}
        onSwitchVariant={setVariantIndex}
        onGoHome={() => navigate('/')}
        distanceMode={distanceMode}
        onToggleDistanceMode={handleToggleDistanceMode}
        distanceFeet={displayFeet}
        distanceWaypoints={distancePath.length}
        isRealm={!!currentVariant.isRealm}
        hasDistanceScale={currentVariant.feetPerPixel !== undefined}
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
          cursor: distanceMode ? 'crosshair' : 'default',
        }}
        onLoad={updateImageScale}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) / imageScale);
          const y = Math.round((e.clientY - rect.top) / imageScale);
          setCoords({ x, y });
          if (distanceMode) setMousePos({ x, y });
        }}
        onMouseLeave={() => {
          setCoords(null);
          if (distanceMode) setMousePos(null);
        }}
        onClick={async (e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) / imageScale);
          const y = Math.round((e.clientY - rect.top) / imageScale);

          if (distanceMode) {
            setDistancePath(prev => [...prev, { x, y }]);
            return;
          }

          if (!editMode) return;

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

      {distanceMode && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {distancePath.map((pt, i) => {
            if (i === 0) return null;
            const prev = distancePath[i - 1];
            return (
              <line
                key={i}
                x1={prev.x * imageScale} y1={prev.y * imageScale}
                x2={pt.x * imageScale} y2={pt.y * imageScale}
                stroke="#2563eb" strokeWidth="3" strokeLinecap="round"
              />
            );
          })}

          {distancePath.length > 0 && mousePos && (
            <line
              x1={distancePath[distancePath.length - 1].x * imageScale}
              y1={distancePath[distancePath.length - 1].y * imageScale}
              x2={mousePos.x * imageScale}
              y2={mousePos.y * imageScale}
              stroke="#2563eb" strokeWidth="2" strokeDasharray="8,4" opacity="0.7"
            />
          )}

          {distancePath.map((pt, i) => (
            <circle
              key={i}
              cx={pt.x * imageScale} cy={pt.y * imageScale}
              r="5" fill="#2563eb" stroke="white" strokeWidth="1.5"
            />
          ))}
        </svg>
      )}

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

      {marksVisible && (highlighted ? [highlighted] : locations).map((loc) => (
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
