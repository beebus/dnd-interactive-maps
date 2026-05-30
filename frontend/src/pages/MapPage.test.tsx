import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client/react';
import MapPage from './MapPage';

vi.mock('@apollo/client/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const mockLocations = [
  { name: 'Menzoberranzan', x: 195, y: 50, pois: [] },
  { name: 'Blingdenstone', x: 180, y: 62, pois: [{ title: 'Gem Market', description: 'A trading hub' }] },
];

function renderMapPage(slug = 'underdark') {
  return render(
    <MemoryRouter initialEntries={[`/maps/${slug}`]}>
      <Routes>
        <Route path="/maps/:slug" element={<MapPage />} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useQuery).mockReturnValue({
    data: { allLocations: mockLocations },
    loading: false,
    error: undefined,
    refetch: vi.fn(),
  } as any);
  vi.mocked(useMutation).mockReturnValue([vi.fn(), {} as any]);
  window.alert = vi.fn();
  window.prompt = vi.fn();
});

test('renders the map image for a valid slug', () => {
  renderMapPage();
  expect(screen.getByRole('img', { name: 'Underdark' })).toBeInTheDocument();
});

test('renders a pin for each location', () => {
  renderMapPage();
  expect(screen.getByTitle('Menzoberranzan')).toBeInTheDocument();
  expect(screen.getByTitle('Blingdenstone')).toBeInTheDocument();
});

test('shows loading state while data is loading', () => {
  vi.mocked(useQuery).mockReturnValue({
    data: undefined,
    loading: true,
    error: undefined,
    refetch: vi.fn(),
  } as any);
  renderMapPage();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
});

test('shows error state when the query fails', () => {
  vi.mocked(useQuery).mockReturnValue({
    data: undefined,
    loading: false,
    error: new Error('Network error'),
    refetch: vi.fn(),
  } as any);
  renderMapPage();
  expect(screen.getByText('Error loading map data')).toBeInTheDocument();
});

test('renders the NotFound page for an unknown slug', () => {
  renderMapPage('definitely-not-a-real-map');
  expect(screen.getByText('Map not found')).toBeInTheDocument();
});

test('hides all pins when Hide all Marks is clicked', () => {
  renderMapPage();
  expect(screen.getByTitle('Menzoberranzan')).toBeInTheDocument();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Hide all Marks'));
  expect(screen.queryByTitle('Menzoberranzan')).not.toBeInTheDocument();
  expect(screen.queryByTitle('Blingdenstone')).not.toBeInTheDocument();
});

test('pins are removed from the DOM when hidden so they cannot be clicked', () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Hide all Marks'));
  const pins = document.querySelectorAll('[title="Menzoberranzan"], [title="Blingdenstone"]');
  expect(pins).toHaveLength(0);
});

test('shows all pins again after toggling Show all Marks', () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Hide all Marks'));
  expect(screen.queryByTitle('Menzoberranzan')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Show all Marks'));
  expect(screen.getByTitle('Menzoberranzan')).toBeInTheDocument();
  expect(screen.getByTitle('Blingdenstone')).toBeInTheDocument();
});

test('menu label updates to Show all Marks after hiding', () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Hide all Marks'));
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Show all Marks')).toBeInTheDocument();
  expect(screen.queryByText('Hide all Marks')).not.toBeInTheDocument();
});
