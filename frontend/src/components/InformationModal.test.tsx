import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import InformationModal from './InformationModal';

test('renders the modal title', () => {
  render(<InformationModal onClose={vi.fn()} />);
  expect(screen.getByText('Travel Information')).toBeInTheDocument();
});

test('renders each major section heading', () => {
  render(<InformationModal onClose={vi.fn()} />);
  expect(screen.getByText('Weather')).toBeInTheDocument();
  expect(screen.getByText('Travel Pace')).toBeInTheDocument();
  expect(screen.getByText('Travel Terrain')).toBeInTheDocument();
  expect(screen.getByText('Mounts and Other Animals')).toBeInTheDocument();
  expect(screen.getByText('Tack, Harness, and Drawn Vehicles')).toBeInTheDocument();
  expect(screen.getByText('Airborne and Waterborne Vehicles')).toBeInTheDocument();
});

test('calls onClose when the close button is clicked', () => {
  const onClose = vi.fn();
  render(<InformationModal onClose={onClose} />);
  fireEvent.click(screen.getByLabelText('Close'));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('calls onClose when the overlay is clicked', () => {
  const onClose = vi.fn();
  const { container } = render(<InformationModal onClose={onClose} />);
  fireEvent.click(container.querySelector('.modal-overlay')!);
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('does not call onClose when the card itself is clicked', () => {
  const onClose = vi.fn();
  const { container } = render(<InformationModal onClose={onClose} />);
  fireEvent.click(container.querySelector('.modal-card')!);
  expect(onClose).not.toHaveBeenCalled();
});

test('renders terrain table rows for each terrain type', () => {
  render(<InformationModal onClose={vi.fn()} />);
  expect(screen.getByText('Arctic')).toBeInTheDocument();
  expect(screen.getByText('Underdark')).toBeInTheDocument();
  expect(screen.getByText('Waterborne')).toBeInTheDocument();
});

test('renders the mounts table with cost and carrying capacity', () => {
  render(<InformationModal onClose={vi.fn()} />);
  expect(screen.getByText('Warhorse')).toBeInTheDocument();
  expect(screen.getByText('1,320 lb.')).toBeInTheDocument();
  expect(screen.getByText('400 GP')).toBeInTheDocument();
});
