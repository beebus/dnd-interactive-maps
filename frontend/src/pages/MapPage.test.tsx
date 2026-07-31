import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router';
import { useQuery, useMutation } from '@apollo/client/react';
import MapPage from './MapPage';

vi.mock('@apollo/client/react', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const mockLocations = [
  { id: '1', name: 'Menzoberranzan', x: 195, y: 50, pois: [] },
  { id: '2', name: 'Blingdenstone', x: 180, y: 62, pois: [{ title: 'Gem Market', description: 'A trading hub' }] },
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

let refetchMock: ReturnType<typeof vi.fn>;
let createLocationMock: ReturnType<typeof vi.fn>;
let updateLocationMock: ReturnType<typeof vi.fn>;
let deleteLocationMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  refetchMock = vi.fn();
  createLocationMock = vi.fn().mockResolvedValue({});
  updateLocationMock = vi.fn().mockResolvedValue({});
  deleteLocationMock = vi.fn().mockResolvedValue({});
  vi.mocked(useQuery).mockReturnValue({
    data: { allLocations: mockLocations },
    loading: false,
    error: undefined,
    refetch: refetchMock,
  } as any);
  // MapPageInner calls useMutation 3 times per render, always in the same order
  // (create, update, delete) — cycle through the three mocks by call index so
  // this stays correct across re-renders, not just the first one.
  const mutationMocks = [createLocationMock, updateLocationMock, deleteLocationMock];
  let mutationCallIndex = 0;
  vi.mocked(useMutation).mockImplementation(() => {
    const mock = mutationMocks[mutationCallIndex % mutationMocks.length];
    mutationCallIndex++;
    return [mock, {} as any];
  });
  window.alert = vi.fn();
  window.prompt = vi.fn();
  window.confirm = vi.fn();

  Object.defineProperty(HTMLImageElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: 1200, height: 800, top: 0, left: 0, right: 1200, bottom: 800, x: 0, y: 0, toJSON: () => {},
    }),
  });
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

test('shows an alert with the location name and description when a pin is clicked', () => {
  renderMapPage();
  fireEvent.click(screen.getByTitle('Blingdenstone'));
  expect(window.alert).toHaveBeenCalledWith('Blingdenstone\nGem Market: A trading hub');
});

test('narrows the visible pins to the selected search result', () => {
  renderMapPage();
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'bling' } });
  fireEvent.click(screen.getByText('Blingdenstone'));
  expect(screen.getByTitle('Blingdenstone')).toBeInTheDocument();
  expect(screen.queryByTitle('Menzoberranzan')).not.toBeInTheDocument();
});

test('shows the cursor coordinates while hovering over the map and clears them on mouse leave', () => {
  renderMapPage();
  const img = screen.getByRole('img', { name: 'Underdark' });
  fireEvent.mouseMove(img, { clientX: 33, clientY: 44 });
  expect(screen.getByText('x: 33, y: 44')).toBeInTheDocument();
  fireEvent.mouseLeave(img);
  expect(screen.queryByText(/x: 33/)).not.toBeInTheDocument();
});

test('prompts for a name and creates a location when clicking the map in edit mode', async () => {
  window.prompt = vi.fn().mockReturnValue('New City');
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));
  fireEvent.click(screen.getByRole('img', { name: 'Underdark' }), { clientX: 50, clientY: 60 });

  await waitFor(() => {
    expect(createLocationMock).toHaveBeenCalledWith({
      variables: { name: 'New City', x: 50, y: 60, mapName: 'underdark' },
    });
  });
  expect(refetchMock).toHaveBeenCalledTimes(1);
});

test('does not create a location when the name prompt is cancelled', () => {
  window.prompt = vi.fn().mockReturnValue(null);
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));
  fireEvent.click(screen.getByRole('img', { name: 'Underdark' }), { clientX: 50, clientY: 60 });
  expect(createLocationMock).not.toHaveBeenCalled();
});

test('does not prompt for a location when not in edit mode', () => {
  renderMapPage();
  fireEvent.click(screen.getByRole('img', { name: 'Underdark' }), { clientX: 50, clientY: 60 });
  expect(window.prompt).not.toHaveBeenCalled();
  expect(createLocationMock).not.toHaveBeenCalled();
});

test('alerts when creating a location fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  window.prompt = vi.fn().mockReturnValue('New City');
  createLocationMock.mockRejectedValueOnce(new Error('boom'));
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));
  fireEvent.click(screen.getByRole('img', { name: 'Underdark' }), { clientX: 50, clientY: 60 });

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Failed to create location.');
  });
  expect(refetchMock).not.toHaveBeenCalled();
});

test('adds a waypoint instead of creating a location when clicking the map in distance mode', () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Distance and Time'));
  fireEvent.click(screen.getByRole('img', { name: 'Underdark' }), { clientX: 10, clientY: 20 });

  expect(window.prompt).not.toHaveBeenCalled();
  expect(createLocationMock).not.toHaveBeenCalled();
  expect(screen.getByText('Click on the map to determine the destination.')).toBeInTheDocument();
});

test('exits distance mode when Escape is pressed', () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Distance and Time'));
  expect(screen.getByText('Click on the map to determine the starting point.')).toBeInTheDocument();

  fireEvent.keyDown(window, { key: 'Escape' });

  fireEvent.click(screen.getByText('☰'));
  expect(screen.getByText('Distance and Time')).toBeInTheDocument();
  expect(screen.queryByText('Exit Distance Mode')).not.toBeInTheDocument();
});

test('resets the highlighted pin and distance mode when switching map variants', () => {
  renderMapPage('elturel');
  fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'bling' } });
  fireEvent.click(screen.getByText('Blingdenstone'));
  expect(screen.queryByTitle('Menzoberranzan')).not.toBeInTheDocument();

  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Elturel in Avernus'));

  expect(screen.getByTitle('Menzoberranzan')).toBeInTheDocument();
  expect(screen.getByTitle('Blingdenstone')).toBeInTheDocument();
});

test('navigates home when Return to Maps is clicked on the NotFound page', () => {
  renderMapPage('not-a-real-map');
  fireEvent.click(screen.getByText('Return to Maps'));
  expect(screen.getByText('Home')).toBeInTheDocument();
});

test('navigates home when All Maps is clicked from the map view', () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('← All Maps'));
  expect(screen.getByText('Home')).toBeInTheDocument();
});

test('measures committed and live distance using the image natural width and the map scale', () => {
  Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
    configurable: true,
    value: 2400,
  });
  renderMapPage();
  const img = screen.getByRole('img', { name: 'Underdark' });

  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Distance and Time'));

  fireEvent.click(img, { clientX: 0, clientY: 0 });
  fireEvent.click(img, { clientX: 3, clientY: 4 });
  fireEvent.mouseMove(img, { clientX: 6, clientY: 8 });

  expect(screen.getByText('DISTANCE')).toBeInTheDocument();
  expect(screen.getByText('54.0 mi')).toBeInTheDocument();
});

function enterEditModeAndClickPin(title = 'Blingdenstone') {
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));
  const pin = screen.getByTitle(title);
  fireEvent.mouseDown(pin, { clientX: 100, clientY: 100 });
  fireEvent.mouseUp(document, { clientX: 100, clientY: 100 });
}

test('opens the edit modal instead of an alert when a pin is clicked in edit mode', () => {
  renderMapPage();
  enterEditModeAndClickPin();
  expect(window.alert).not.toHaveBeenCalled();
  expect(screen.getByText('Edit Location')).toBeInTheDocument();
  expect(screen.getByLabelText('Name')).toHaveValue('Blingdenstone');
});

test('still shows the read-only alert when a pin is clicked outside edit mode', () => {
  renderMapPage();
  fireEvent.click(screen.getByTitle('Blingdenstone'));
  expect(window.alert).toHaveBeenCalledWith('Blingdenstone\nGem Market: A trading hub');
  expect(screen.queryByText('Edit Location')).not.toBeInTheDocument();
});

test('renames a location via the edit modal', async () => {
  renderMapPage();
  enterEditModeAndClickPin();

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Name' } });
  fireEvent.click(screen.getByText('Save'));

  await waitFor(() => {
    expect(updateLocationMock).toHaveBeenCalledWith({ variables: { id: '2', name: 'New Name' } });
  });
  expect(refetchMock).toHaveBeenCalled();
  expect(screen.queryByText('Edit Location')).not.toBeInTheDocument();
});

test('deletes a location via the edit modal when the confirm dialog is accepted', async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  renderMapPage();
  enterEditModeAndClickPin();

  fireEvent.click(screen.getByText('Delete'));

  expect(window.confirm).toHaveBeenCalledWith(
    'Delete "Blingdenstone"? This will also remove 1 linked point(s) of interest.'
  );
  await waitFor(() => {
    expect(deleteLocationMock).toHaveBeenCalledWith({ variables: { id: '2' } });
  });
  expect(refetchMock).toHaveBeenCalled();
});

test('does not delete a location when the confirm dialog is cancelled', () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  renderMapPage();
  enterEditModeAndClickPin();

  fireEvent.click(screen.getByText('Delete'));

  expect(deleteLocationMock).not.toHaveBeenCalled();
});

test('repositions a location by dragging its pin in edit mode', async () => {
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));

  const pin = screen.getByTitle('Blingdenstone');
  fireEvent.mouseDown(pin, { clientX: 100, clientY: 100 });
  fireEvent.mouseMove(document, { clientX: 150, clientY: 140 });
  fireEvent.mouseUp(document, { clientX: 150, clientY: 140 });

  await waitFor(() => {
    expect(updateLocationMock).toHaveBeenCalledWith({ variables: { id: '2', x: 150, y: 140 } });
  });
  expect(refetchMock).toHaveBeenCalled();
  expect(screen.queryByText('Edit Location')).not.toBeInTheDocument();
});

test('alerts when repositioning a location fails', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  updateLocationMock.mockRejectedValueOnce(new Error('boom'));
  renderMapPage();
  fireEvent.click(screen.getByText('☰'));
  fireEvent.click(screen.getByText('Enter Edit Mode'));

  const pin = screen.getByTitle('Blingdenstone');
  fireEvent.mouseDown(pin, { clientX: 100, clientY: 100 });
  fireEvent.mouseMove(document, { clientX: 150, clientY: 140 });
  fireEvent.mouseUp(document, { clientX: 150, clientY: 140 });

  await waitFor(() => {
    expect(window.alert).toHaveBeenCalledWith('Failed to reposition location.');
  });
  expect(refetchMock).not.toHaveBeenCalled();
});
