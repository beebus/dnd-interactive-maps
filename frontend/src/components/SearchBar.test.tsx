import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import SearchBar, { Location } from './SearchBar';

const mockLocations: Location[] = [
  { id: '1', name: 'Menzoberranzan', x: 195, y: 50, description: 'A drow city' },
  { id: '2', name: 'Blingdenstone', x: 180, y: 62, description: 'A svirfneblin city' },
  { id: '3', name: 'Gracklstugh', x: 165, y: 99, description: 'A duergar city' },
];

function renderSearchBar(editMode = false) {
  const onSelectLocation = vi.fn();
  const setEditMode = vi.fn();
  render(
    <SearchBar
      locations={mockLocations}
      onSelectLocation={onSelectLocation}
      editMode={editMode}
      setEditMode={setEditMode}
    />
  );
  return { onSelectLocation, setEditMode };
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
