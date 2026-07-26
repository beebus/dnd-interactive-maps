import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import PinEditModal, { PinEditModalLocation } from './PinEditModal';

const baseLocation: PinEditModalLocation = {
  id: '2',
  name: 'Blingdenstone',
  x: 180,
  y: 62,
  pois: [{ title: 'Gem Market', description: 'A trading hub' }],
};

beforeEach(() => {
  vi.restoreAllMocks();
  window.confirm = vi.fn();
});

test('renders the name field pre-filled with the current name', () => {
  render(<PinEditModal location={baseLocation} onClose={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.getByLabelText('Name')).toHaveValue('Blingdenstone');
});

test('Save button is disabled when the name is cleared', () => {
  render(<PinEditModal location={baseLocation} onClose={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  ' } });
  expect(screen.getByText('Save')).toBeDisabled();
});

test('calls onRename with the trimmed name and closes on success', async () => {
  const onRename = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<PinEditModal location={baseLocation} onClose={onClose} onRename={onRename} onDelete={vi.fn()} />);

  fireEvent.change(screen.getByLabelText('Name'), { target: { value: '  New Name  ' } });
  fireEvent.click(screen.getByText('Save'));

  await waitFor(() => {
    expect(onRename).toHaveBeenCalledWith('2', 'New Name');
  });
  expect(onClose).toHaveBeenCalled();
});

test('shows an error and does not close when onRename fails', async () => {
  const onRename = vi.fn().mockRejectedValue(new Error('boom'));
  const onClose = vi.fn();
  render(<PinEditModal location={baseLocation} onClose={onClose} onRename={onRename} onDelete={vi.fn()} />);

  fireEvent.click(screen.getByText('Save'));

  await waitFor(() => {
    expect(screen.getByText('Failed to rename location.')).toBeInTheDocument();
  });
  expect(onClose).not.toHaveBeenCalled();
});

test('confirm message mentions the linked point-of-interest count', () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  render(<PinEditModal location={baseLocation} onClose={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />);
  fireEvent.click(screen.getByText('Delete'));
  expect(window.confirm).toHaveBeenCalledWith(
    'Delete "Blingdenstone"? This will also remove 1 linked point(s) of interest.'
  );
});

test('confirm message omits the point-of-interest sentence when there are none', () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  render(
    <PinEditModal
      location={{ ...baseLocation, pois: [] }}
      onClose={vi.fn()}
      onRename={vi.fn()}
      onDelete={vi.fn()}
    />
  );
  fireEvent.click(screen.getByText('Delete'));
  expect(window.confirm).toHaveBeenCalledWith('Delete "Blingdenstone"?');
});

test('does not call onDelete when the confirm dialog is cancelled', () => {
  vi.mocked(window.confirm).mockReturnValue(false);
  const onDelete = vi.fn();
  render(<PinEditModal location={baseLocation} onClose={vi.fn()} onRename={vi.fn()} onDelete={onDelete} />);
  fireEvent.click(screen.getByText('Delete'));
  expect(onDelete).not.toHaveBeenCalled();
});

test('calls onDelete and closes when confirmed', async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  const onDelete = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<PinEditModal location={baseLocation} onClose={onClose} onRename={vi.fn()} onDelete={onDelete} />);

  fireEvent.click(screen.getByText('Delete'));

  await waitFor(() => {
    expect(onDelete).toHaveBeenCalledWith('2');
  });
  expect(onClose).toHaveBeenCalled();
});

test('shows an error and does not close when onDelete fails', async () => {
  vi.mocked(window.confirm).mockReturnValue(true);
  const onDelete = vi.fn().mockRejectedValue(new Error('boom'));
  const onClose = vi.fn();
  render(<PinEditModal location={baseLocation} onClose={onClose} onRename={vi.fn()} onDelete={onDelete} />);

  fireEvent.click(screen.getByText('Delete'));

  await waitFor(() => {
    expect(screen.getByText('Failed to delete location.')).toBeInTheDocument();
  });
  expect(onClose).not.toHaveBeenCalled();
});

test('calls onClose when the close button is clicked', () => {
  const onClose = vi.fn();
  render(<PinEditModal location={baseLocation} onClose={onClose} onRename={vi.fn()} onDelete={vi.fn()} />);
  fireEvent.click(screen.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalled();
});
