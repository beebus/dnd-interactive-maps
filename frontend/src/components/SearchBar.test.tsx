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

function renderSearchBar(editMode = false, marksVisible = true, distanceMode = false, isProduction = false) {
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
      isProduction={isProduction}
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

test('hides Edit Mode option in menu when isProduction is true', () => {
  renderSearchBar(false, true, false, true);
  fireEvent.click(screen.getByText('☰'));
  expect(screen.queryByText('Enter Edit Mode')).not.toBeInTheDocument();
  expect(screen.queryByText('Exit Edit Mode')).not.toBeInTheDocument();
});

test('shows Edit Mode option in menu when isProduction is false', () => {
  renderSearchBar(false, true, false, false);
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Enter Edit Mode')).toBeInTheDocument();
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

const mockMapLocationMultiVariant: MapLocation = {
  slug: 'elturel',
  name: 'Elturel',
  description: 'A holy city.',
  tags: ['City'],
  maps: [
    { filename: 'Elturel_1.png', label: 'Elturel (Classic)', description: '', mapKey: 'elturel' },
    { filename: 'Elturel_2.jpg', label: 'Elturel in Avernus', description: '', mapKey: 'elturel_avernus' },
  ],
};

function renderSearchBarFull(overrides: Partial<React.ComponentProps<typeof SearchBar>> = {}) {
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
      editMode={false}
      setEditMode={setEditMode}
      marksVisible={true}
      onToggleMarks={onToggleMarks}
      mapLocation={mockMapLocation}
      currentVariantIndex={0}
      onSwitchVariant={onSwitchVariant}
      onGoHome={onGoHome}
      distanceMode={false}
      onToggleDistanceMode={onToggleDistanceMode}
      distanceFeet={0}
      distanceWaypoints={0}
      isRealm={false}
      hasDistanceScale={true}
      isProduction={false}
      {...overrides}
    />
  );
  return { onSelectLocation, setEditMode, onSwitchVariant, onGoHome, onToggleMarks, onToggleDistanceMode };
}

test('shows destination instruction when one waypoint has been placed', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1 });
  expect(screen.getByText('Click on the map to determine the destination.')).toBeInTheDocument();
});

test('shows the keep-drawing instruction once two or more waypoints exist', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 2 });
  expect(screen.getByText(/Keep drawing your path/)).toBeInTheDocument();
  expect(screen.getByText('ESC')).toBeInTheDocument();
});

test('shows the formatted distance and travel times once a distance has been measured', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640 });
  expect(screen.getByText('DISTANCE')).toBeInTheDocument();
  expect(screen.getByText('2,640 ft')).toBeInTheDocument();
  expect(screen.getByText('10 min')).toBeInTheDocument();
});

test('formats large distances in miles and days', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640000 });
  expect(screen.getByText('500 mi')).toBeInTheDocument();
  expect(screen.getByText('6 days 22 hr')).toBeInTheDocument();
});

test('shows a no-scale message instead of distances when the map has no scale', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640, hasDistanceScale: false });
  expect(screen.getByText('No scale configured for this map.')).toBeInTheDocument();
  expect(screen.queryByText('DISTANCE')).not.toBeInTheDocument();
});

test('hides city-only travel modes when isRealm is true', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640, isRealm: true });
  expect(screen.queryByText(/Rowboat/)).not.toBeInTheDocument();
  expect(screen.queryByText(/Keelboat/)).not.toBeInTheDocument();
  expect(screen.getByText(/On foot \(normal\)/)).toBeInTheDocument();
});

test('shows city-only travel modes when isRealm is false', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640 });
  expect(screen.getByText(/Rowboat/)).toBeInTheDocument();
  expect(screen.getByText(/Keelboat/)).toBeInTheDocument();
});

test('collapses the distance panel content when the collapse button is clicked', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640 });
  expect(screen.getByText('DISTANCE')).toBeInTheDocument();
  fireEvent.click(screen.getByTitle('Collapse'));
  expect(screen.queryByText('DISTANCE')).not.toBeInTheDocument();
});

test('expands the distance panel content again when clicked a second time', () => {
  renderSearchBarFull({ distanceMode: true, distanceWaypoints: 1, distanceFeet: 2640 });
  fireEvent.click(screen.getByTitle('Collapse'));
  fireEvent.click(screen.getByTitle('Expand'));
  expect(screen.getByText('DISTANCE')).toBeInTheDocument();
});

test('does not show a Map Variants section when the map has only one variant', () => {
  renderSearchBarFull();
  fireEvent.click(screen.getByText('☰'));
  expect(screen.queryByText('Map Variants')).not.toBeInTheDocument();
});

test('shows a Map Variants section listing each variant when there are multiple', () => {
  renderSearchBarFull({ mapLocation: mockMapLocationMultiVariant, currentVariantIndex: 0 });
  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Map Variants')).toBeInTheDocument();
  expect(screen.getByText('Elturel (Classic)')).toBeInTheDocument();
  expect(screen.getByText('Elturel in Avernus')).toBeInTheDocument();
});

test('calls onSwitchVariant with the clicked variant index and closes the menu', () => {
  const { onSwitchVariant } = renderSearchBarFull({ mapLocation: mockMapLocationMultiVariant, currentVariantIndex: 0 });
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Elturel in Avernus'));
  expect(onSwitchVariant).toHaveBeenCalledWith(1);
  expect(screen.queryByText('Map Variants')).not.toBeInTheDocument();
});

test('calls onGoHome and closes the menu when All Maps is clicked', () => {
  const { onGoHome } = renderSearchBarFull();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('← All Maps'));
  expect(onGoHome).toHaveBeenCalledTimes(1);
  expect(screen.queryByText('← All Maps')).not.toBeInTheDocument();
});

test('opens the Contact modal when Send a Comment is clicked', () => {
  renderSearchBarFull();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Send a Comment'));
  expect(screen.getByText('Have a comment, suggestion, error, or typo to report? Send it our way!')).toBeInTheDocument();
});

test('closes the Contact modal when its close button is clicked', () => {
  renderSearchBarFull();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Send a Comment'));
  fireEvent.click(screen.getByLabelText('Close'));
  expect(screen.queryByText('Have a comment, suggestion, error, or typo to report? Send it our way!')).not.toBeInTheDocument();
});

test('opens the Information modal when Information is clicked', () => {
  renderSearchBarFull();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Information'));
  expect(screen.getByText('Travel Information')).toBeInTheDocument();
});

test('closes the Information modal when its close button is clicked', () => {
  renderSearchBarFull();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Information'));
  fireEvent.click(screen.getByLabelText('Close'));
  expect(screen.queryByText('Travel Information')).not.toBeInTheDocument();
});
