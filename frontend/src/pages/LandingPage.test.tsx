import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import { MAP_LOCATIONS } from '../data/maps';

function renderLandingPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

test('renders the page heading', () => {
  renderLandingPage();
  expect(screen.getByRole('heading', { name: /D&D Interactive Maps/i })).toBeInTheDocument();
});

test('renders a card for each map location', () => {
  renderLandingPage();
  MAP_LOCATIONS.forEach(loc => {
    expect(screen.getByRole('heading', { name: loc.name })).toBeInTheDocument();
  });
});

test('each card links to the correct map page URL', () => {
  renderLandingPage();
  MAP_LOCATIONS.forEach(loc => {
    const links = screen.getAllByRole('link').filter(
      link => link.getAttribute('href') === `/maps/${loc.slug}`
    );
    expect(links).toHaveLength(1);
  });
});

test('shows a variant badge with the map count for multi-variant locations', () => {
  renderLandingPage();
  const multiVariant = MAP_LOCATIONS.filter(loc => loc.maps.length > 1);
  multiVariant.forEach(loc => {
    const card = screen.getByRole('link', { name: new RegExp(loc.name, 'i') });
    const badge = card.querySelector('.variant-badge');
    expect(badge).toHaveTextContent(`${loc.maps.length} maps`);
  });
});

test('does not show a variant badge for single-variant locations', () => {
  renderLandingPage();
  const singleVariant = MAP_LOCATIONS.filter(loc => loc.maps.length === 1);
  singleVariant.forEach(loc => {
    const card = screen.getByRole('link', { name: new RegExp(loc.name, 'i') });
    expect(card.querySelector('.variant-badge')).toBeNull();
  });
});

test('renders an Explore CTA for each card', () => {
  renderLandingPage();
  expect(screen.getAllByText('Explore')).toHaveLength(MAP_LOCATIONS.length);
});
