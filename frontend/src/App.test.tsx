import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders welcome heading', () => {
  render(<App />);
  const heading = screen.getByText(/Welcome to the D&D Interactive Maps/i);
  expect(heading).toBeInTheDocument();
});
