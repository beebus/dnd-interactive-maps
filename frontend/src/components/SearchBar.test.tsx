import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SearchBar, { Location } from './SearchBar';
import { MapLocation } from '../data/maps';

const mockLocations: Location[] = [
  { id: '1', name: 'Menzoberranzan', x: 195, y: 50, description: 'A drow city' },
  { id: '2', name: 'Blingdenstone', x: 180, y: 62, description: 'A svirfneblin city' },
  { id: '3', name: 'Gracklstugh', x: 165, y: 99, description: 'A duergar city' },
];

const mockMapLocation: MapLocation = {
  slug: 'underdark',
  name: 'Underdark',
  description: 'A vast subterranean realm.',
  tags: ['Underground'],
  maps: [
    { filename: 'Underdark_1.jpg', label: 'Underdark', description: '', mapKey: 'underdark' },
  ],
};

function renderSearchBar(editMode = false, marksVisible = true, distanceMode = false) {
  const onSelectLocation = vi.fn();
  const setEditMode = vi.fn();
  const onSwitchVariant = vi.fn();
  const onGoHome = vi.fn();
  const onToggleMarks = vi.fn();
  const onToggleDistanceMode = vi.fn();
  render(
    <SearchBar
      locations={mockLocations}
      onSelectLocation={onSelectLocation}
      editMode={editMode}
      setEditMode={setEditMode}
      marksVisible={marksVisible}
      onToggleMarks={onToggleMarks}
      mapLocation={mockMapLocation}
      currentVariantIndex={0}
      onSwitchVariant={onSwitchVariant}
      onGoHome={onGoHome}
      distanceMode={distanceMode}
      onToggleDistanceMode={onToggleDistanceMode}
      distanceFeet={0}
      distanceWaypoints={0}
      isRealm={false}
      hasDistanceScale={true}
    />
  );
  return { onSelectLocation, setEditMode, onSwitchVariant, onGoHome, onToggleMarks, onToggleDistanceMode };
}

beforeEach(() => {
  vi.clearAllMocks();
});

test('renders the search input', () => {
  renderSearchBar();
  expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
});

test('shows no results when query is empty', () => {
  renderSearchBar();
  expect(screen.queryByText('Menzoberranzan')).not.toBeInTheDocument();
});

test('filters locations by name when typing', () => {
  renderSearchBar();
  // noinspection SpellCheckingInspection
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'menzo' } });
  expect(screen.getByText('Menzoberranzan')).toBeInTheDocument();
  expect(screen.queryByText('Blingdenstone')).not.toBeInTheDocument();
  expect(screen.queryByText('Gracklstugh')).not.toBeInTheDocument();
});

test('shows multiple results when query matches several locations', () => {
  renderSearchBar();
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'g' } });
  expect(screen.getByText('Blingdenstone')).toBeInTheDocument();
  expect(screen.getByText('Gracklstugh')).toBeInTheDocument();
  expect(screen.queryByText('Menzoberranzan')).not.toBeInTheDocument();
});

test('clears results when the close button is clicked', () => {
  renderSearchBar();
  const input = screen.getByPlaceholderText('Search');
  // noinspection SpellCheckingInspection
  fireEvent.change(input, { target: { value: 'menzo' } });
  expect(screen.getByText('Menzoberranzan')).toBeInTheDocument();
  fireEvent.click(screen.getByText('×'));
  expect(input).toHaveValue('');
  expect(screen.queryByText('Menzoberranzan')).not.toBeInTheDocument();
});

test('calls onSelectLocation with the correct location when a result is clicked', () => {
  const { onSelectLocation } = renderSearchBar();
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'bling' } });
  fireEvent.click(screen.getByText('Blingdenstone'));
  expect(onSelectLocation).toHaveBeenCalledTimes(1);
  expect(onSelectLocation).toHaveBeenCalledWith(mockLocations[1]);
});

test('toggles the menu open when the hamburger button is clicked', () => {
  renderSearchBar();
  expect(screen.queryByText('Enter Edit Mode')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Enter Edit Mode')).toBeInTheDocument();
});

test('closes the menu when the hamburger is clicked a second time', () => {
  renderSearchBar();
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Enter Edit Mode')).toBeInTheDocument();
  fireEvent.click(screen.getByText('☰'));
  expect(screen.queryByText('Enter Edit Mode')).not.toBeInTheDocument();
});

test('calls setEditMode(true) when Enter Edit Mode is clicked', () => {
  const { setEditMode } = renderSearchBar(false);
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));
  expect(setEditMode).toHaveBeenCalledWith(true);
});

test('shows Exit Edit Mode label when editMode is true', () => {
  renderSearchBar(true);
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Exit Edit Mode')).toBeInTheDocument();
});

test('calls setEditMode(false) when Exit Edit Mode is clicked', () => {
  const { setEditMode } = renderSearchBar(true);
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Exit Edit Mode'));
  expect(setEditMode).toHaveBeenCalledWith(false);
});

test('shows Hide all Marks label in menu when marksVisible is true', () => {
  renderSearchBar(false, true);
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Hide all Marks')).toBeInTheDocument();
  expect(screen.queryByText('Show all Marks')).not.toBeInTheDocument();
});

test('shows Show all Marks label in menu when marksVisible is false', () => {
  renderSearchBar(false, false);
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Show all Marks')).toBeInTheDocument();
  expect(screen.queryByText('Hide all Marks')).not.toBeInTheDocument();
});

test('calls onToggleMarks when the marks toggle item is clicked', () => {
  const { onToggleMarks } = renderSearchBar();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Hide all Marks'));
  expect(onToggleMarks).toHaveBeenCalledTimes(1);
});

test('closes the menu after clicking the marks toggle item', () => {
  renderSearchBar();
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Hide all Marks')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Hide all Marks'));
  expect(screen.queryByText('Hide all Marks')).not.toBeInTheDocument();
});

test('shows Distance and Time in menu when not in distance mode', () => {
  renderSearchBar();
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Distance and Time')).toBeInTheDocument();
});

test('shows Exit Distance Mode in menu when distance mode is active', () => {
  renderSearchBar(false, true, true);
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Exit Distance Mode')).toBeInTheDocument();
});

test('calls onToggleDistanceMode and closes menu when Distance and Time is clicked', () => {
  const { onToggleDistanceMode } = renderSearchBar();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Distance and Time'));
  expect(onToggleDistanceMode).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('Distance and Time')).not.toBeInTheDocument();
});

test('shows starting point instruction when distance mode is active with no waypoints', () => {
  renderSearchBar(false, true, true);
  expect(screen.getByText('Click on the map to determine the starting point.')).toBeInTheDocument();
});
